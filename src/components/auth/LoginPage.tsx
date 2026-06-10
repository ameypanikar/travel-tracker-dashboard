import { useState } from "react";
import { login, type SessionUser } from "@/lib/auth";

type Props = { onLogin: (user: SessionUser) => void };

export function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(username.trim(), password);
      onLogin(user);
    } catch (err) {
      setError((err as Error).message || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dashboard-bg px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-card"
      >
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-accent">
            Travel Dashboard
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign in to continue
          </p>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Username
          </span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Password
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"
          />
        </label>

        {error && (
          <div className="mb-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-card transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Login"}
        </button>
      </form>
    </div>
  );
}
