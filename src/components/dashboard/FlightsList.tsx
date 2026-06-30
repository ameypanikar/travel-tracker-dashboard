import { useState } from "react";
import type { Flight, Document } from "@/lib/dashboard-api";
import { FlightCard } from "./FlightCard";
import { EmptyState } from "./EmptyState";
import { filterByRole } from "@/lib/role-filter";
import { getRelativeDateLabel } from "@/lib/date-utils";
import { Users, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
  documents = [],
}: {
  flights: Flight[];
  selectedDate?: Date | null;
  documents?: Document[];
}) {
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [filterOpen, setFilterOpen] = useState(false);

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
      {/* Assignee filter — collapsible */}
      {allAssignees.length > 0 && (
        <div className="mb-3">
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
        <>
          {upcoming.length > 0 && (
            <div className="mb-5 flex flex-col gap-3">
              {upcoming.map((f) => {
                const r = f as unknown as Record<string, string>;
                return (
                  <div key={r.confirmationcode}>
                    <div className="mb-1 px-1 text-xs font-semibold text-accent">
                      {getRelativeDateLabel(r.departuredate)}
                    </div>
                    <FlightCard flight={f} documents={documents} />
                  </div>
                );
              })}
            </div>
          )}

          {past.length > 0 && (
            <div>
              <div className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Past
              </div>
              <div className="flex flex-col gap-3">
                {past.map((f) => {
                  const r = f as unknown as Record<string, string>;
                  return (
                    <FlightCard key={r.confirmationcode} flight={f} isPast documents={documents} />
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}