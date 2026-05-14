import type { Flight } from "@/lib/dashboard-api";
import { Plane, ExternalLink, Ticket } from "lucide-react";
import { formatTime } from "@/lib/date-utils";

// Look up a value from the optional `fields` map by trying multiple key
// variants (case/space/underscore-insensitive).
function pickField(flight: Flight, ...keys: string[]): string | undefined {
  const f = flight.fields;
  if (!f) return undefined;
  const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, "");
  const map = new Map<string, string>();
  Object.entries(f).forEach(([k, v]) => map.set(norm(k), String(v ?? "")));
  for (const k of keys) {
    const v = map.get(norm(k));
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

export function FlightCard({ flight }: { flight: Flight }) {
  const status = (flight.bookingStatus || "").toUpperCase();
  const flightNumber = pickField(flight, "flightNumber", "flight_no", "flight no", "flight");
  const gate = pickField(flight, "gate", "boardingGate", "boarding gate");
  const terminal = pickField(flight, "terminal");
  const boardingPass = pickField(
    flight,
    "boardingPass",
    "boarding_pass",
    "boarding pass",
    "boardingPassUrl",
    "boardingPassLink",
  );
  return (
    <div className="rounded-2xl bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-accent">
          <Plane className="h-4 w-4" />
          <span>{flight.airline || "Flight"}</span>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-2xl font-bold leading-none tracking-tight">
            {flight.fromCode || "—"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{flight.fromCity}</div>
          <div className="mt-2 text-sm font-medium">{formatTime(flight.departureTime)}</div>
          <div className="text-[11px] text-muted-foreground">{flight.departureDate}</div>
        </div>

        <div className="flex flex-col items-center px-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {flight.duration || ""}
          </div>
          <div className="my-1 h-px w-12 bg-border" />
          <Plane className="h-3 w-3 rotate-90 text-accent" />
        </div>

        <div className="flex-1 text-right">
          <div className="text-2xl font-bold leading-none tracking-tight">
            {flight.toCode || "—"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{flight.toCity}</div>
          <div className="mt-2 text-sm font-medium">{formatTime(flight.arrivalTime)}</div>
          <div className="text-[11px] text-muted-foreground">{flight.arrivalDate}</div>
        </div>
      </div>

      {(flight.confirmationCode || flight.manageLink) && (
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
          <span className="font-mono text-muted-foreground">
            {flight.confirmationCode ? `PNR ${flight.confirmationCode}` : "No PNR"}
          </span>
          {flight.manageLink && (
            <a
              href={flight.manageLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
            >
              Manage <ExternalLink className="h-3 w-3" />
            </a>
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
