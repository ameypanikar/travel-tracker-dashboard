import type { Hotel } from "@/lib/dashboard-api";
import { HotelCard } from "./HotelCard";
import { EmptyState } from "./EmptyState";
import { parseAnyDate, startOfDay } from "@/lib/date-utils";

export function HotelsList({
  hotels,
  selectedDate,
}: {
  hotels: Hotel[];
  selectedDate?: Date | null;
}) {
  const filtered = selectedDate
    ? hotels.filter((h) => {
        const ci = parseAnyDate(h.checkInIso || h.checkInDate);
        const co = parseAnyDate(h.checkOutIso || h.checkOutDate);
        if (!ci) return false;
        const t = startOfDay(selectedDate).getTime();
        const start = startOfDay(ci).getTime();
        const end = startOfDay(co ?? ci).getTime();
        return t >= start && t <= end;
      })
    : hotels;

  if (!filtered.length) {
    return (
      <EmptyState
        title={selectedDate ? "No active stay on this date" : "No hotels yet"}
        message={
          selectedDate
            ? "No hotel covers this day. Try another date or clear the filter."
            : "Add a row to your Hotels sheet."
        }
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {filtered.map((h) => (
        <HotelCard key={(h as unknown as Record<string, string>).confirmationcode} hotel={h} />
      ))}
    </div>
  );
}
