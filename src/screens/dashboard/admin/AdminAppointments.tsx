import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CalendarClock, MapPin, RefreshCw, Search, UserPlus, XCircle } from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';
import {
  subscribeToAllAppointments,
  subscribeToStaffMembers,
  getDynamicAppointmentStatus,
  parseAppointmentDateTime,
  type StoredAppointment,
  type StaffMember,
} from '../../../lib/appointments';
import { fromIsoDate } from '../../../lib/business';
import AppointmentCrewAssign from '../../../components/admin/AppointmentCrewAssign';
import { Badge, Card, EmptyState, Modal, Tabs, type BadgeTone } from '../../../components/admin/AdminUI';
import { secondaryButton, smallButton } from '../../../components/admin/adminStyles';
import { useCrews, useServices, useStaffSettings } from '../../../hooks/useOperations';

type Appointment = StoredAppointment & { customerUid: string };
type Bucket = 'awaiting' | 'confirmed' | 'completed' | 'cancelled';
type FilterTab = 'all' | Bucket;

const BUCKET_LABEL: Record<Bucket, string> = {
  awaiting: 'Needs a crew',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
const BUCKET_TONE: Record<Bucket, BadgeTone> = {
  awaiting: 'amber',
  confirmed: 'green',
  completed: 'neutral',
  cancelled: 'red',
};

/** One status per booking, so the tabs and their counts always agree. */
function bucketOf(appt: StoredAppointment): Bucket {
  const dyn = getDynamicAppointmentStatus(
    appt.date,
    appt.time,
    appt.status === 'Missed',
    appt.completed,
    false,
    appt.status,
    appt.confirmed,
    appt.staffStatus
  );
  if (appt.status === 'Cancelled' || dyn.status === 'Cancelled') return 'cancelled';
  if (appt.completed === true || dyn.status === 'Completed') return 'completed';
  if (appt.confirmed === false || dyn.status === 'Awaiting Confirmation') return 'awaiting';
  return 'confirmed';
}

function whenOf(appt: StoredAppointment) {
  const at = parseAppointmentDateTime(appt.date, appt.time);
  const day = appt.bookingDate
    ? fromIsoDate(appt.bookingDate).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })
    : at
      ? at.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })
      : appt.date;
  return { at, day, time: appt.time };
}

