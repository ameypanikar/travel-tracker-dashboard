import { useState } from "react";
import { TrainCard, type Train } from "./TrainCard";
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

export function TrainsList({
  trains,
  selectedDate,
}: {
  trains: Train[];
  selectedDate?: Date | null;
}) {
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const visible = filterByRole(
    trains as unknown as Record<string, unknown>[],
  ) as unknown as Train[];

  const allAssignees = Array.from(
    new Set(
      visible.flatMap((t) =>
        (t.assignedto || "").split(",").map((s) => s.trim()).filter(Boolean)
      )
    )
  ).sort();

  const dateFiltered = selectedDate
    ? visible.filter((t) => toISO(t.departuredate) === toYMD(selectedDate))
    : visible;

  const filtered =
    assignedFilter === "all"
      ? dateFiltered
      : dateFiltered.filter((t) =>
          (t.assignedto || "").split(",").map((s) => s.trim()).includes(assignedFilter)
        );

  const todayYMD = toYMD(new Date());
  const upcoming: Train[] = [];
  const past: Train[] = [];
  for (const t of filtered) {
    const iso = toISO(t.departuredate);
    if (iso && iso < todayYMD) past.push(t);
    else upcoming.push(t);
  }
  const byDateAsc = (a: Train, b: Train) => toISO(a.departuredate).localeCompare(toISO(b.departuredate));
  upcoming.sort(byDateAsc);
  past.sort(byDateAsc);
  const ordered = [...upcoming, ...past];

  return (
    <div>
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
          title={selectedDate ? "No trains on this date" : "No trains yet"}
          message={
            selectedDate
              ? "Try clearing the date filter or pick another day."
              : "Add a row to your Trains sheet."
          }
        />
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mb-5 flex flex-col gap-3">
              {upcoming.map((t, i) => (
                <div key={t.pnr || `${t.trainnumber}-${i}`}>
                  <div className="mb-1 px-1 text-xs font-semibold text-accent">
                    {getRelativeDateLabel(t.departuredate)}
                  </div>
                  <TrainCard train={t} />
                </div>
              ))}
            </div>
          )}

          {past.length > 0 && (
            <div>
              <div className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Past
              </div>
              <div className="flex flex-col gap-3">
                {past.map((t, i) => (
                  <TrainCard key={t.pnr || `${t.trainnumber}-${i}`} train={t} isPast />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}