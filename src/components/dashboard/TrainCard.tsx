import { useEffect, useState } from "react";
import { formatTime } from "@/lib/date-utils";

export type Train = Record<string, string>;

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

// Classic steam locomotive — side view facing right
function SteamLoco({ color }: { color: string }) {
  const dark = color === "#CBD5E1" ? "#A0AEC0" : color === "#94A3B8" ? "#718096" : "#1E40AF";
  return (
    <g>
      {/* Main boiler body */}
      <rect x="-14" y="-7" width="22" height="11" rx="2" fill={color} />
      {/* Boiler dome */}
      <ellipse cx="-4" cy="-7" rx="4" ry="3" fill={color} />
      {/* Chimney stack */}
      <rect x="-11" y="-14" width="5" height="8" rx="1" fill={color} />
      {/* Chimney flare top */}
      <rect x="-13" y="-15" width="9" height="3" rx="1" fill={color} />
      {/* Smoke puffs */}
      <circle cx="-9" cy="-18" r="3" fill={color} opacity="0.5" />
      <circle cx="-5" cy="-21" r="2.5" fill={color} opacity="0.35" />
      <circle cx="-1" cy="-23" r="2" fill={color} opacity="0.2" />
      {/* Cab */}
      <rect x="6" y="-10" width="12" height="14" rx="1" fill={color} />
      {/* Cab window */}
      <rect x="8" y="-8" width="7" height="5" rx="1" fill="white" opacity="0.85" />
      {/* Footplate/undercarriage */}
      <rect x="-16" y="4" width="34" height="3" rx="1" fill={dark} />
      {/* Cowcatcher front */}
      <polygon points="-14,4 -20,8 -14,7" fill={dark} />
      {/* Drive wheels (large) */}
      <circle cx="-4" cy="10" r="6" fill={dark} />
      <circle cx="-4" cy="10" r="3.5" fill={color} />
      <circle cx="-4" cy="10" r="1.2" fill={dark} />
      {/* Drive wheel spokes */}
      <line x1="-4" y1="4" x2="-4" y2="16" stroke={dark} strokeWidth="0.8" />
      <line x1="-10" y1="10" x2="2" y2="10" stroke={dark} strokeWidth="0.8" />
      {/* Small front wheels */}
      <circle cx="-14" cy="10" r="3.5" fill={dark} />
      <circle cx="-14" cy="10" r="1.8" fill={color} />
      {/* Rear wheels */}
      <circle cx="9" cy="10" r="4" fill={dark} />
      <circle cx="9" cy="10" r="2" fill={color} />
      <circle cx="16" cy="10" r="3.5" fill={dark} />
      <circle cx="16" cy="10" r="1.8" fill={color} />
      {/* Connecting rod */}
      <line x1="-4" y1="6" x2="9" y2="6" stroke={dark} strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toUpperCase();
  let label = s || "—";
  let cls = "bg-muted text-muted-foreground";
  if (s === "CNF") { label = "CONFIRMED"; cls = "bg-success-soft text-success"; }
  else if (s === "RAC") { label = "RAC"; cls = "bg-orange-100 text-orange-700"; }
  else if (["WL", "PQWL", "RQWL", "GNWL"].includes(s)) { label = "WAITLIST"; cls = "bg-destructive/10 text-destructive"; }
  else if (s === "CAN") { label = "CANCELLED"; cls = "bg-muted text-muted-foreground"; }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}

export function TrainCard({ train }: { train: Train }) {
  const t = train;
  const depDate = parseDateTime(t.departuredate, t.departuretime);
  const arrDate = parseDateTime(t.arrivaldate, t.arrivaltime);
  const [progress, setProgress] = useState(() => getProgress(depDate, arrDate));

  useEffect(() => {
    if (!depDate || !arrDate) return;
    const now = Date.now();
    if (now < depDate.getTime() || now > arrDate.getTime()) return;
    const interval = setInterval(() => setProgress(getProgress(depDate, arrDate)), 30_000);
    return () => clearInterval(interval);
  }, [t.departuredate, t.departuretime, t.arrivaldate, t.arrivaltime]);

  const isInJourney = !!(depDate && arrDate && Date.now() >= depDate.getTime() && Date.now() <= arrDate.getTime());
  const hasArrived = !!(arrDate && Date.now() > arrDate.getTime());
  const locoColor = isInJourney ? "#3B82F6" : hasArrived ? "#94A3B8" : "#CBD5E1";

  // SVG track — same middle column as flight arc
  const W = 160, H = 52;
  const x0 = 8, xEnd = W - 8, y = H - 14;
  const locoX = x0 + progress * (xEnd - x0);
  const sleepers = Array.from({ length: 8 }, (_, i) => x0 + ((xEnd - x0) / 9) * (i + 1));

  return (
    <div className="rounded-2xl bg-card p-4 shadow-card">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-accent">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 15.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V5c0-3.5-3.58-4-8-4s-8 .5-8 4v10.5zm8 1.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6-7H6V5h12v5z"/>
          </svg>
          <span>{t.trainname || "Train"}{t.trainnumber ? ` · ${t.trainnumber}` : ""}</span>
        </div>
        <StatusBadge status={t.bookingstatus} />
      </div>

      {/* Route row — same 3-column layout as flight */}
      <div className="flex items-center gap-3">
        {/* Departure */}
        <div className="flex-1">
          <div className="text-2xl font-bold leading-none tracking-tight">{t.from || "—"}</div>
          <div className="mt-1 text-xs text-muted-foreground">{t.cityfrom}</div>
          <div className="mt-2 text-sm font-medium">{formatTime(t.departuretime)}</div>
          <div className="text-[11px] text-muted-foreground">{t.departuredate}</div>
        </div>

        {/* Track in middle */}
        <div className="flex flex-col items-center" style={{ minWidth: 80 }}>
          <svg
            width="100%"
            viewBox={`0 0 ${W} ${H}`}
            style={{ minWidth: 80, maxWidth: 160 }}
            aria-hidden="true"
            overflow="visible"
          >
            {/* Rails */}
            <line x1={x0} y1={y - 3} x2={xEnd} y2={y - 3} stroke="#CBD5E1" strokeWidth="1.5" />
            <line x1={x0} y1={y + 3} x2={xEnd} y2={y + 3} stroke="#CBD5E1" strokeWidth="1.5" />
            {/* Sleepers */}
            {sleepers.map((sx, i) => (
              <line key={i} x1={sx} y1={y - 6} x2={sx} y2={y + 6} stroke="#CBD5E1" strokeWidth="2" />
            ))}
            {/* Station dots */}
            <circle cx={x0} cy={y} r="3.5" fill="#94A3B8" />
            <circle cx={xEnd} cy={y} r="3.5" fill="#94A3B8" />

            {/* Steam loco — scale(-1,1) mirrors it to face right (direction of travel) */}
            <g transform={`translate(${locoX}, ${y - 2}) scale(-0.55, 0.55)`}>
              <SteamLoco color={locoColor} />
            </g>

            {/* Status labels — only en route shown as text, arrived shown by grey */}
            {isInJourney && (
              <text x={W / 2} y="10" textAnchor="middle" fontSize="9" fill="#3B82F6" fontWeight="600">En Route</text>
            )}
          </svg>
        </div>

        {/* Arrival */}
        <div className="flex-1 text-right">
          <div className="text-2xl font-bold leading-none tracking-tight">{t.to || "—"}</div>
          <div className="mt-1 text-xs text-muted-foreground">{t.cityto}</div>
          <div className="mt-2 text-sm font-medium">{formatTime(t.arrivaltime)}</div>
          <div className="text-[11px] text-muted-foreground">{t.arrivaldate}</div>
        </div>
      </div>

      {(t.pnr || t.assignedto) && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
          <span className="font-mono text-muted-foreground">{t.pnr ? `PNR  ${t.pnr}` : "No PNR"}</span>
          {t.assignedto && (
            <span className="text-[11px] text-muted-foreground">👤 {t.assignedto}</span>
          )}
        </div>
      )}
    </div>
  );
}