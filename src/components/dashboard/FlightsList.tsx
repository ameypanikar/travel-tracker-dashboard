import type { Flight } from "@/lib/dashboard-api";
import { FlightCard } from "./FlightCard";
import { EmptyState } from "./EmptyState";
import { isSameDay, parseAnyDate } from "@/lib/date-utils";

export function FlightsList({
  flights,
  selectedDate,
}: {
  flights: Flight[];
  selectedDate?: Date | null;
}) {
  const filtered = selectedDate
    ? flights.filter((f) => {
        const d = parseAnyDate(f.departureIso || f.departureDate);
        return d ? isSameDay(d, selectedDate) : false;
      })
    : flights;

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
        <FlightCard key={`${f.sourceSheet}-${f.sourceRow}`} flight={f} />
      ))}
    </div>
  );
}
