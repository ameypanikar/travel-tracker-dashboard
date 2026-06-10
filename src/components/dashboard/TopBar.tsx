import { LogOut, RefreshCw } from "lucide-react";
import type { SessionUser } from "@/lib/auth";

type Props = {
  onRefresh: () => void;
  isFetching: boolean;
  updatedAt: Date | null;
  user?: SessionUser | null;
  onLogout?: () => void;
};

export function TopBar({ onRefresh, isFetching, updatedAt, user, onLogout }: Props) {
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
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isFetching}
            aria-label="Refresh"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-accent shadow-card transition hover:bg-accent-soft disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          {user && onLogout && (
            <button
              onClick={onLogout}
              aria-label="Logout"
              title="Logout"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-accent shadow-card transition hover:bg-accent-soft"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
        {user && (
          <span className="text-[11px] font-medium leading-none text-foreground">
            {user.name} · {user.role}
          </span>
        )}
        <span className="text-[10px] leading-none text-muted-foreground">
          {updatedAt ? `Synced ${updatedAt.toLocaleTimeString()}` : "—"}
        </span>
      </div>
    </div>
  );
}
