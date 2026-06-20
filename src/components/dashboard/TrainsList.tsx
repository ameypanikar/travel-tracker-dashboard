import { useState } from "react";
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
  const [assignedFilter, setAssignedFilter] = useState<string>("all");

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
          title={selectedDate ? "No trains on this date" : "No trains yet"}
          message={
            selectedDate
              ? "Try clearing the date filter or pick another day."
              : "Add a row to your Trains sheet."
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {ordered.map((t, i) => {
            const isPast = toISO(t.departuredate) < todayYMD;
            return (
              <TrainCard key={t.pnr || `${t.trainnumber}-${i}`} train={t} isPast={isPast} />
            );
          })}
        </div>
      )}
    </div>
  );
}