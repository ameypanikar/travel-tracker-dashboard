import { Clock, Sun, Plane, Hotel } from "lucide-react";

export type TabKey = "pending" | "day" | "flights" | "hotels";

const TABS: { key: TabKey; label: string; icon: typeof Clock }[] = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "day", label: "Day View", icon: Sun },
  { key: "flights", label: "Flights", icon: Plane },
  { key: "hotels", label: "Hotels", icon: Hotel },
];

type Props = {
  value: TabKey;
  onChange: (v: TabKey) => void;
  pendingCount: number;
};

export function Tabs({ value, onChange, pendingCount }: Props) {
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
            {t.key === "pending" && pendingCount > 0 && (
              <span
                className={`absolute right-2 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  active ? "bg-accent-foreground text-accent" : "bg-destructive text-destructive-foreground"
                }`}
              >
                {pendingCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
