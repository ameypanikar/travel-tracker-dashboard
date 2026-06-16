import type { Hotel } from "@/lib/dashboard-api";
import { HotelCard } from "./HotelCard";
import { EmptyState } from "./EmptyState";
import { filterByRole } from "@/lib/role-filter";

const pad = (n: number) => String(n).padStart(2, "0");
const toYMD = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
  const visible = filterByRole(
    hotels as unknown as Record<string, unknown>[],
  ) as unknown as Hotel[];

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

  // ── Room summary ───────────────────────────────────────────────
  const totalRooms = filtered.reduce((sum, h) => {
    const r = h as unknown as Record<string, string>;
    const n = parseInt(r.numberofrooms || "0", 10);
    // Fall back to counting comma-separated room assignments
    const assignmentCount = r.roomassignments
      ? r.roomassignments.split(",").filter(Boolean).length
      : 0;
    return sum + (n || assignmentCount || 1);
  }, 0);

  // Group by city
  const cityMap: Record<string, number> = {};
  filtered.forEach((h) => {
    const r = h as unknown as Record<string, string>;
    const city = r.city || "Unknown";
    const n = parseInt(r.numberofrooms || "0", 10);
    const assignmentCount = r.roomassignments
      ? r.roomassignments.split(",").filter(Boolean).length
      : 0;
    cityMap[city] = (cityMap[city] || 0) + (n || assignmentCount || 1);
  });

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
      {/* Summary banner */}
      <div className="rounded-2xl bg-card px-4 py-3 shadow-card">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
          <span className="text-accent">
            🏨 {filtered.length} {filtered.length === 1 ? "hotel" : "hotels"}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-accent">
            🚪 {totalRooms} {totalRooms === 1 ? "room" : "rooms"} total
          </span>
          {Object.entries(cityMap).map(([city, count]) => (
            <span key={city} className="text-muted-foreground">
              · {city}: {count} {count === 1 ? "room" : "rooms"}
            </span>
          ))}
        </div>
      </div>

      {filtered.map((h) => (
        <HotelCard
          key={(h as unknown as Record<string, string>).confirmationcode}
          hotel={h}
        />
      ))}
    </div>
  );
}