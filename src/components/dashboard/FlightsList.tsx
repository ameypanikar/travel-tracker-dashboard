import { useState } from "react";
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
  const [assignedFilter, setAssignedFilter] = useState<string>("all");

  const visible = filterByRole(
    flights as unknown as Record<string, unknown>[],
  ) as unknown as Flight[];

  // Build unique assignee list
  const allAssignees = Array.from(
    new Set(
      visible
        .flatMap((f) => {
          const r = f as unknown as Record<string, string>;
          return (r.assignedto || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        })
    )
  ).sort();

  const dateFiltered = selectedDate
    ? visible.filter((f) => {
        const r = f as unknown as Record<string, string>;
        return toISO(r.departuredate) === toYMD(selectedDate);
      })
    : visible;

  const filtered =
    assignedFilter === "all"
      ? dateFiltered
      : dateFiltered.filter((f) => {
          const r = f as unknown as Record<string, string>;
          return (r.assignedto || "")
            .split(",")
            .map((s) => s.trim())
            .includes(assignedFilter);
        });

  // Split into upcoming (today or future) and past, each sorted ascending by date
  const todayYMD = toYMD(new Date());
  const upcoming: Flight[] = [];
  const past: Flight[] = [];
  for (const f of filtered) {
    const r = f as unknown as Record<string, string>;
    const iso = toISO(r.departuredate);
    if (iso && iso < todayYMD) past.push(f);
    else upcoming.push(f);
  }
  const byDateAsc = (a: Flight, b: Flight) => {
    const ra = a as unknown as Record<string, string>;
    const rb = b as unknown as Record<string, string>;
    return toISO(ra.departuredate).localeCompare(toISO(rb.departuredate));
  };
  upcoming.sort(byDateAsc);
  past.sort(byDateAsc);
  const ordered = [...upcoming, ...past];

  return (
    <div>
      {/* Assignee filter */}
      {allAssignees.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
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

      {!filtered.length ? (
        <EmptyState
          title={selectedDate ? "No flights on this date" : "No flights yet"}
          message={
            selectedDate
              ? "Try clearing the date filter or pick another day."
              : "Add a row to your Flights sheet."
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {ordered.map((f) => {
            const r = f as unknown as Record<string, string>;
            const isPast = toISO(r.departuredate) < todayYMD;
            return (
              <FlightCard
                key={r.confirmationcode}
                flight={f}
                isPast={isPast}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}