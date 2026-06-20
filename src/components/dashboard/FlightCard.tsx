import { useEffect, useState } from "react";
import type { Flight } from "@/lib/dashboard-api";
import { ExternalLink } from "lucide-react";
import { formatTime } from "@/lib/date-utils";

function parseDateTime(date: string, time: string): Date | null {
  if (!date || !time) return null;
  const dp = date.split("/");
  if (dp.length !== 3) return null;
  const [dd, mm, yyyy] = dp;
  const [hh, mn] = time.split(":");
  return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd), parseInt(hh || "0"), parseInt(mn || "0"), 0);
}

function getProgress(dep: Date | null, arr: Date | null): number {
  if (!dep || !arr) return 0;
  const total = arr.getTime() - dep.getTime();
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, (Date.now() - dep.getTime()) / total));
}

function bezierPoint(t: number, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number) {
  const mt = 1 - t;
  return {
    x: mt * mt * x0 + 2 * mt * t * cx + t * t * x1,
    y: mt * mt * y0 + 2 * mt * t * cy + t * t * y1,
  };
}

function bezierAngle(t: number, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number) {
  const mt = 1 - t;
  const tx = 2 * mt * (cx - x0) + 2 * t * (x1 - cx);
  const ty = 2 * mt * (cy - y0) + 2 * t * (y1 - cy);
  return (Math.atan2(ty, tx) * 180) / Math.PI;
}

// Top-down commercial aircraft SVG path (nose pointing right →)
function PlaneShape({ color }: { color: string }) {
  return (
    <g>
      {/* Fuselage */}
      <ellipse cx="0" cy="0" rx="9" ry="2.5" fill={color} />
      {/* Nose cone */}
      <ellipse cx="9" cy="0" rx="3.5" ry="1.8" fill={color} />
      {/* Main wings — swept back */}
      <polygon points="2,-1 -4,-12 -8,-12 -3,-1" fill={color} />
      <polygon points="2,1 -4,12 -8,12 -3,1" fill={color} />
      {/* Engine pods on wings */}
      <ellipse cx="-3.5" cy="-8" rx="3" ry="1.2" fill={color} />
      <ellipse cx="-3.5" cy="8" rx="3" ry="1.2" fill={color} />
      {/* Tail fins */}
      <polygon points="-7,-1 -12,-5 -12,-2 -7,-1" fill={color} />
      <polygon points="-7,1 -12,5 -12,2 -7,1" fill={color} />
      {/* Tail vertical fin */}
      <ellipse cx="-9" cy="0" rx="2.5" ry="1" fill={color} />
    </g>
  );
}

export function FlightCard({ flight, isPast = false }: { flight: Flight; isPast?: boolean }) {
  const f = flight as unknown as Record<string, string>;
  const status = (f.bookingstatus || "").toUpperCase();
  const depDate = parseDateTime(f.departuredate, f.departuretime);
  const arrDate = parseDateTime(f.arrivaldate, f.arrivaltime);
  const [progress, setProgress] = useState(() => getProgress(depDate, arrDate));

  useEffect(() => {
    if (!depDate || !arrDate) return;
    const now = Date.now();
    if (now < depDate.getTime() || now > arrDate.getTime()) return;
    const interval = setInterval(() => setProgress(getProgress(depDate, arrDate)), 30_000);
    return () => clearInterval(interval);
  }, [f.departuredate, f.departuretime, f.arrivaldate, f.arrivaltime]);

  const isInFlight = !!(depDate && arrDate && Date.now() >= depDate.getTime() && Date.now() <= arrDate.getTime());
  const hasLanded = !!(arrDate && Date.now() > arrDate.getTime());
  const planeColor = isInFlight ? "#3B82F6" : hasLanded ? "#94A3B8" : "#CBD5E1";

  // SVG arc — same proportions as original card middle section
  const W = 160, H = 48;
  const x0 = 8, y0 = H - 10;
  const x1 = W - 8, y1 = H - 10;
  const cx = W / 2, cy = 6;

  const planePos = bezierPoint(progress, x0, y0, cx, cy, x1, y1);
  const planeAngle = bezierAngle(progress, x0, y0, cx, cy, x1, y1);

  return (
    <div
      className={`relative rounded-2xl bg-card p-4 shadow-card transition ${
        isPast ? "opacity-60 grayscale saturate-50" : ""
      }`}
    >
      {isPast && (
        <span className="absolute right-3 top-3 z-10 rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
          Past
        </span>
      )}
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-accent">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
          <span>{f.airline || "Flight"}</span>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Route row — same layout as original */}
      <div className="flex items-center gap-3">
        {/* Departure */}
        <div className="flex-1">
          <div className="text-2xl font-bold leading-none tracking-tight">{f.from || "—"}</div>
          <div className="mt-1 text-xs text-muted-foreground">{f.cityfrom}</div>
          <div className="mt-2 text-sm font-medium">{formatTime(f.departuretime)}</div>
          <div className="text-[11px] text-muted-foreground">{f.departuredate}</div>
        </div>

        {/* Arc in the middle */}
        <div className="flex flex-col items-center" style={{ minWidth: 80 }}>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
            {f.duration || ""}
          </div>
          <svg
            width="100%"
            viewBox={`0 0 ${W} ${H}`}
            style={{ minWidth: 80, maxWidth: 160 }}
            aria-hidden="true"
            overflow="visible"
          >
            {/* Dashed arc */}
            <path
              d={`M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}`}
              stroke="#CBD5E1"
              strokeWidth="1.5"
              strokeDasharray="5 4"
              fill="none"
            />
            {/* Station dots */}
            <circle cx={x0} cy={y0} r="3" fill="#94A3B8" />
            <circle cx={x1} cy={y1} r="3" fill="#94A3B8" />

            {/* Plane — scaled down, anchor at center, rotated along arc tangent */}
            <g transform={`translate(${planePos.x}, ${planePos.y}) rotate(${planeAngle}) scale(0.7)`}>
              <PlaneShape color={planeColor} />
            </g>

            {/* Status label — only for in-flight, landed shown by grey color */}
            {isInFlight && (
              <text x={cx} y={cy - 2} textAnchor="middle" fontSize="9" fill="#3B82F6" fontWeight="600">✈ Flying</text>
            )}
          </svg>
        </div>

        {/* Arrival */}
        <div className="flex-1 text-right">
          <div className="text-2xl font-bold leading-none tracking-tight">{f.to || "—"}</div>
          <div className="mt-1 text-xs text-muted-foreground">{f.cityto}</div>
          <div className="mt-2 text-sm font-medium">{formatTime(f.arrivaltime)}</div>
          <div className="text-[11px] text-muted-foreground">{f.arrivaldate}</div>
        </div>
      </div>

      {/* Footer */}
      {(f.confirmationcode || f.managelink || f.assignedto) && (
        <div className="mt-3 space-y-1 border-t border-border pt-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-muted-foreground">
              {f.confirmationcode ? `PNR  ${f.confirmationcode}` : "No PNR"}
            </span>
            {f.managelink && (
              <a href={f.managelink} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
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
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
      status === "BOOKED" ? "bg-success-soft text-success"
        : status === "PENDING" ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground"
    }`}>
      {status || "—"}
    </span>
  );
}