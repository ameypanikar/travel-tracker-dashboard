import { useMemo, useState } from "react";
import type { Flight, Hotel, Train, TravelEvent } from "@/lib/dashboard-api";
import { parseAnyDate, isSameDay, startOfDay, formatTime, formatDayLabel } from "@/lib/date-utils";
import { ChevronLeft, ChevronRight, Plane, Hotel as HotelIcon, Bed, TrainFront, CalendarCheck, MapPin, Users, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { cn } from "@/lib/utils";
import { filterByRole } from "@/lib/role-filter";

type Props = {
  flights: Flight[];
  hotels: Hotel[];
  trains?: Train[];
  events?: TravelEvent[];
};

type DayEvents = {
  flights: Flight[];
  hotels: Hotel[];
  trains: Train[];
  events: TravelEvent[];
};

const ROLE_COLORS: Record<string, string> = {
  "Stall Holder": "bg-green-100 text-green-700",
  "Visitor":      "bg-blue-100 text-blue-700",
  "Organiser":    "bg-orange-100 text-orange-700",
  "Sponsor":      "bg-purple-100 text-purple-700",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toISO = (ddmmyyyy?: string): string => {
  if (!ddmmyyyy) return "";
  const parts = String(ddmmyyyy).split("/");
  if (parts.length !== 3) return "";
  return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
};

const flightIso = (f: unknown): string => toISO((f as Record<string, string>)?.departuredate);
const trainIso = (t: unknown): string => toISO((t as Record<string, string>)?.departuredate);

const getAssignees = (r: Record<string, string>): string[] =>
  (r.assignedto || "").split(",").map((s) => s.trim()).filter(Boolean);

export function MonthlyView({
  flights: rawFlights,
  hotels: rawHotels,
  trains: rawTrains = [],
  events = [],
}: Props) {
  const flights = filterByRole(rawFlights as unknown as Record<string, unknown>[]) as unknown as Flight[];
  const hotels = filterByRole(rawHotels as unknown as Record<string, unknown>[]) as unknown as Hotel[];
  const trains = filterByRole(rawTrains as unknown as Record<string, unknown>[]) as unknown as Train[];
  // Events have no assigned_to — never passed through filterByRole or the person filter, always shown.
  const today = startOfDay(new Date());

  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [openDay, setOpenDay] = useState<Date | null>(null);
  const [assignedFilter, setAssignedFilter] = useState<string>("all");

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  // Unique assignee list across flights/hotels/trains (role-filtered already, so this
  // reflects what the current user can see, not the raw sheet).
  const allAssignees = useMemo(() => {
    const set = new Set<string>();
    [...flights, ...hotels, ...trains].forEach((item) => {
      getAssignees(item as unknown as Record<string, string>).forEach((name) => set.add(name));
    });
    return Array.from(set).sort();
  }, [flights, hotels, trains]);

  const personFilter = <T,>(items: T[]): T[] =>
    assignedFilter === "all"
      ? items
      : items.filter((it) =>
          getAssignees(it as unknown as Record<string, string>).includes(assignedFilter),
        );

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
    const fl = personFilter(flights).filter((f) => {
      const d = parseAnyDate(flightIso(f));
      return d && isSameDay(d, day);
    });
    const ht = personFilter(hotels).filter((h) => {
      const startIso = toISO((h as unknown as Record<string, string>)?.checkindate);
      const endIso = toISO((h as unknown as Record<string, string>)?.checkoutdate);
      const start = parseAnyDate(startIso);
      const end = parseAnyDate(endIso) ?? start;
      if (!start) return false;
      const t = startOfDay(day).getTime();
      return t >= startOfDay(start).getTime() && t <= startOfDay(end!).getTime();
    });
    const tr = personFilter(trains).filter((t) => {
      const d = parseAnyDate(trainIso(t));
      return d && isSameDay(d, day);
    });
    // Events store plain YYYY-MM-DD strings, comparable directly via parseAnyDate.
    const ev = events.filter((e) => {
      const start = parseAnyDate(e.startdate);
      const end = parseAnyDate(e.enddate) ?? start;
      if (!start) return false;
      const t = startOfDay(day).getTime();
      return t >= startOfDay(start).getTime() && t <= startOfDay(end!).getTime();
    });
    return { flights: fl, hotels: ht, trains: tr, events: ev };
  };

  const openEvents = openDay ? eventsByDay(openDay) : null;
  const hasAny = (e: DayEvents) => e.flights.length + e.hotels.length + e.trains.length + e.events.length > 0;
  const [filterOpen, setFilterOpen] = useState(false);
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

      {/* Per-user filter — collapsible, applies to flights/hotels/trains only; events always show */}
      {allAssignees.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/10"
          >
            <Users className="h-3.5 w-3.5" />
            {assignedFilter === "all" ? "Filter by person" : `Showing: ${assignedFilter}`}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", filterOpen && "rotate-180")} />
          </button>

          {filterOpen && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                onClick={() => setAssignedFilter("all")}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  assignedFilter === "all"
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent-soft"
                }`}
              >
                All
              </button>
              {allAssignees.map((name) => (
                <button
                  key={name}
                  onClick={() => setAssignedFilter(name)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    assignedFilter === name
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent-soft"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
                "relative flex min-h-[56px] flex-col items-stretch rounded-lg border p-1 text-left transition sm:min-h-[80px]",
                inMonth ? "bg-background" : "bg-muted/30 text-muted-foreground",
                isToday ? "border-accent" : "border-border",
                any ? "cursor-pointer hover:bg-accent-soft" : "cursor-default"
              )}
            >
              {/* Event marker — top-right corner */}
              {ev.events.length > 0 && (
                <CalendarCheck
                  className="absolute right-1 top-1 h-3.5 w-3.5 text-amber-600/70"
                  aria-label="event"
                />
              )}

              <div className={cn("text-[11px] font-semibold", isToday && "text-accent")}>
                {d.getDate()}
              </div>

              {/* Color-coded type icons — bottom row */}
              <div className="mt-auto flex items-center gap-1">
                {ev.flights.length > 0 && (
                  <Plane className="h-4 w-4 text-sky-700/60" aria-label="flight" />
                )}
                {ev.hotels.length > 0 && (
                  <HotelIcon className="h-4 w-4 text-emerald-700/60" aria-label="hotel" />
                )}
                {ev.trains.length > 0 && (
                  <TrainFront className="h-4 w-4 text-foreground/70" aria-label="train" />
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
              {openEvents.events.map((event, idx) => (
                <div key={`${event.eventname}-${idx}`} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-accent">
                      <CalendarCheck className="h-3.5 w-3.5" /> {event.eventname}
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_COLORS[event.ourrole] ?? "bg-muted text-muted-foreground"}`}>
                      {event.ourrole || "—"}
                    </span>
                  </div>
                  {event.location && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {event.location}
                    </div>
                  )}
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {event.startdate} → {event.enddate || event.startdate}
                  </div>
                  {event.type && (
                    <div className="mt-1 text-[11px] text-muted-foreground">📋 {event.type}</div>
                  )}
                  {event.notes && (
                    <div className="mt-1 text-[11px] text-muted-foreground">📝 {event.notes}</div>
                  )}
                </div>
              ))}

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
                    {f.assignedto && (
                      <div className="mt-1 text-[11px] text-muted-foreground">👤 Assigned: {f.assignedto}</div>
                    )}
                  </div>
                );
              })}

              {openEvents.trains.map((train, idx) => {
                const t = train as unknown as Record<string, string>;
                return (
                  <div key={t.pnr || `${t.trainnumber}-${idx}`} className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-accent">
                      <TrainFront className="h-3.5 w-3.5" /> {t.trainname || "Train"}{t.trainnumber ? ` · ${t.trainnumber}` : ""}
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {t.from} → {t.to}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTime(t.departuretime)} — {formatTime(t.arrivaltime)}
                    </div>
                    {t.pnr && (
                      <div className="mt-1 text-[11px] text-muted-foreground">PNR: {t.pnr}</div>
                    )}
                    {t.assignedto && (
                      <div className="mt-1 text-[11px] text-muted-foreground">👤 Assigned: {t.assignedto}</div>
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
                    {h.assignedto && (
                      <div className="mt-1 text-[11px] text-muted-foreground">👤 Assigned: {h.assignedto}</div>
                    )}
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