import { useState } from "react";
import type { Hotel } from "@/lib/dashboard-api";
import { HotelCard } from "./HotelCard";
import { EmptyState } from "./EmptyState";
import { filterByRole } from "@/lib/role-filter";
import { Users, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const visible = filterByRole(
    hotels as unknown as Record<string, unknown>[],
  ) as unknown as Hotel[];

  const allAssignees = Array.from(
    new Set(
      visible.flatMap((h) => {
        const r = h as unknown as Record<string, string>;
        return (r.assignedto || "").split(",").map((s) => s.trim()).filter(Boolean);
      })
    )
  ).sort();

  const dateFiltered = selectedDate
    ? visible.filter((h) => {
        const r = h as unknown as Record<string, string>;
        const start = toISO(r.checkindate);
        const end = toISO(r.checkoutdate) || start;
        if (!start) return false;
        const ymd = toYMD(selectedDate);
        return ymd >= start && ymd <= end;
      })
    : visible;

  const filtered =
    assignedFilter === "all"
      ? dateFiltered
      : dateFiltered.filter((h) => {
          const r = h as unknown as Record<string, string>;
          return (r.assignedto || "").split(",").map((s) => s.trim()).includes(assignedFilter);
        });

  // Split into upcoming (checkout today or in future) vs past (checked out already)
  const todayYMD = toYMD(new Date());
  const upcoming: Hotel[] = [];
  const past: Hotel[] = [];
  for (const h of filtered) {
    const r = h as unknown as Record<string, string>;
    const checkout = toISO(r.checkoutdate) || toISO(r.checkindate);
    if (checkout && checkout < todayYMD) past.push(h);
    else upcoming.push(h);
  }
  const byCheckinAsc = (a: Hotel, b: Hotel) => {
    const ra = a as unknown as Record<string, string>;
    const rb = b as unknown as Record<string, string>;
    return toISO(ra.checkindate).localeCompare(toISO(rb.checkindate));
  };
  upcoming.sort(byCheckinAsc);
  past.sort(byCheckinAsc);
  const ordered = [...upcoming, ...past];

  // ── Room summary ───────────────────────────────────────────────
  const totalRooms = filtered.reduce((sum, h) => {
    const r = h as unknown as Record<string, string>;
    const n = parseInt(r.numberofrooms || "0", 10);
    const assignmentCount = r.roomassignments
      ? r.roomassignments.split(",").filter(Boolean).length
      : 0;
    return sum + (n || assignmentCount || 1);
  }, 0);

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
      {/* Assignee filter — collapsible */}
      {allAssignees.length > 0 && (
        <div>
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/10"
          >
            <Users className="h-3.5 w-3.5" />
            {assignedFilter === "all" ? "Filter by person" : `Showing: ${assignedFilter}`}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", filterOpen && "rotate-180")} />
          </button>

          {filterOpen && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                onClick={() => setAssignedFilter("all")}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  assignedFilter === "all"
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent-soft"
                }`}
              >
                All
              </button>
              {allAssignees.map((name) => (
                <button
                  key={name}
                  onClick={() => setAssignedFilter(name)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    assignedFilter === name
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent-soft"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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

      {ordered.map((h) => {
        const r = h as unknown as Record<string, string>;
        const checkout = toISO(r.checkoutdate) || toISO(r.checkindate);
        const isPast = checkout < todayYMD;
        return (
          <HotelCard
            key={r.confirmationcode}
            hotel={h}
            isPast={isPast}
          />
        );
      })}
    </div>
  );
}