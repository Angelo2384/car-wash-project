import { useState } from "react";
import WalkInQueue from "../../../components/walkins/WalkInQueue";
import WalkInHistory from "../../../components/walkins/WalkInHistory";
import { Tabs } from "../../../components/admin/AdminUI";
import { useStaffDirectory, useUnits } from "../../../hooks/useOperations";
import { toIsoDate } from "../../../lib/business";

type Tab = "queue" | "history";

export default function AdminWalkIns() {
  const [today] = useState(() => toIsoDate(new Date()));
  const [tab, setTab] = useState<Tab>("queue");
  const { staff } = useStaffDirectory();
  const bayWorkers = useUnits(today, staff)
    .filter((u) => u.workType === "bay")
    .map((u) => u.label);

  return (
    <div className="flex flex-col gap-6 pb-10 text-[#F5F5F5]">
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "queue", label: "Today's queue" },
          { id: "history", label: "History" },
        ]}
      />
      {tab === "queue" ? <WalkInQueue bayWorkers={bayWorkers} /> : <WalkInHistory />}
    </div>
  );
}
