import WalkInQueue from "../../../components/walkins/WalkInQueue";
import { Card, EmptyState } from "../../../components/admin/AdminUI";
import { useStaffWorkday } from "../../../hooks/useStaffWorkday";

/** Today's walk-in tickets, for whoever is on the bay. */
export default function StaffWalkIns() {
  const day = useStaffWorkday();
  const label = day.crew ? [day.myName, ...day.partnerNames].map((n) => n.split(" ")[0]).join(" + ") : day.myName;

  if (day.workType !== "bay") {
    return (
      <Card>
        <EmptyState
          title="You're on mobile call-outs"
          body="Walk-in tickets are handled by whoever the owner puts on the bay. They show here when you're on the bay."
        />
      </Card>
    );
  }
  if (day.offToday) {
    return (
      <Card>
        <EmptyState title="You're off today" body="Walk-ins are handled by whoever is on the bay today." />
      </Card>
    );
  }
  return (
    <div className="pb-10 text-[#F5F5F5]">
      <WalkInQueue bayWorkers={[label]} />
    </div>
  );
}
