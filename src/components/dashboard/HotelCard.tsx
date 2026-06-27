import { useState } from "react";
import type { Hotel, Document } from "@/lib/dashboard-api";
import { uploadDocument } from "@/lib/dashboard-api";
import { Hotel as HotelIcon, ExternalLink, MapPin, DoorOpen, FileText, Upload, Loader2, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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

export function HotelCard({
  hotel,
  isPast = false,
  documents = [],
}: {
  hotel: Hotel;
  isPast?: boolean;
  documents?: Document[];
}) {
  const h = hotel as unknown as Record<string, string>;
  const status = (h.bookingstatus || "").toUpperCase();

  const roomAssignmentsRaw = h.roomassignments || "";
  const roomList = roomAssignmentsRaw
    ? roomAssignmentsRaw.split(",").map((r) => r.trim()).filter(Boolean)
    : [];
  const numRooms = h.numberofrooms ? parseInt(h.numberofrooms, 10) : roomList.length || null;

  const existingConfirmationDoc = documents.find(
    (d) => d.type === "hotel" && d.category === "confirmation" && d.confirmationcode === h.confirmationcode,
  );

  // Locally tracks a just-uploaded file so the button updates immediately,
  // without needing to wait for the next full data refresh.
  const [localFileUrl, setLocalFileUrl] = useState<string | null>(null);
  const fileUrl = localFileUrl || existingConfirmationDoc?.fileurl || null;

  const [viewerOpen, setViewerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleUpload = async (file: File) => {
    if (!h.confirmationcode) {
      setUploadError("This hotel has no confirmation code yet — can't attach a document.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const url = await uploadDocument({
        type: "hotel",
        category: "confirmation",
        confirmationCode: h.confirmationcode,
        file,
      });
      setLocalFileUrl(url);
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
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
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-accent">
          <HotelIcon className="h-4 w-4" />
          <span>{h.hotelname || "Hotel"}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {numRooms && (
            <span className="flex items-center gap-0.5 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">
              <DoorOpen className="h-3 w-3" />
              {numRooms} {numRooms === 1 ? "room" : "rooms"}
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              status === "BOOKED"
                ? "bg-success-soft text-success"
                : status === "PENDING"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {status || "—"}
          </span>
        </div>
      </div>

      {h.city && (
        <div className="mb-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{h.city}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 rounded-xl bg-accent-soft px-3 py-2.5">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Check-in
          </div>
          <div className="mt-0.5 text-sm font-semibold">{h.checkindate || "—"}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Check-out
          </div>
          <div className="mt-0.5 text-sm font-semibold">{h.checkoutdate || "—"}</div>
        </div>
      </div>

      {roomList.length > 0 && (
        <div className="mt-3 rounded-xl border border-border bg-muted/30 px-3 py-2">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Room Assignments
          </div>
          <div className="space-y-0.5">
            {roomList.map((r, i) => {
              const parts = r.split(/[-–→]+/).map((p) => p.trim());
              return (
                <div key={i} className="flex items-center gap-1 text-xs">
                  {parts.length === 2 ? (
                    <>
                      <span className="font-medium">{parts[0]}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-mono font-semibold text-accent">Room {parts[1]}</span>
                    </>
                  ) : (
                    <span>{r}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(h.confirmationcode || h.bookedprice || h.googlemapslink || h.assignedto) && (
        <div className="mt-3 space-y-1 border-t border-border pt-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {h.confirmationcode && (
              <span className="font-mono text-muted-foreground">{h.confirmationcode}</span>
            )}
            {h.bookedprice && <span className="font-semibold">{h.bookedprice}</span>}
            {h.googlemapslink && (
              <a
                href={h.googlemapslink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
              >
                Map <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {h.assignedto && (
            <div className="text-[11px] text-muted-foreground">👤 {h.assignedto}</div>
          )}
        </div>
      )}

      {/* Document row — view if one exists, otherwise offer to attach one */}
      <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-2">
        {fileUrl ? (
          <button
            onClick={() => setViewerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent hover:bg-accent/10"
          >
            <FileText className="h-3 w-3" /> View booking confirmation
          </button>
        ) : (
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted/80">
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            {uploading ? "Uploading…" : "Attach confirmation PDF"}
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
          </label>
        )}
      </div>

      {uploadError && (
        <div className="mt-1.5 text-[11px] text-destructive">{uploadError}</div>
      )}

      {viewerOpen && fileUrl && (
        <DocumentViewerDialog
          title="Booking confirmation"
          fileUrl={fileUrl}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  );
}