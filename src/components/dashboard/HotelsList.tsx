import type { Hotel } from "@/lib/dashboard-api";
import { HotelCard } from "./HotelCard";
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

export function HotelsList({
  hotels,
  selectedDate,
}: {
  hotels: Hotel[];
  selectedDate?: Date | null;
}) {
  const visible = filterByRole(hotels as unknown as Record<string, unknown>[]) as unknown as Hotel[];
  const filtered = selectedDate
    ? visible.filter((h) => {
        const r = h as unknown as Record<string, string>;
        const start = toISO(r.checkindate);
        const end = toISO(r.checkoutdate) || start;
        if (!start) return false;
        const ymd = toYMD(selectedDate);
        return ymd >= start && ymd <= end;
      })
    : visible;


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
