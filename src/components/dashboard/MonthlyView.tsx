import { useMemo, useState } from "react";
import type { Flight, Hotel } from "@/lib/dashboard-api";
import { parseAnyDate, isSameDay, startOfDay, isWithinRange, formatTime, formatDayLabel } from "@/lib/date-utils";
import { ChevronLeft, ChevronRight, Plane, Bed } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Props = {
  flights: Flight[];
  hotels: Hotel[];
};

type DayEvents = {
  flights: Flight[];
  checkIns: Hotel[];
  checkOuts: Hotel[];
  stays: Hotel[];
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MonthlyView({ flights, hotels }: Props) {
  const today = startOfDay(new Date());
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [openDay, setOpenDay] = useState<Date | null>(null);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = first.getDay();
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startOffset);
    const out: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      out.push(startOfDay(d));
    }
    return out;
  }, [cursor]);

  const eventsByDay = (day: Date): DayEvents => {
    const fl = flights.filter((f) => {
      const d = parseAnyDate(f.departureIso || f.departureDate);
      return d && isSameDay(d, day);
    });
    const checkIns: Hotel[] = [];
    const checkOuts: Hotel[] = [];
    const stays: Hotel[] = [];
    for (const h of hotels) {
      const ci = parseAnyDate(h.checkInIso || h.checkInDate);
      const co = parseAnyDate(h.checkOutIso || h.checkOutDate);
      if (ci && isSameDay(ci, day)) checkIns.push(h);
      else if (co && isSameDay(co, day)) checkOuts.push(h);
      else if (ci && co && isWithinRange(day, ci, co)) stays.push(h);
    }
    return { flights: fl, checkIns, checkOuts, stays };
  };

  const openEvents = openDay ? eventsByDay(openDay) : null;
  const hasAny = (e: DayEvents) => e.flights.length + e.checkIns.length + e.checkOuts.length + e.stays.length > 0;

  return (
    <div className="rounded-2xl bg-card p-3 shadow-card sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="rounded-lg p-2 hover:bg-accent-soft"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-bold">{monthLabel}</div>
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="rounded-lg p-2 hover:bg-accent-soft"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = isSameDay(d, today);
          const ev = eventsByDay(d);
          const any = hasAny(ev);
          return (
            <button
              key={i}
              onClick={() => any && setOpenDay(d)}
              disabled={!any}
              className={cn(
                "flex min-h-[56px] flex-col items-stretch rounded-lg border p-1 text-left transition sm:min-h-[80px]",
                inMonth ? "bg-background" : "bg-muted/30 text-muted-foreground",
                isToday ? "border-accent" : "border-border",
                any ? "cursor-pointer hover:bg-accent-soft" : "cursor-default"
              )}
            >
              <div className={cn("text-[11px] font-semibold", isToday && "text-accent")}>
                {d.getDate()}
              </div>
              <div className="mt-auto flex flex-wrap gap-0.5">
                {ev.flights.slice(0, 2).map((_, idx) => (
                  <span key={`f${idx}`} className="inline-flex h-4 items-center gap-0.5 rounded bg-sky-500/15 px-1 text-[9px] text-sky-700 dark:text-sky-300">
                    <Plane className="h-2.5 w-2.5" />
                  </span>
                ))}
                {[...ev.checkIns, ...ev.checkOuts, ...ev.stays].slice(0, 2).map((_, idx) => (
                  <span key={`h${idx}`} className="inline-flex h-4 items-center gap-0.5 rounded bg-emerald-500/15 px-1 text-[9px] text-emerald-700 dark:text-emerald-300">
                    <Bed className="h-2.5 w-2.5" />
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <Dialog open={!!openDay} onOpenChange={(o) => !o && setOpenDay(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{openDay ? formatDayLabel(openDay) : ""}</DialogTitle>
          </DialogHeader>
          {openEvents && (
            <div className="space-y-3">
              {openEvents.flights.map((f, i) => (
                <div key={`f${i}`} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-600">
                    <Plane className="h-3.5 w-3.5" /> Flight {f.airline}
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    {f.fromCode} → {f.toCode}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTime(f.departureTime)} — {formatTime(f.arrivalTime)}
                  </div>
                  {f.confirmationCode && (
                    <div className="mt-1 text-[11px] text-muted-foreground">Conf: {f.confirmationCode}</div>
                  )}
                </div>
              ))}
              {openEvents.checkIns.map((h, i) => (
                <HotelRow key={`ci${i}`} hotel={h} label="Check-in" />
              ))}
              {openEvents.checkOuts.map((h, i) => (
                <HotelRow key={`co${i}`} hotel={h} label="Check-out" />
              ))}
              {openEvents.stays.map((h, i) => (
                <HotelRow key={`st${i}`} hotel={h} label="Staying" />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HotelRow({ hotel, label }: { hotel: Hotel; label: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
        <Bed className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{hotel.hotelName}</div>
      {hotel.address && (
        <div className="text-xs text-muted-foreground">{hotel.address}</div>
      )}
      <div className="mt-1 text-[11px] text-muted-foreground">
        {hotel.checkInDate} → {hotel.checkOutDate}
      </div>
    </div>
  );
}
