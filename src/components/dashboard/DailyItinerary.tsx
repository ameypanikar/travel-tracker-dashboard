import { useMemo, useState } from "react";
import type { Flight, Hotel } from "@/lib/dashboard-api";
import {
  parseAnyDate,
  startOfDay,
  isSameDay,
  addDays,
  formatDayLabel,
  isWithinRange,
  formatTime,
} from "@/lib/date-utils";
import { FlightCard } from "./FlightCard";
import { HotelCard } from "./HotelCard";
import { EmptyState } from "./EmptyState";
import { Calendar, ArrowUp, ChevronRight, Plane, Bed } from "lucide-react";

type Props = { flights: Flight[]; hotels: Hotel[] };

type TimelineItem =
  | { kind: "flight"; time: number; label: string; flight: Flight }
  | {
      kind: "hotel-checkin" | "hotel-checkout" | "hotel-stay";
      time: number;
      label: string;
      hotel: Hotel;
    };

export function DailyItinerary({ flights, hotels }: Props) {
  const allDates = useMemo(() => {
    const ds: Date[] = [];
    flights.forEach((f) => {
      const d = parseAnyDate(f.departureIso || f.departureDate);
      if (d) ds.push(startOfDay(d));
    });
    hotels.forEach((h) => {
      const ci = parseAnyDate(h.checkInIso || h.checkInDate);
      const co = parseAnyDate(h.checkOutIso || h.checkOutDate);
      if (ci) ds.push(startOfDay(ci));
      if (co) ds.push(startOfDay(co));
    });
    return ds.sort((a, b) => a.getTime() - b.getTime());
  }, [flights, hotels]);

  const tripStart = allDates[0] ?? startOfDay(new Date());
  const tripEnd = allDates[allDates.length - 1] ?? startOfDay(new Date());

  const today = startOfDay(new Date());
  const initialDay = isWithinRange(today, tripStart, tripEnd) ? today : tripStart;
  const [selected, setSelected] = useState<Date>(initialDay);

  const stripStart = addDays(selected, -3);
  const strip = Array.from({ length: 14 }, (_, i) => addDays(stripStart, i));

  const items: TimelineItem[] = useMemo(() => {
    const out: TimelineItem[] = [];
    flights.forEach((f) => {
      const d = parseAnyDate(f.departureIso || f.departureDate);
      if (d && isSameDay(d, selected)) {
        out.push({
          kind: "flight",
          time: d.getTime(),
          label: formatTime(f.departureTime) || "Flight",
          flight: f,
        });
      }
    });
    hotels.forEach((h) => {
      const ci = parseAnyDate(h.checkInIso || h.checkInDate);
      const co = parseAnyDate(h.checkOutIso || h.checkOutDate);
      if (!ci) return;
      const end = co ?? ci;
      if (isSameDay(ci, selected)) {
        out.push({
          kind: "hotel-checkin",
          time: startOfDay(selected).getTime() + 14 * 60 * 60 * 1000,
          label: "Check-in",
          hotel: h,
        });
      } else if (co && isSameDay(co, selected)) {
        out.push({
          kind: "hotel-checkout",
          time: startOfDay(selected).getTime() + 11 * 60 * 60 * 1000,
          label: "Check-out",
          hotel: h,
        });
      } else if (
        startOfDay(selected).getTime() > startOfDay(ci).getTime() &&
        startOfDay(selected).getTime() < startOfDay(end).getTime()
      ) {
        out.push({
          kind: "hotel-stay",
          time: startOfDay(selected).getTime(),
          label: "Staying at",
          hotel: h,
        });
      }
    });
    return out.sort((a, b) => a.time - b.time);
  }, [flights, hotels, selected]);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-card p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-base font-bold text-foreground">
              {formatDayLabel(selected)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {items.length} event{items.length === 1 ? "" : "s"} today
            </div>
          </div>
        </div>

        <div className="-mx-4 overflow-x-auto px-4 pb-1">
          <div className="flex gap-2">
            {strip.map((d) => {
              const active = isSameDay(d, selected);
              const isToday = isSameDay(d, today);
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelected(d)}
                  className={`flex w-12 shrink-0 flex-col items-center rounded-2xl px-1 py-2 text-[10px] font-bold uppercase transition ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "bg-accent-soft text-accent hover:bg-accent/10"
                  }`}
                >
                  <span className="opacity-70">
                    {d.toLocaleDateString(undefined, { weekday: "short" })}
                  </span>
                  <span className="text-base font-extrabold leading-none">
                    {d.getDate()}
                  </span>
                  <span className="opacity-70">
                    {d.toLocaleDateString(undefined, { month: "short" })}
                  </span>
                  {isToday && !active && (
                    <span className="mt-0.5 h-1 w-1 rounded-full bg-accent" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <QuickBtn
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="Today"
            onClick={() => setSelected(today)}
          />
          <QuickBtn
            icon={<ArrowUp className="h-3.5 w-3.5" />}
            label="Trip Start"
            onClick={() => setSelected(tripStart)}
          />
          <QuickBtn
            icon={<ChevronRight className="h-3.5 w-3.5" />}
            label="Next Week"
            onClick={() => setSelected(addDays(selected, 7))}
          />
          <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent">
            <Calendar className="h-3.5 w-3.5" /> Pick date
            <input
              type="date"
              className="sr-only"
              onChange={(e) => {
                const d = parseAnyDate(e.target.value);
                if (d) setSelected(startOfDay(d));
              }}
            />
          </label>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Nothing on this day"
          message="No flights or hotel stays scheduled."
        />
      ) : (
        <ol className="relative ml-3 border-l-2 border-dashed border-accent-soft pl-5">
          {items.map((it, i) => (
            <li key={i} className="relative mb-4 last:mb-0">
              <span className="absolute -left-[34px] top-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-card">
                {it.kind === "flight" ? (
                  <Plane className="h-3.5 w-3.5" />
                ) : (
                  <Bed className="h-3.5 w-3.5" />
                )}
              </span>
              <div className="mb-1.5 flex items-baseline gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>{it.label}</span>
              </div>
              {it.kind === "flight" ? (
                <FlightCard flight={it.flight} />
              ) : (
                <HotelCard hotel={it.hotel} />
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function QuickBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/10"
    >
      {icon}
      {label}
    </button>
  );
}
