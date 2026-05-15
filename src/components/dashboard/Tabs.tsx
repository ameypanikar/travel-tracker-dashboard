import { Plane, Hotel, Sun, Car } from "lucide-react";

export type TabKey = "flights" | "hotels" | "day" | "uber";

const TABS: { key: TabKey; label: string; icon: typeof Plane }[] = [
  { key: "flights", label: "Flights", icon: Plane },
  { key: "hotels", label: "Hotels", icon: Hotel },
  { key: "day", label: "Itinerary", icon: Sun },
  { key: "uber", label: "Uber", icon: Car },
];

type Props = {
  value: TabKey;
  onChange: (v: TabKey) => void;
};

export function Tabs({ value, onChange }: Props) {
  return (
    <div className="mb-3 grid grid-cols-4 gap-2">
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = value === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2.5 text-[11px] font-bold transition ${
              active
                ? "bg-accent text-accent-foreground shadow-card"
                : "bg-card text-accent shadow-card hover:bg-accent-soft"
            }`}
          >
            <Icon className="h-[18px] w-[18px]" />
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
