import type { Hotel } from "@/lib/dashboard-api";
import { Hotel as HotelIcon, ExternalLink, MapPin, Phone } from "lucide-react";

export function HotelCard({ hotel }: { hotel: Hotel }) {
  const status = (hotel.bookingStatus || "").toUpperCase();
  const address = hotel.address || hotel.fields?.address || "";
  return (
    <div className="rounded-2xl bg-card p-4 shadow-card">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-accent">
          <HotelIcon className="h-4 w-4" />
          <span>{hotel.hotelName || "Hotel"}</span>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
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

      {address && (
        <div className="mb-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{address}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 rounded-xl bg-accent-soft px-3 py-2.5">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Check-in
          </div>
          <div className="mt-0.5 text-sm font-semibold">{hotel.checkInDate || "—"}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Check-out
          </div>
          <div className="mt-0.5 text-sm font-semibold">{hotel.checkOutDate || "—"}</div>
        </div>
      </div>

      {(hotel.confirmationCode || hotel.bookingLink || hotel.mapsLink || hotel.phone) && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs">
          {hotel.confirmationCode && (
            <span className="font-mono text-muted-foreground">{hotel.confirmationCode}</span>
          )}
          {hotel.bookingLink && (
            <a href={hotel.bookingLink} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
              Booking <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {hotel.mapsLink && (
            <a href={hotel.mapsLink} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
              Map <MapPin className="h-3 w-3" />
            </a>
          )}
          {hotel.phone && (
            <a href={`tel:${hotel.phone}`}
              className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
              <Phone className="h-3 w-3" /> {hotel.phone}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
