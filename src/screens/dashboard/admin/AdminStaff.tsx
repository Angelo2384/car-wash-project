import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Copy, Eye, EyeOff, Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import {
  addApprovedStaff,
  createCrew,
  CREW_MAX_SIZE,
  CREW_MIN_SIZE,
  defaultStaffSettings,
  LUNCH_HOURS,
  nextEmployeeId,
  removeApprovedStaff,
  renameApprovedStaff,
  saveAccessCode,
  saveStaffSettings,
  setStaffUnavailable,
  subscribeToAccessCode,
  subscribeToPreRegisteredStaff,
  unpairCrew,
  updateCrew,
  WORK_TYPE_LABELS,
  type Crew,
  type PreRegisteredStaff,
  type StaffSettings,
  type WorkType,
} from "../../../lib/staffOps";
import { formatHour, toIsoDate } from "../../../lib/business";
import { useCrews, useDaySchedule, useStaffDirectory, useStaffSettings, useUnits } from "../../../hooks/useOperations";
import { Badge, Card, EmptyState, Field, Modal, SectionHeading, Tabs } from "../../../components/admin/AdminUI";
import {
  dangerButton,
  inputClass,
  primaryButton,
  secondaryButton,
  smallButton,
} from "../../../components/admin/adminStyles";
import UserAvatar from "../../../components/ui/UserAvatar";

type Tab = "staff" | "crews" | "access";

function lunchLabel(hour: number) {
  return `${formatHour(hour)}–${formatHour(hour + 1)}`;
}

export default function AdminStaff() {
  const [tab, setTab] = useState<Tab>("staff");
  const { staff, loading } = useStaffDirectory();
  const settings = useStaffSettings();
  const crews = useCrews();
  const active = staff.filter((s) => s.isActivated && s.uid);

  return (
    <div className="flex flex-col gap-6 pb-10 text-[#F5F5F5]">
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "staff", label: "Staff", count: staff.length },
          { id: "crews", label: "Crews", count: crews.length },
          { id: "access", label: "Sign-up access" },
        ]}
      />
      {tab === "staff" && <StaffTab staff={staff} loading={loading} settings={settings} crews={crews} />}
      {tab === "crews" && <CrewsTab active={active} settings={settings} crews={crews} />}
      {tab === "access" && <AccessTab staff={staff} />}
    </div>
  );
}

// ─── Staff tab ───────────────────────────────────────────────────────────────