export default function AdminAppointments() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // ?search=<ref> (e.g. from the Schedule) pre-fills the search box
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { items: services } = useServices();
  const staffSettings = useStaffSettings();
  const crews = useCrews();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [now] = useState(() => Date.now());

  useEffect(
    () =>
      subscribeToStaffMembers(setStaffList, (err) =>
        showToast(`Couldn't load staff: ${err?.message || 'unknown error'}`, 'error')
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscribe once; showToast changes every render
    []
  );

  useEffect(() => {
    return subscribeToAllAppointments(
      (list) => {
        setAppointments(list);
        setIsLoading(false);
        setLoadError(null);
      },
      (err) => {
        const isPermission = err?.code === 'permission-denied' || /permission/i.test(err?.message || '');
        setLoadError(
          isPermission
            ? "This account isn't allowed to read appointments. Check the user's role is admin and the Firestore rules are deployed."
            : err?.message || "Couldn't load appointments."
        );
        setIsLoading(false);
      }
    );
  }, [refreshKey]);

  const rows = useMemo(
    () => appointments.map((appt) => ({ appt, bucket: bucketOf(appt), when: whenOf(appt) })),
    [appointments]
  );

  const counts = useMemo(() => {
    const c: Record<Bucket, number> = { awaiting: 0, confirmed: 0, completed: 0, cancelled: 0 };
    rows.forEach((r) => c[r.bucket]++);
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return rows
      .filter((r) => filterTab === 'all' || r.bucket === filterTab)
      .filter(({ appt }) =>
        !q
          ? true
          : [appt.id, appt.customerName, appt.customerEmail, appt.customerPhone, appt.packageName, appt.vehicle, appt.address, appt.location, appt.staffName]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q))
      )
      .sort((a, b) => {
        // Upcoming bookings first (soonest at the top), then past ones (most recent first)
        const ta = a.when.at?.getTime() ?? a.appt.createdAt ?? 0;
        const tb = b.when.at?.getTime() ?? b.appt.createdAt ?? 0;
        const fa = ta >= now;
        const fb = tb >= now;
        if (fa !== fb) return fa ? -1 : 1;
        return fa ? ta - tb : tb - ta;
      });
  }, [rows, filterTab, searchQuery, now]);

  const refresh = () => {
    setIsLoading(true);
    setLoadError(null);
    setRefreshKey((k) => k + 1);
  };

  const selected = rows.find((r) => r.appt.id === selectedId) ?? null;
  const goReschedule = (appt: Appointment) =>
    navigate(`/dashboard/admin/appointments/reschedule/${appt.customerUid}/${appt.id}`, { state: { appointment: appt } });
  const goCancel = (appt: Appointment) =>
    navigate(`/dashboard/admin/appointments/cancel/${appt.customerUid}/${appt.id}`, { state: { appointment: appt } });

  return (
    <div className="flex flex-col gap-5 pb-10 text-[#F5F5F5]">
      <Tabs<FilterTab>
        value={filterTab}
        onChange={setFilterTab}
        tabs={[
          { id: 'all', label: 'All', count: rows.length },
          { id: 'awaiting', label: 'Needs a crew', count: counts.awaiting },
          { id: 'confirmed', label: 'Confirmed', count: counts.confirmed },
          { id: 'completed', label: 'Completed', count: counts.completed },
          { id: 'cancelled', label: 'Cancelled', count: counts.cancelled },
        ]}
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customer, reference, phone, vehicle or crew"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#101010] border border-[#2C2C2C] rounded-lg pl-9 pr-14 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#71717A] focus:outline-none focus:border-[#E86A33]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#71717A] hover:text-[#F5F5F5] cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
        <button onClick={refresh} className={smallButton} title="Reload appointments">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loadError && !isLoading && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="flex-1 text-sm text-red-300">{loadError}</p>
          <button onClick={refresh} className="text-xs text-red-400 underline font-medium cursor-pointer">
            Retry
          </button>
        </div>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[920px]">
          <thead>
            <tr className="text-left text-[#71717A] text-xs">
              <th className="px-5 py-3 font-medium">When</th>
              <th className="px-3 py-3 font-medium">Customer</th>
              <th className="px-3 py-3 font-medium">Booking</th>
              <th className="px-3 py-3 font-medium">Crew</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium text-right">Total</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    title={
                      isLoading
                        ? 'Loading appointments…'
                        : searchQuery
                          ? `No bookings match “${searchQuery}”`
                          : filterTab === 'awaiting'
                            ? 'Every booking has a crew'
                            : 'No appointments here'
                    }
                  />
                </td>
              </tr>
            )}
            {visible.map(({ appt, bucket, when }) => {
              const open = bucket === 'awaiting' || bucket === 'confirmed';
              const past = (when.at?.getTime() ?? 0) < now;
              return (
                <tr
                  key={appt.id}
                  onClick={() => setSelectedId(appt.id)}
                  className={`border-t border-[#2C2C2C] cursor-pointer hover:bg-[#1F1F1F] transition-colors ${
                    !open ? 'text-[#A1A1AA]' : ''
                  }`}
                >
                  <td className="px-5 py-3 whitespace-nowrap">
                    <p className={`font-semibold ${open ? 'text-[#F5F5F5]' : ''}`}>{when.day}</p>
                    <p className="text-xs text-[#71717A]">
                      {when.time}
                      {open && past ? ' · overdue' : ''}
                    </p>
                  </td>
                  <td className="px-3 py-3 max-w-[200px]">
                    <p className={`font-semibold truncate ${open ? 'text-[#F5F5F5]' : ''}`}>{appt.customerName || 'Customer'}</p>
                    <p className="text-xs text-[#71717A] truncate">{appt.customerPhone || appt.customerEmail}</p>
                  </td>
                  <td className="px-3 py-3 max-w-[240px]">
                    <p className="truncate">
                      {appt.packageName}
                      <span className="text-[#71717A]"> · {appt.serviceType === 'Drive-in' ? 'Drive-in' : 'Call-out'}</span>
                    </p>
                    <p className="text-xs text-[#71717A] truncate">{appt.vehicle}</p>
                  </td>
                  <td className="px-3 py-3" onClick={(e) => bucket === 'awaiting' && e.stopPropagation()}>
                    {bucket === 'awaiting' ? (
                      <button
                        onClick={() => setSelectedId(appt.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#E86A33] hover:bg-[#d65f2c] text-white px-3 py-1.5 text-xs font-semibold cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Assign crew
                      </button>
                    ) : (
                      <span className="truncate block max-w-[160px]">
                        {appt.staffName && appt.staffName !== 'Pending Assignment' ? appt.staffName : '—'}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge tone={BUCKET_TONE[bucket]}>{BUCKET_LABEL[bucket]}</Badge>
                      {appt.rescheduledByRole === 'customer' && bucket === 'awaiting' && <Badge tone="orange">Moved</Badge>}
                    </div>
                  </td>
                  <td className={`px-3 py-3 text-right font-semibold whitespace-nowrap ${open ? 'text-[#F5F5F5]' : ''}`}>{appt.price}</td>
                  <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                    {open ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button className={smallButton} onClick={() => goReschedule(appt)} title="Reschedule" aria-label={`Reschedule ${appt.id}`}>
                          <CalendarClock className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className={`${smallButton} hover:!border-red-500 hover:text-red-400`}
                          onClick={() => goCancel(appt)}
                          title="Cancel booking"
                          aria-label={`Cancel ${appt.id}`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {selected && (
        <Modal
          title={`${selected.appt.customerName || 'Customer'} · ${selected.appt.packageName}`}
          description={`${selected.appt.date} at ${selected.appt.time}`}
          onClose={() => setSelectedId(null)}
          footer={
            selected.bucket === 'awaiting' || selected.bucket === 'confirmed' ? (
              <>
                <button onClick={() => goCancel(selected.appt)} className={`${secondaryButton} hover:!border-red-500 hover:text-red-400`}>
                  Cancel booking
                </button>
                <button onClick={() => goReschedule(selected.appt)} className={secondaryButton}>
                  Reschedule
                </button>
              </>
            ) : undefined
          }
        >
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone={BUCKET_TONE[selected.bucket]}>{BUCKET_LABEL[selected.bucket]}</Badge>
              <Badge tone={selected.appt.serviceType === 'Drive-in' ? 'blue' : 'orange'}>{selected.appt.serviceType}</Badge>
              <span className="text-[#71717A] font-mono text-xs">#{selected.appt.id}</span>
              <span className="ml-auto font-bold text-[#F5F5F5]">{selected.appt.price}</span>
            </div>

            <dl className="grid grid-cols-[110px_1fr] gap-y-2">
              <dt className="text-[#71717A]">Vehicle</dt>
              <dd className="text-[#F5F5F5]">{selected.appt.vehicle}</dd>
              <dt className="text-[#71717A]">Phone</dt>
              <dd className="text-[#F5F5F5]">{selected.appt.customerPhone || 'Not given'}</dd>
              <dt className="text-[#71717A]">Email</dt>
              <dd className="text-[#F5F5F5] break-all">{selected.appt.customerEmail || 'Not given'}</dd>
              {selected.appt.serviceType !== 'Drive-in' && (selected.appt.address || selected.appt.location) && (
                <>
                  <dt className="text-[#71717A]">Address</dt>
                  <dd className="text-[#F5F5F5] flex items-start gap-1.5">
                    <MapPin className="w-4 h-4 text-[#E86A33] shrink-0 mt-0.5" />
                    {selected.appt.address || selected.appt.location}
                  </dd>
                </>
              )}
              {selected.appt.customServiceNames?.length ? (
                <>
                  <dt className="text-[#71717A]">Services</dt>
                  <dd className="text-[#F5F5F5]">{selected.appt.customServiceNames.join(', ')}</dd>
                </>
              ) : null}
              {selected.bucket !== 'awaiting' && (
                <>
                  <dt className="text-[#71717A]">Crew</dt>
                  <dd className="text-[#F5F5F5]">
                    {selected.appt.staffName && selected.appt.staffName !== 'Pending Assignment' ? selected.appt.staffName : 'Not assigned'}
                    {selected.appt.confirmedByName && <span className="text-[#71717A]"> · confirmed by {selected.appt.confirmedByName}</span>}
                  </dd>
                </>
              )}
              {selected.appt.previousSchedule && (
                <>
                  <dt className="text-[#71717A]">Moved from</dt>
                  <dd className="text-[#A1A1AA]">
                    {selected.appt.previousSchedule.date} at {selected.appt.previousSchedule.time}
                    {selected.appt.rescheduledByRole === 'customer' ? ' (by the customer)' : ''}
                  </dd>
                </>
              )}
            </dl>

            {selected.appt.notes && (
              <p className="rounded-lg bg-[#101010] border border-[#2C2C2C] px-3 py-2.5 text-[#A1A1AA]">
                <span className="text-[#71717A]">Customer notes: </span>
                {selected.appt.notes}
              </p>
            )}
            {selected.appt.cancelReason && (
              <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-red-300">
                <span className="font-semibold text-red-400">Cancelled: </span>
                {selected.appt.cancelReason}
                {selected.appt.cancelledByName && <span className="text-red-400/80"> (by {selected.appt.cancelledByName})</span>}
              </p>
            )}

            {(selected.bucket === 'awaiting' || selected.bucket === 'confirmed') && (
              <div className="border-t border-[#2C2C2C] pt-4 flex flex-col gap-2">
                <p className="font-semibold text-[#F5F5F5]">{selected.bucket === 'awaiting' ? 'Assign a crew' : 'Change crew'}</p>
                <AppointmentCrewAssign
                  appt={selected.appt}
                  appointments={appointments}
                  services={services}
                  staff={staffList}
                  settings={staffSettings}
                  crews={crews}
                />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
