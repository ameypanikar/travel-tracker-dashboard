import { useEffect, useState } from "react";
import type { Flight, Document } from "@/lib/dashboard-api";
import { uploadDocument } from "@/lib/dashboard-api";
import { ExternalLink, FileText, Ticket, Upload, Loader2, X } from "lucide-react";
import { formatTime } from "@/lib/date-utils";
import { getSessionUser } from "@/lib/auth";
import { isAssignedToMe } from "@/lib/role-filter";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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
      <ellipse cx="0" cy="0" rx="9" ry="2.5" fill={color} />
      <ellipse cx="9" cy="0" rx="3.5" ry="1.8" fill={color} />
      <polygon points="2,-1 -4,-12 -8,-12 -3,-1" fill={color} />
      <polygon points="2,1 -4,12 -8,12 -3,1" fill={color} />
      <ellipse cx="-3.5" cy="-8" rx="3" ry="1.2" fill={color} />
      <ellipse cx="-3.5" cy="8" rx="3" ry="1.2" fill={color} />
      <polygon points="-7,-1 -12,-5 -12,-2 -7,-1" fill={color} />
      <polygon points="-7,1 -12,5 -12,2 -7,1" fill={color} />
      <ellipse cx="-9" cy="0" rx="2.5" ry="1" fill={color} />
    </g>
  );
}

// Extracts the Drive file ID from our stored "https://drive.google.com/uc?id=XXXX" URL
// and builds an embeddable preview link that works for both images and PDFs.
function toPreviewUrl(fileUrl: string): string {
  try {
    const u = new URL(fileUrl);
    const id = u.searchParams.get("id");
    if (id) return `https://drive.google.com/file/d/${id}/preview`;
  } catch {
    // fall through
  }
  return fileUrl;
}

function DocumentViewerDialog({
  title,
  fileUrl,
  onClose,
}: {
  title: string;
  fileUrl: string;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-bold">{title}</div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <iframe
          src={toPreviewUrl(fileUrl)}
          className="h-[70vh] w-full"
          title={title}
        />
      </DialogContent>
    </Dialog>
  );
}

export function FlightCard({
  flight,
  isPast = false,
  documents = [],
}: {
  flight: Flight;
  isPast?: boolean;
  documents?: Document[];
}) {
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

  const W = 160, H = 48;
  const x0 = 8, y0 = H - 10;
  const x1 = W - 8, y1 = H - 10;
  const cx = W / 2, cy = 6;

  const planePos = bezierPoint(progress, x0, y0, cx, cy, x1, y1);
  const planeAngle = bezierAngle(progress, x0, y0, cx, cy, x1, y1);

  // ── Documents: ticket (shared) + boarding pass (per-person) ──────────────
  const user = getSessionUser();
  const userName = user?.name || "";
  const isMine = isAssignedToMe(f.assignedto, userName);

  const ticketDoc = documents.find(
    (d) => d.type === "flight" && d.category === "ticket" && d.confirmationcode === f.confirmationcode,
  );
  const existingBoardingPass = documents.find(
    (d) =>
      d.type === "flight" &&
      d.category === "boardingpass" &&
      d.confirmationcode === f.confirmationcode &&
      d.passengername.trim().toLowerCase() === userName.trim().toLowerCase(),
  );

  // Locally tracks a just-uploaded boarding pass so the button updates immediately,
  // without needing to wait for the next full data refresh.
  const [localBoardingPassUrl, setLocalBoardingPassUrl] = useState<string | null>(null);
  const boardingPassUrl = localBoardingPassUrl || existingBoardingPass?.fileurl || null;

  const [uploadingPass, setUploadingPass] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [viewerDoc, setViewerDoc] = useState<{ title: string; url: string } | null>(null);

  const handleBoardingPassUpload = async (file: File) => {
    setUploadingPass(true);
    setUploadError("");
    try {
      const url = await uploadDocument({
        type: "flight",
        category: "boardingpass",
        confirmationCode: f.confirmationcode,
        passengerName: userName,
        file,
      });
      setLocalBoardingPassUrl(url);
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploadingPass(false);
    }
  };

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

      {/* Route row */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-2xl font-bold leading-none tracking-tight">{f.from || "—"}</div>
          <div className="mt-1 text-xs text-muted-foreground">{f.cityfrom}</div>
          <div className="mt-2 text-sm font-medium">{formatTime(f.departuretime)}</div>
          <div className="text-[11px] text-muted-foreground">{f.departuredate}</div>
        </div>

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
            <path
              d={`M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}`}
              stroke="#CBD5E1"
              strokeWidth="1.5"
              strokeDasharray="5 4"
              fill="none"
            />
            <circle cx={x0} cy={y0} r="3" fill="#94A3B8" />
            <circle cx={x1} cy={y1} r="3" fill="#94A3B8" />
            <g transform={`translate(${planePos.x}, ${planePos.y}) rotate(${planeAngle}) scale(0.7)`}>
              <PlaneShape color={planeColor} />
            </g>
            {isInFlight && (
              <text x={cx} y={cy - 2} textAnchor="middle" fontSize="9" fill="#3B82F6" fontWeight="600">✈ Flying</text>
            )}
          </svg>
        </div>

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

      {/* Documents row — ticket (shared) + boarding pass (per-person) */}
      {(ticketDoc || isMine) && (
        <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-2">
          {ticketDoc && (
            <button
              onClick={() => setViewerDoc({ title: "Ticket", url: ticketDoc.fileurl })}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent hover:bg-accent/10"
            >
              <FileText className="h-3 w-3" /> View ticket
            </button>
          )}

          {isMine && boardingPassUrl && (
            <button
              onClick={() => setViewerDoc({ title: "My boarding pass", url: boardingPassUrl })}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent hover:bg-accent/10"
            >
              <Ticket className="h-3 w-3" /> View my boarding pass
            </button>
          )}

          {isMine && !boardingPassUrl && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted/80">
              {uploadingPass ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              {uploadingPass ? "Uploading…" : "Upload my boarding pass"}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                disabled={uploadingPass}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleBoardingPassUpload(file);
                }}
              />
            </label>
          )}
        </div>
      )}

      {uploadError && (
        <div className="mt-2 text-[11px] text-destructive">{uploadError}</div>
      )}

      {viewerDoc && (
        <DocumentViewerDialog
          title={viewerDoc.title}
          fileUrl={viewerDoc.url}
          onClose={() => setViewerDoc(null)}
        />
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