function StaffTab({
  staff,
  loading,
  settings,
  crews,
}: {
  staff: ReturnType<typeof useStaffDirectory>["staff"];
  loading: boolean;
  settings: Record<string, StaffSettings>;
  crews: Crew[];
}) {
  const { showToast } = useToast();
  const [date, setDate] = useState(() => toIsoDate(new Date()));
  const day = useDaySchedule(date);
  const units = useUnits(date, staff);
  const hasBay = units.some((u) => u.workType === "bay");
  const nameOf = (uid: string) => staff.find((s) => s.uid === uid)?.name || "Staff";

  const crewOf = (uid: string) => crews.find((c) => c.memberUids.includes(uid));
  const update = (uid: string, partial: Partial<StaffSettings>) =>
    saveStaffSettings(uid, partial).catch((e) => showToast(e.message || "Couldn't save the change.", "error"));

  const toggleAvailable = async (uid: string, makeUnavailable: boolean) => {
    const s = settings[uid] ?? defaultStaffSettings(uid);
    const crew = crewOf(uid);
    const type = crew?.workType ?? s.workType;
    const bayUnits = units.filter((u) => u.workType === "bay");
    if (makeUnavailable && type === "bay" && bayUnits.length === 1 && bayUnits[0].memberUids.length === 1 && bayUnits[0].memberUids[0] === uid) {
      showToast(`${nameOf(uid)} is the only bay worker on this day. Drive-in bookings close until you assign someone else.`, "error");
    }
    try {
      await setStaffUnavailable(date, uid, makeUnavailable);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't update availability.", "error");
    }
  };

  if (loading) return <Card className="p-8 text-sm text-[#A1A1AA]">Loading staff…</Card>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <SectionHeading title="Your team" subtitle="Work type, lunch and availability for each staff member" />
        <label className="flex items-center gap-3 shrink-0 whitespace-nowrap text-sm font-medium text-[#D4D4D4]">
          Availability for
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={`${inputClass} w-auto`} />
        </label>
      </div>

      {!hasBay && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
          <p>
            <strong className="text-[#F5F5F5]">No one is on the bay on this day.</strong> Drive-in bookings are closed until you
            set a working staff member or crew to Bay.
          </p>
        </div>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[880px]">
          <thead>
            <tr className="text-left text-[#71717A] text-xs">
              <th className="px-5 py-3 font-medium">Staff member</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Crew</th>
              <th className="px-3 py-3 font-medium">Works</th>
              <th className="px-3 py-3 font-medium">Usual lunch</th>
              <th className="px-3 py-3 font-medium">Available</th>
              <th className="px-5 py-3 font-medium text-right">Account</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState title="No staff yet" body="Add approved staff emails in Sign-up access, then they can activate their accounts." />
                </td>
              </tr>
            )}
            {staff.map((member) => {
              if (!member.isActivated || !member.uid) {
                return (
                  <tr key={member.preRegDocId} className="border-t border-[#2C2C2C]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <UserAvatar />
                        <div className="min-w-0">
                          <p className="font-semibold text-[#F5F5F5] truncate">{member.name}</p>
                          <p className="text-xs text-[#71717A] truncate">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5"><Badge tone="amber">Waiting for sign-up</Badge></td>
                    <td className="px-3 py-3.5 text-[#71717A]" colSpan={5}>
                      Employee ID {member.employeeId}. They appear here once they activate their account.
                    </td>
                  </tr>
                );
              }

              const s = settings[member.uid] ?? defaultStaffSettings(member.uid);
              const crew = crewOf(member.uid);
              const unavailable = day.unavailableUids.includes(member.uid);
              const deactivated = s.active === false;
              return (
                <tr key={member.uid} className={`border-t border-[#2C2C2C] ${deactivated ? "opacity-60" : ""}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <UserAvatar />
                      <div className="min-w-0">
                        <p className="font-semibold text-[#F5F5F5] truncate">{member.name}</p>
                        <p className="text-xs text-[#71717A] truncate">{member.email} · {member.employeeId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    {deactivated ? <Badge tone="red">Deactivated</Badge> : <Badge tone="green">Active</Badge>}
                  </td>
                  <td className="px-3 py-3.5 text-[#D4D4D4]">
                    {crew ? crew.memberUids.map((u) => nameOf(u).split(" ")[0]).join(" + ") : <span className="text-[#71717A]">Solo</span>}
                  </td>
                  <td className="px-3 py-3.5">
                    {crew ? (
                      <span className="text-[#A1A1AA]" title="Set on the crew">{WORK_TYPE_LABELS[crew.workType]} (crew)</span>
                    ) : (
                      <select
                        value={s.workType}
                        disabled={deactivated}
                        onChange={(e) => update(member.uid, { workType: e.target.value as WorkType })}
                        className={`${inputClass} py-1.5 w-auto text-sm`}
                        aria-label={`${member.name} works`}
                      >
                        <option value="mobile">Mobile</option>
                        <option value="bay">Bay</option>
                      </select>
                    )}
                  </td>
                  <td className="px-3 py-3.5">
                    {crew ? (
                      <span className="text-[#A1A1AA]">{lunchLabel(crew.lunchHour)} (crew)</span>
                    ) : (
                      <select
                        value={s.usualLunch}
                        disabled={deactivated}
                        onChange={(e) => update(member.uid, { usualLunch: Number(e.target.value) })}
                        className={`${inputClass} py-1.5 w-auto text-sm`}
                        aria-label={`${member.name} usual lunch`}
                      >
                        {LUNCH_HOURS.map((h) => (
                          <option key={h} value={h}>{lunchLabel(h)}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-3 py-3.5">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!unavailable && !deactivated}
                        disabled={deactivated}
                        onChange={(e) => toggleAvailable(member.uid, !e.target.checked)}
                        className="w-4 h-4 accent-[#E86A33]"
                      />
                      <span className={unavailable ? "text-red-400" : "text-[#D4D4D4]"}>{unavailable ? "Off" : "Working"}</span>
                    </label>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => update(member.uid, { active: deactivated })}
                      className={deactivated ? smallButton : `${smallButton} hover:!border-red-500 hover:text-red-400`}
                    >
                      {deactivated ? "Reactivate" : "Deactivate"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-[#71717A]">
        Deactivated staff can't open the staff area or be assigned jobs; their past jobs stay in the history. Staff can also change
        their own lunch from their profile.
      </p>
    </div>
  );
}

// ─── Crews tab ───────────────────────────────────────────────────────────────

function CrewsTab({
  active,
  settings,
  crews,
}: {
  active: ReturnType<typeof useStaffDirectory>["staff"];
  settings: Record<string, StaffSettings>;
  crews: Crew[];
}) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState<Crew | "new" | null>(null);
  const [confirmUnpair, setConfirmUnpair] = useState<Crew | null>(null);
  const nameOf = (uid: string) => active.find((s) => s.uid === uid)?.name || "Former staff";
  const usable = active.filter((s) => (settings[s.uid]?.active ?? true));
  const inCrew = new Set(crews.flatMap((c) => c.memberUids));
  const solo = usable.filter((s) => !inCrew.has(s.uid));

  return (
    <div className="flex flex-col gap-5">
      <SectionHeading
        title="Crews"
        subtitle={`${CREW_MIN_SIZE}–${CREW_MAX_SIZE} staff who work together all day as one unit, until you unpair them`}
        action={
          <button onClick={() => setEditing("new")} className={primaryButton} disabled={solo.length < CREW_MIN_SIZE}>
            <Plus className="w-4 h-4" />
            Create crew
          </button>
        }
      />

      {crews.length === 0 ? (
        <Card>
          <EmptyState
            title="No crews yet"
            body="Everyone currently works solo. Create a crew to send two or three people out together; they count as one booking at a time."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {crews.map((crew) => (
            <Card key={crew.id} className="p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#E86A33]/10 border border-[#E86A33]/20 flex items-center justify-center shrink-0">
                    <UsersRound className="w-5 h-5 text-[#E86A33]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold font-display text-[#F5F5F5] truncate">
                      {crew.memberUids.map((u) => nameOf(u).split(" ")[0]).join(" + ")}
                    </h3>
                    <p className="text-xs text-[#A1A1AA]">{crew.memberUids.length} people</p>
                  </div>
                </div>
                <Badge tone={crew.workType === "bay" ? "blue" : "orange"}>{WORK_TYPE_LABELS[crew.workType]}</Badge>
              </div>
              <ul className="flex flex-col gap-2">
                {crew.memberUids.map((uid) => (
                  <li key={uid} className="flex items-center gap-2.5 text-sm text-[#D4D4D4]">
                    <UserAvatar className="w-6 h-6 rounded-full" iconClassName="w-3.5 h-3.5" />
                    {nameOf(uid)}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-[#A1A1AA]">
                Crew lunch <span className="text-[#F5F5F5] font-semibold">{lunchLabel(crew.lunchHour)}</span>
                {crew.lunchProposal && (
                  <span className="text-amber-400"> · change to {formatHour(crew.lunchProposal.hour)} proposed</span>
                )}
              </p>
              <div className="flex gap-2 mt-auto">
                <button onClick={() => setEditing(crew)} className={smallButton}>Edit</button>
                <button onClick={() => setConfirmUnpair(crew)} className={`${smallButton} hover:!border-red-500 hover:text-red-400`}>
                  Unpair
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-[#F5F5F5] mb-3">Working solo ({solo.length})</h3>
        {solo.length === 0 ? (
          <p className="text-sm text-[#71717A]">Everyone active is in a crew.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {solo.map((s) => (
              <span key={s.uid} className="inline-flex items-center gap-2 rounded-full border border-[#2C2C2C] bg-[#101010] pl-1 pr-3 py-1 text-sm text-[#D4D4D4]">
                <UserAvatar className="w-6 h-6 rounded-full" iconClassName="w-3.5 h-3.5" />
                {s.name}
                <span className="text-[#71717A]">· {WORK_TYPE_LABELS[(settings[s.uid] ?? defaultStaffSettings(s.uid)).workType]}</span>
              </span>
            ))}
          </div>
        )}
      </Card>

      {editing && (
        <CrewModal
          crew={editing === "new" ? null : editing}
          crews={crews}
          options={usable.filter((s) => !inCrew.has(s.uid) || (editing !== "new" && editing.memberUids.includes(s.uid)))}
          settings={settings}
          onClose={() => setEditing(null)}
        />
      )}

      {confirmUnpair && (
        <Modal
          title="Unpair this crew?"
          description="Everyone goes back to working solo with their own usual lunch. Jobs already assigned to the crew stay assigned."
          onClose={() => setConfirmUnpair(null)}
          footer={
            <>
              <button onClick={() => setConfirmUnpair(null)} className={secondaryButton}>Keep crew</button>
              <button
                className={dangerButton}
                onClick={async () => {
                  try {
                    await unpairCrew(confirmUnpair.id);
                    showToast("Crew unpaired.", "success");
                  } catch (e) {
                    showToast(e instanceof Error ? e.message : "Couldn't unpair the crew.", "error");
                  }
                  setConfirmUnpair(null);
                }}
              >
                Unpair crew
              </button>
            </>
          }
        >
          <p className="text-sm text-[#D4D4D4]">{confirmUnpair.memberUids.map(nameOf).join(", ")}</p>
        </Modal>
      )}
    </div>
  );
}

function CrewModal({
  crew,
  crews,
  options,
  settings,
  onClose,
}: {
  crew: Crew | null;
  crews: Crew[];
  options: ReturnType<typeof useStaffDirectory>["staff"];
  settings: Record<string, StaffSettings>;
  onClose: () => void;
}) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [members, setMembers] = useState<string[]>(crew?.memberUids ?? []);
  const [workType, setWorkType] = useState<WorkType>(crew?.workType ?? "mobile");
  const [lunchHour, setLunchHour] = useState<number>(crew?.lunchHour ?? 12);
  const [lunchTouched, setLunchTouched] = useState(Boolean(crew));
  const [saving, setSaving] = useState(false);

  // When creating, suggest the lunch the members already share (or the first member's)
  const suggestedLunch = useMemo(() => {
    const lunches = members.map((uid) => (settings[uid] ?? defaultStaffSettings(uid)).usualLunch);
    return lunches.length && lunches.every((l) => l === lunches[0]) ? lunches[0] : lunches[0] ?? 12;
  }, [members, settings]);
  const effectiveLunch = lunchTouched ? lunchHour : suggestedLunch;

  const toggle = (uid: string) =>
    setMembers((m) => (m.includes(uid) ? m.filter((x) => x !== uid) : m.length < CREW_MAX_SIZE ? [...m, uid] : m));

  const save = async () => {
    setSaving(true);
    try {
      if (crew) await updateCrew(crew, { memberUids: members, workType, lunchHour: effectiveLunch }, crews);
      else await createCrew({ memberUids: members, workType, lunchHour: effectiveLunch }, crews, currentUser?.uid || "");
      showToast(crew ? "Crew updated." : "Crew created.", "success");
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't save the crew.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={crew ? "Edit crew" : "Create crew"}
      description={`Pick ${CREW_MIN_SIZE}–${CREW_MAX_SIZE} people. They stay paired until you unpair them.`}
      onClose={onClose}
      footer={
        <>
          {members.length < CREW_MIN_SIZE && (
            <p className="mr-auto self-center text-xs text-[#A1A1AA]">
              Pick {CREW_MIN_SIZE - members.length} more {CREW_MIN_SIZE - members.length === 1 ? "person" : "people"}.
            </p>
          )}
          <button onClick={onClose} className={secondaryButton}>Cancel</button>
          <button onClick={save} className={primaryButton} disabled={saving || members.length < CREW_MIN_SIZE}>
            {crew ? "Save crew" : "Create crew"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[#D4D4D4]">Members ({members.length}/{CREW_MAX_SIZE})</span>
          {options.length === 0 && <p className="text-sm text-[#71717A]">No solo staff available.</p>}
          {options.map((s) => {
            const checked = members.includes(s.uid);
            return (
              <label
                key={s.uid}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                  checked ? "border-[#E86A33] bg-[#E86A33]/[0.06]" : "border-[#2C2C2C] hover:border-[#3C3C3C]"
                }`}
              >
                <input type="checkbox" checked={checked} onChange={() => toggle(s.uid)} className="w-4 h-4 accent-[#E86A33]" />
                <span className="flex-1 text-sm text-[#F5F5F5]">{s.name}</span>
                <span className="text-xs text-[#71717A]">
                  usually lunches {formatHour((settings[s.uid] ?? defaultStaffSettings(s.uid)).usualLunch)}
                </span>
              </label>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Works">
            <select value={workType} onChange={(e) => setWorkType(e.target.value as WorkType)} className={inputClass}>
              <option value="mobile">Mobile (call-outs)</option>
              <option value="bay">Bay (drive-ins)</option>
            </select>
          </Field>
          <Field label="Crew lunch" hint={crew ? "Members can agree on a new time later" : "Suggested from their usual lunch"}>
            <select
              value={effectiveLunch}
              onChange={(e) => {
                setLunchTouched(true);
                setLunchHour(Number(e.target.value));
              }}
              className={inputClass}
            >
              {LUNCH_HOURS.map((h) => (
                <option key={h} value={h}>{lunchLabel(h)}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>
    </Modal>
  );
}

// ─── Sign-up access tab ──────────────────────────────────────────────────────

function AccessTab({ staff }: { staff: ReturnType<typeof useStaffDirectory>["staff"] }) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [code, setCode] = useState("");
  const [codeDraft, setCodeDraft] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [approved, setApproved] = useState<PreRegisteredStaff[]>([]);
  const [form, setForm] = useState({ fullName: "", email: "", employeeId: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => subscribeToAccessCode(setCode), []);
  useEffect(() => subscribeToPreRegisteredStaff(setApproved), []);

  const activatedEmails = new Set(staff.filter((s) => s.isActivated).map((s) => (s.email || "").toLowerCase()));
  // Older approved emails were saved without a name; fall back to the name on their account
  const accountName = (email: string) => staff.find((s) => (s.email || "").toLowerCase() === email)?.name || "";
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const saveName = () => {
    if (!renaming) return;
    renameApprovedStaff(renaming.id, renaming.value)
      .then(() => {
        showToast("Name saved.", "success");
        setRenaming(null);
      })
      .catch((e) => showToast(e instanceof Error ? e.message : "Couldn't save the name.", "error"));
  };
  const employeeId = form.employeeId || nextEmployeeId(approved);

  const add = async () => {
    setAdding(true);
    try {
      await addApprovedStaff({ ...form, employeeId }, approved, currentUser?.uid || "");
      showToast(`${form.fullName.trim()} can now sign up as staff.`, "success");
      setForm({ fullName: "", email: "", employeeId: "" });
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't add this email.", "error");
    } finally {
      setAdding(false);
    }
  };

  const saveCode = async () => {
    try {
      await saveAccessCode(codeDraft ?? "");
      showToast("Access code updated. Existing staff aren't affected.", "success");
      setCodeDraft(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't save the code.", "error");
    }
  };

  const rows = approved
    .slice()
    .sort((x, y) => {
      const sx = activatedEmails.has(x.email) ? 1 : 0;
      const sy = activatedEmails.has(y.email) ? 1 : 0;
      return sx - sy || (x.fullName || accountName(x.email)).localeCompare(y.fullName || accountName(y.email));
    });
  const pending = rows.filter((r) => !activatedEmails.has(r.email)).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Access code: one slim bar */}
      <Card className="px-5 py-4 flex items-center gap-4 flex-wrap">
        <div className="min-w-[200px] flex-1">
          <p className="text-sm font-semibold text-[#F5F5F5]">Staff access code</p>
          <p className="text-xs text-[#71717A]">New staff enter it with their approved email and employee ID. Changing it doesn't affect existing staff.</p>
        </div>
        {codeDraft === null ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-base tracking-wider text-[#F5F5F5] bg-[#101010] border border-[#2C2C2C] rounded-lg px-3.5 h-9 inline-flex items-center min-w-[160px]">
              {code ? (showCode ? code : "•".repeat(code.length)) : <span className="text-[#71717A] text-sm font-sans">Not set</span>}
            </span>
            <button onClick={() => setShowCode((v) => !v)} className={`${smallButton} !h-9`} aria-label={showCode ? "Hide code" : "Show code"}>
              {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            {code && (
              <button
                onClick={() => navigator.clipboard?.writeText(code).then(() => showToast("Code copied.", "success"))}
                className={`${smallButton} !h-9`}
                aria-label="Copy code"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => setCodeDraft(code)} className={`${smallButton} !h-9`}>Change</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              value={codeDraft}
              onChange={(e) => setCodeDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveCode()}
              className={`${inputClass} font-mono !h-9 !py-0 !w-[200px]`}
              placeholder="At least 4 characters"
              autoFocus
            />
            <button onClick={saveCode} className={`${primaryButton} !h-9 !py-0`}>Save</button>
            <button onClick={() => setCodeDraft(null)} className={`${secondaryButton} !h-9 !py-0`}>Cancel</button>
          </div>
        )}
      </Card>

      {/* Approved emails, with the add form as the first row */}
      <Card className="overflow-x-auto">
        <div className="px-5 pt-4 pb-3 flex items-baseline justify-between gap-3 flex-wrap">
          <h3 className="text-[15px] font-bold text-[#F5F5F5]">
            Approved staff emails <span className="text-[#71717A] font-medium">{approved.length}{pending ? ` · ${pending} waiting to sign up` : ""}</span>
          </h3>
          <p className="text-xs text-[#71717A]">Only these emails can sign up as staff. Customer emails can't be used.</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
          className="px-5 pb-4 grid grid-cols-1 md:grid-cols-[1fr_1.2fr_150px_auto] gap-2"
        >
          <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={`${inputClass} !h-9 !py-0`} placeholder="Full name" aria-label="Full name" />
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`${inputClass} !h-9 !py-0`} placeholder="Email address" aria-label="Email" />
          <input value={employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className={`${inputClass} !h-9 !py-0 font-mono`} aria-label="Employee ID" title="Employee ID (suggested automatically)" />
          <button type="submit" disabled={adding || !form.fullName.trim() || !form.email.trim()} className={`${primaryButton} !h-9 !py-0 whitespace-nowrap`}>
            <Plus className="w-4 h-4" />
            Approve
          </button>
        </form>
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-[#71717A] text-xs border-t border-[#2C2C2C]">
              <th className="px-5 py-2.5 font-medium">Name</th>
              <th className="px-3 py-2.5 font-medium">Email</th>
              <th className="px-3 py-2.5 font-medium">Employee ID</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyState title="No approved emails yet" body="Add someone above so they can sign up." />
                </td>
              </tr>
            )}
            {rows.map((a) => {
              const signedUp = activatedEmails.has(a.email);
              return (
                <tr key={a.id} className="border-t border-[#2C2C2C]">
                  <td className="px-5 py-2.5">
                    {renaming?.id === a.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          value={renaming.value}
                          onChange={(e) => setRenaming({ id: a.id, value: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveName();
                            if (e.key === "Escape") setRenaming(null);
                          }}
                          className={`${inputClass} !h-8 !py-0 !w-[180px]`}
                          placeholder="Full name"
                          autoFocus
                        />
                        <button onClick={saveName} className={`${smallButton} !h-8`}>Save</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRenaming({ id: a.id, value: a.fullName || accountName(a.email) })}
                        className="group inline-flex items-center gap-1.5 text-left cursor-pointer"
                        title="Edit name"
                      >
                        {a.fullName || accountName(a.email) ? (
                          <span className="font-semibold text-[#F5F5F5]">{a.fullName || accountName(a.email)}</span>
                        ) : (
                          <span className="text-[#E86A33] text-xs font-medium">Add name</span>
                        )}
                        <Pencil className="w-3 h-3 text-[#71717A] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[#D4D4D4]">{a.email}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-[#A1A1AA]">{a.employeeId}</td>
                  <td className="px-3 py-2.5">{signedUp ? <Badge tone="green">Signed up</Badge> : <Badge tone="amber">Waiting</Badge>}</td>
                  <td className="px-5 py-2.5 text-right">
                    {!signedUp && (
                      <button
                        onClick={() =>
                          removeApprovedStaff(a.id)
                            .then(() => showToast("Email removed.", "success"))
                            .catch((e) => showToast(e.message, "error"))
                        }
                        className="p-1.5 rounded-lg text-[#71717A] hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                        aria-label={`Remove ${a.email}`}
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
