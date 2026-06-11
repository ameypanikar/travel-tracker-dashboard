import { useMemo, useState } from "react";
import type { Flight, Hotel } from "@/lib/dashboard-api";
import { parseAnyDate, isSameDay, startOfDay, formatTime, formatDayLabel } from "@/lib/date-utils";
import { ChevronLeft, ChevronRight, Plane, Bed } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Props = {
  flights: Flight[];
  hotels: Hotel[];
};

type DayEvents = {
  flights: Flight[];
  hotels: Hotel[];
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toISO = (ddmmyyyy?: string): string => {
  if (!ddmmyyyy) return "";
  const parts = String(ddmmyyyy).split("/");
  if (parts.length !== 3) return "";
  return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
};

const flightIso = (f: unknown): string => toISO((f as Record<string, string>)?.departuredate);
const hotelIso = (h: unknown): string => toISO((h as Record<string, string>)?.checkindate);

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
      const d = parseAnyDate(flightIso(f));
      return d && isSameDay(d, day);
    });
    const ht = hotels.filter((h) => {
      const d = parseAnyDate(hotelIso(h));
      return d && isSameDay(d, day);
    });
    return { flights: fl, hotels: ht };
  };

  const openEvents = openDay ? eventsByDay(openDay) : null;
  const hasAny = (e: DayEvents) => e.flights.length + e.hotels.length > 0;

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
              <div className="mt-auto flex items-center gap-0.5 text-sm leading-none">
                {ev.flights.length > 0 && (
                  <span aria-label="flight">✈️</span>
                )}
                {ev.hotels.length > 0 && (
                  <span aria-label="hotel">🏨</span>
                )}
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
              {openEvents.flights.map((flight) => {
                const f = flight as unknown as Record<string, string>;
                return (
                  <div key={f.confirmationcode || `${f.from}-${f.to}-${f.departuretime}`} className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-sky-600">
                      <Plane className="h-3.5 w-3.5" /> Flight {f.airline}
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {f.from} → {f.to}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTime(f.departuretime)} — {formatTime(f.arrivaltime)}
                    </div>
                    {f.confirmationcode && (
                      <div className="mt-1 text-[11px] text-muted-foreground">Conf: {f.confirmationcode}</div>
                    )}
                  </div>
                );
              })}
              {openEvents.hotels.map((hotel) => {
                const h = hotel as unknown as Record<string, string>;
                return (
                  <div key={h.confirmationcode || h.hotelname} className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                      <Bed className="h-3.5 w-3.5" /> Hotel
                    </div>
                    <div className="mt-1 text-sm font-semibold">{h.hotelname}</div>
                    {h.city && <div className="text-xs text-muted-foreground">{h.city}</div>}
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {h.checkindate} → {h.checkoutdate}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
