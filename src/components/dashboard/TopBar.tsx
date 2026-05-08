import { RefreshCw } from "lucide-react";

type Props = {
  onRefresh: () => void;
  isFetching: boolean;
  updatedAt: Date | null;
};

export function TopBar({ onRefresh, isFetching, updatedAt }: Props) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-[28px] font-bold leading-none tracking-tight text-accent">
          Travel Dashboard
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Flights, hotels & what's next
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={onRefresh}
          disabled={isFetching}
          aria-label="Refresh"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-accent shadow-card transition hover:bg-accent-soft disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
        <span className="text-[10px] leading-none text-muted-foreground">
          {updatedAt ? `Synced ${updatedAt.toLocaleTimeString()}` : "—"}
        </span>
      </div>
    </div>
  );
}
