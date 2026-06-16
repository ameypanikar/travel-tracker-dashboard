import { useState } from "react";
import { saveGeminiKey, getCachedGeminiKey } from "@/lib/dashboard-api";
import type { SessionUser } from "@/lib/auth";

type Props = {
  user: SessionUser;
  onClose: () => void;
};

function maskKey(key: string): string {
  if (!key || key.length < 8) return key ? "••••••••" : "Not set";
  return key.slice(0, 4) + "••••••••••••" + key.slice(-4);
}

export function SettingsModal({ user, onClose }: Props) {
  const isAdmin = user.role === "System Manager" || user.role === "Owner";
  const [editing, setEditing] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const currentKey = getCachedGeminiKey();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey.trim()) { setError("Key cannot be empty"); return; }
    setSaving(true); setError(null);
    try {
      await saveGeminiKey(newKey.trim());
      setSuccess(true);
      setEditing(false);
      setNewKey("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-accent">Settings</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>

        <div className="mb-4">
          <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gemini API Key</p>
          <p className="font-mono text-sm text-foreground">{maskKey(currentKey)}</p>
          {success && <p className="mt-1 text-xs text-green-600">Key saved successfully!</p>}
        </div>

        {isAdmin && (
          <>
            {!editing ? (
              <button
                onClick={() => { setEditing(true); setSuccess(false); }}
                className="w-full rounded-lg border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent-soft"
              >
                Update API Key
              </button>
            ) : (
              <form onSubmit={handleSave}>
                <input
                  type="text"
                  placeholder="Paste new Gemini API key"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="mb-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-accent/40"
                />
                {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setEditing(false); setNewKey(""); setError(null); }}
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {!isAdmin && (
          <p className="text-xs text-muted-foreground">Only System Managers can update the API key.</p>
        )}
      </div>
    </div>
  );
}