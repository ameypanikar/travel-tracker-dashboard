import type { Flight } from "@/lib/dashboard-api";
import { Plane, ExternalLink } from "lucide-react";
import { formatTime } from "@/lib/date-utils";

export function FlightCard({ flight }: { flight: Flight }) {
  const f = flight as unknown as Record<string, string>;
  const status = (f.bookingstatus || "").toUpperCase();
  return (
    <div className="rounded-2xl bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-accent">
          <Plane className="h-4 w-4" />
          <span>{f.airline || "Flight"}</span>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-2xl font-bold leading-none tracking-tight">{f.from || "—"}</div>
          <div className="mt-1 text-xs text-muted-foreground">{f.cityfrom}</div>
          <div className="mt-2 text-sm font-medium">{formatTime(f.departuretime)}</div>
          <div className="text-[11px] text-muted-foreground">{f.departuredate}</div>
        </div>

        <div className="flex flex-col items-center px-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {f.duration || ""}
          </div>
          <div className="my-1 h-px w-12 bg-border" />
          <Plane className="h-3 w-3 rotate-90 text-accent" />
        </div>

        <div className="flex-1 text-right">
          <div className="text-2xl font-bold leading-none tracking-tight">{f.to || "—"}</div>
          <div className="mt-1 text-xs text-muted-foreground">{f.cityto}</div>
          <div className="mt-2 text-sm font-medium">{formatTime(f.arrivaltime)}</div>
          <div className="text-[11px] text-muted-foreground">{f.arrivaldate}</div>
        </div>
      </div>

      {(f.confirmationcode || f.managelink || f.assignedto) && (
        <div className="mt-3 space-y-1 border-t border-border pt-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-muted-foreground">
              {f.confirmationcode ? `PNR ${f.confirmationcode}` : "No PNR"}
            </span>
            {f.managelink && (
              <a
                href={f.managelink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
              >
                Manage <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {f.assignedto && (
            <div className="text-[11px] text-muted-foreground">👤 {f.assignedto}</div>
          )}
        </div>
      )}

    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isBooked = status === "BOOKED";
  const isPending = status === "PENDING";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
        isBooked
          ? "bg-success-soft text-success"
          : isPending
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground"
      }`}
    >
      {status || "—"}
    </span>
  );
}
