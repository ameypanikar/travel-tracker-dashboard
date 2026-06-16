import { LogOut, RefreshCw, Settings, KeyRound } from "lucide-react";
import { useState } from "react";
import type { SessionUser } from "@/lib/auth";
import { SettingsModal } from "./SettingsModal";
import { ChangePasswordModal } from "../auth/ChangePasswordModal";

type Props = {
  onRefresh: () => void;
  isFetching: boolean;
  updatedAt: Date | null;
  user?: SessionUser | null;
  onLogout?: () => void;
  allUsers?: { name: string; username: string; role: string }[];
};

export function TopBar({ onRefresh, isFetching, updatedAt, user, onLogout, allUsers = [] }: Props) {
  const [showSettings, setShowSettings] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
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

            {user && (
              <button
                onClick={() => setShowPassword(true)}
                aria-label="Change password"
                title="Change password"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-accent shadow-card transition hover:bg-accent-soft"
              >
                <KeyRound className="h-4 w-4" />
              </button>
            )}

            {user && (
              <button
                onClick={() => setShowSettings(true)}
                aria-label="Settings"
                title="Settings"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-accent shadow-card transition hover:bg-accent-soft"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}

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

      {showSettings && user && (
        <SettingsModal user={user} onClose={() => setShowSettings(false)} />
      )}

      {showPassword && user && (
        <ChangePasswordModal
          user={user}
          allUsers={allUsers}
          onClose={() => setShowPassword(false)}
        />
      )}
    </>
  );
}