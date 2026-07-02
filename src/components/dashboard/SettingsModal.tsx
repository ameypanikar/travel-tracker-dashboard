import { useEffect, useState } from "react";
import { saveGeminiKey, fetchGeminiKey, saveGeminiModel, fetchGeminiModel, WEB_APP_URL } from "@/lib/dashboard-api";
import type { SessionUser } from "@/lib/auth";
import { sha256Hex } from "@/lib/auth";

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

  // Gemini key state
  const [currentKey, setCurrentKey] = useState<string>("");
  const [keyLoading, setKeyLoading] = useState(true);
  const [keyLoadError, setKeyLoadError] = useState<string | null>(null);

  // Gemini model state
  const [currentModel, setCurrentModel] = useState<string>("");
  const [modelLoading, setModelLoading] = useState(true);
  const [editingModel, setEditingModel] = useState(false);
  const [newModel, setNewModel] = useState("");
  const [savingModel, setSavingModel] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelSuccess, setModelSuccess] = useState(false);

  // Hash passwords state
  const [hashing, setHashing] = useState(false);
  const [hashResult, setHashResult] = useState<string | null>(null);

  // Fetch key and model from Config sheet on mount
  useEffect(() => {
    let cancelled = false;

    setKeyLoading(true);
    fetchGeminiKey()
      .then((key) => { if (!cancelled) setCurrentKey(key); })
      .catch((err) => { if (!cancelled) setKeyLoadError((err as Error).message); })
      .finally(() => { if (!cancelled) setKeyLoading(false); });

    setModelLoading(true);
    fetchGeminiModel()
      .then((model) => { if (!cancelled) setCurrentModel(model); })
      .catch(() => { if (!cancelled) setCurrentModel("gemini-3.1-flash-lite"); })
      .finally(() => { if (!cancelled) setModelLoading(false); });

    return () => { cancelled = true; };
  }, []);

  async function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey.trim()) { setError("Key cannot be empty"); return; }
    setSaving(true); setError(null);
    try {
      await saveGeminiKey(newKey.trim());
      setCurrentKey(newKey.trim());
      setSuccess(true);
      setEditing(false);
      setNewKey("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveModel(e: React.FormEvent) {
    e.preventDefault();
    if (!newModel.trim()) { setModelError("Model name cannot be empty"); return; }
    setSavingModel(true); setModelError(null);
    try {
      await saveGeminiModel(newModel.trim());
      setCurrentModel(newModel.trim());
      setModelSuccess(true);
      setEditingModel(false);
      setNewModel("");
    } catch (err) {
      setModelError((err as Error).message);
    } finally {
      setSavingModel(false);
    }
  }

  async function handleHashPasswords() {
    setHashing(true);
    setHashResult(null);
    try {
      const res = await fetch(`${WEB_APP_URL}?action=getUsers`, { redirect: "follow" });
      const json = await res.json();
      const users: { name: string; username: string; password: string; role: string }[] =
        json.users ?? [];

      const toHash = users.filter(
        (u) => u.password && !/^[a-f0-9]{64}$/.test(u.password),
      );

      if (toHash.length === 0) {
        setHashResult("✅ All passwords are already hashed.");
        setHashing(false);
        return;
      }

      let count = 0;
      for (const u of toHash) {
        const hashed = await sha256Hex(u.password);
        const url = `${WEB_APP_URL}?action=updatePassword&payload=${encodeURIComponent(
          JSON.stringify({ username: u.username, password: hashed }),
        )}`;
        const r = await fetch(url, { redirect: "follow" });
        const j = await r.json();
        if (j.ok) count++;
      }

      setHashResult(`✅ Hashed ${count} of ${toHash.length} passwords successfully.`);
    } catch (err) {
      setHashResult(`❌ Error: ${(err as Error).message}`);
    } finally {
      setHashing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-card max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-accent">Settings</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>

        {/* ── Gemini API Key ── */}
        <div className="mb-4">
          <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Gemini API Key
          </p>
          {keyLoading ? (
            <p className="text-sm text-muted-foreground">Checking shared key…</p>
          ) : keyLoadError ? (
            <p className="text-sm text-destructive">Could not check shared key: {keyLoadError}</p>
          ) : (
            <p className="font-mono text-sm text-foreground">{maskKey(currentKey)}</p>
          )}
          {success && <p className="mt-1 text-xs text-green-600">Key saved successfully!</p>}
        </div>

        {isAdmin && (
          <>
            {!editing ? (
              <button
                onClick={() => { setEditing(true); setSuccess(false); }}
                className="mb-5 w-full rounded-lg border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent-soft"
              >
                Update API Key
              </button>
            ) : (
              <form onSubmit={handleSaveKey} className="mb-5">
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
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"
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

            {/* ── Gemini Model ── */}
            <div className="mb-5 border-t border-border pt-4">
              <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Gemini Model
              </p>
              {modelLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <p className="font-mono text-sm text-foreground">{currentModel}</p>
              )}
              {modelSuccess && <p className="mt-1 text-xs text-green-600">Model saved successfully!</p>}

              {!editingModel ? (
                <button
                  onClick={() => { setEditingModel(true); setModelSuccess(false); setNewModel(currentModel); }}
                  className="mt-2 w-full rounded-lg border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent-soft"
                >
                  Update Model
                </button>
              ) : (
                <form onSubmit={handleSaveModel} className="mt-2">
                  <input
                    type="text"
                    placeholder="e.g. gemini-3.1-flash-lite"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="mb-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <p className="mb-2 text-[11px] text-muted-foreground">
                    Enter the exact Gemini model string. Default fallback: gemini-3.1-flash-lite
                  </p>
                  {modelError && <p className="mb-2 text-xs text-destructive">{modelError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setEditingModel(false); setNewModel(""); setModelError(null); }}
                      className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingModel}
                      className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
                    >
                      {savingModel ? "Saving…" : "Save"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* ── Security ── */}
            <div className="border-t border-border pt-4">
              <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Security
              </p>
              <p className="mb-3 text-[11px] text-muted-foreground">
                Hash all plain-text passwords in the User Details sheet. This is a one-time migration — cannot be undone.
              </p>
              {hashResult && (
                <p className="mb-2 text-xs font-medium">{hashResult}</p>
              )}
              <button
                onClick={handleHashPasswords}
                disabled={hashing}
                className="w-full rounded-lg bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-60"
              >
                {hashing ? "Hashing passwords…" : "🔐 Hash All Passwords"}
              </button>
            </div>
          </>
        )}

        {!isAdmin && (
          <p className="text-xs text-muted-foreground">Only System Managers can update settings.</p>
        )}
      </div>
    </div>
  );
}