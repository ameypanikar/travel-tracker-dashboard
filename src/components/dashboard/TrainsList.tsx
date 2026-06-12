import { TrainCard, type Train } from "./TrainCard";
import { EmptyState } from "./EmptyState";
import { filterByRole } from "@/lib/role-filter";

const pad = (n: number) => String(n).padStart(2, "0");
const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toISO = (ddmmyyyy?: string): string => {
  if (!ddmmyyyy) return "";
  const parts = String(ddmmyyyy).split("/");
  if (parts.length !== 3) return "";
  return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
};

export function TrainsList({
  trains,
  selectedDate,
}: {
  trains: Train[];
  selectedDate?: Date | null;
}) {
  const visible = filterByRole(trains as unknown as Record<string, unknown>[]) as unknown as Train[];
  const filtered = selectedDate
    ? visible.filter((t) => toISO(t.departuredate) === toYMD(selectedDate))
    : visible;

  if (!filtered.length) {
    return (
      <EmptyState
        title={selectedDate ? "No trains on this date" : "No trains yet"}
        message={
          selectedDate
            ? "Try clearing the date filter or pick another day."
            : "Add a row to your Trains sheet."
        }
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {filtered.map((t, i) => (
        <TrainCard key={t.pnr || `${t.trainnumber}-${i}`} train={t} />
      ))}
    </div>
  );
}
