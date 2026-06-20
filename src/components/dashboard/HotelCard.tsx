import type { Hotel } from "@/lib/dashboard-api";
import { Hotel as HotelIcon, ExternalLink, MapPin, DoorOpen } from "lucide-react";

export function HotelCard({ hotel, isPast = false }: { hotel: Hotel; isPast?: boolean }) {
  const h = hotel as unknown as Record<string, string>;
  const status = (h.bookingstatus || "").toUpperCase();

  // Parse room assignments: "Rajesh K - 101, Mrunal K - 102"
  const roomAssignmentsRaw = h.roomassignments || "";
  const roomList = roomAssignmentsRaw
    ? roomAssignmentsRaw.split(",").map((r) => r.trim()).filter(Boolean)
    : [];
  const numRooms = h.numberofrooms ? parseInt(h.numberofrooms, 10) : roomList.length || null;

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

      {/* Room assignments breakdown */}
      {roomList.length > 0 && (
        <div className="mt-3 rounded-xl border border-border bg-muted/30 px-3 py-2">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Room Assignments
          </div>
          <div className="space-y-0.5">
            {roomList.map((r, i) => {
              // Try to split "Person - RoomNum" or "Person → RoomNum"
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
    </div>
  );
}