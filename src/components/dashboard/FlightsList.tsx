import type { Flight } from "@/lib/dashboard-api";
import { FlightCard } from "./FlightCard";
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

export function FlightsList({
  flights,
  selectedDate,
}: {
  flights: Flight[];
  selectedDate?: Date | null;
}) {
  const visible = filterByRole(flights as unknown as Record<string, unknown>[]) as unknown as Flight[];
  const filtered = selectedDate
    ? visible.filter((f) => {
        const r = f as unknown as Record<string, string>;
        return toISO(r.departuredate) === toYMD(selectedDate);
      })
    : visible;


  if (!filtered.length) {
    return (
      <EmptyState
        title={selectedDate ? "No flights on this date" : "No flights yet"}
        message={
          selectedDate
            ? "Try clearing the date filter or pick another day."
            : "Add a row to your Flights sheet."
        }
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {filtered.map((f) => (
        <FlightCard key={(f as unknown as Record<string, string>).confirmationcode} flight={f} />
      ))}
    </div>
  );
}
