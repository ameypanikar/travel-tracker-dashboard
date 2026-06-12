import { TrainFront } from "lucide-react";
import { formatTime } from "@/lib/date-utils";

export type Train = Record<string, string>;

function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toUpperCase();
  let label = s || "—";
  let cls = "bg-muted text-muted-foreground";
  if (s === "CNF") {
    label = "CONFIRMED";
    cls = "bg-success-soft text-success";
  } else if (s === "RAC") {
    label = "RAC";
    cls = "bg-orange-100 text-orange-700";
  } else if (["WL", "PQWL", "RQWL", "GNWL"].includes(s)) {
    label = "WAITLIST";
    cls = "bg-destructive/10 text-destructive";
  } else if (s === "CAN") {
    label = "CANCELLED";
    cls = "bg-muted text-muted-foreground";
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}
    >
      {label}
    </span>
  );
}

export function TrainCard({ train }: { train: Train }) {
  const t = train;
  return (
    <div className="rounded-2xl bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-accent">
          <TrainFront className="h-4 w-4" />
          <span>
            {t.trainname || "Train"}
            {t.trainnumber ? ` · ${t.trainnumber}` : ""}
          </span>
        </div>
        <StatusBadge status={t.bookingstatus} />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-2xl font-bold leading-none tracking-tight">{t.from || "—"}</div>
          <div className="mt-1 text-xs text-muted-foreground">{t.cityfrom}</div>
          <div className="mt-2 text-sm font-medium">{formatTime(t.departuretime)}</div>
          <div className="text-[11px] text-muted-foreground">{t.departuredate}</div>
        </div>

        <div className="flex flex-col items-center px-2">
          <div className="my-1 h-px w-12 bg-border" />
          <TrainFront className="h-3 w-3 text-accent" />
        </div>

        <div className="flex-1 text-right">
          <div className="text-2xl font-bold leading-none tracking-tight">{t.to || "—"}</div>
          <div className="mt-1 text-xs text-muted-foreground">{t.cityto}</div>
          <div className="mt-2 text-sm font-medium">{formatTime(t.arrivaltime)}</div>
          <div className="text-[11px] text-muted-foreground">{t.arrivaldate}</div>
        </div>
      </div>

      {(t.pnr || t.assignedto) && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
          <span className="font-mono text-muted-foreground">
            {t.pnr ? `PNR ${t.pnr}` : "No PNR"}
          </span>
          {t.assignedto && (
            <span className="text-[11px] text-muted-foreground">👤 {t.assignedto}</span>
          )}
        </div>
      )}
    </div>
  );
}
