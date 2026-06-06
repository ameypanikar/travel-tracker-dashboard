import { useRef, useState } from "react";
import { Plus, Settings, X, Plane, Hotel, Loader2, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { WEB_APP_URL } from "@/lib/dashboard-api";

type Mode = "flight" | "hotel";

const FLIGHT_PROMPT =
  "You are a travel booking parser. Extract flight details from the booking confirmation text and return ONLY a valid JSON object with these exact keys: airline, from_code, city_from, to_code, city_to, departure_date (DD/MM/YYYY), departure_time (HH:MM 24hr), arrival_date (DD/MM/YYYY), arrival_time (HH:MM 24hr), confirmation_code, duration (HH:MM), manage_link. If any field is not found, use empty string.";

const HOTEL_PROMPT =
  "You are a travel booking parser. Extract hotel details from the booking confirmation text and return ONLY a valid JSON object with these exact keys: hotel_name, address, city, checkin_date (DD/MM/YYYY), checkout_date (DD/MM/YYYY), confirmation_code, booking_link, cancellation_deadline (DD/MM/YYYY), booked_price. If any field is not found, use empty string.";

const FLIGHT_FIELDS: { key: string; label: string }[] = [
  { key: "airline", label: "Airline" },
  { key: "from_code", label: "From Code" },
  { key: "city_from", label: "City From" },
  { key: "to_code", label: "To Code" },
  { key: "city_to", label: "City To" },
  { key: "departure_date", label: "Departure Date" },
  { key: "departure_time", label: "Departure Time" },
  { key: "arrival_date", label: "Arrival Date" },
  { key: "arrival_time", label: "Arrival Time" },
  { key: "confirmation_code", label: "Confirmation Code" },
  { key: "duration", label: "Duration" },
  { key: "manage_link", label: "Manage Link" },
];

const HOTEL_FIELDS: { key: string; label: string }[] = [
  { key: "hotel_name", label: "Hotel Name" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "checkin_date", label: "Check-in Date" },
  { key: "checkout_date", label: "Check-out Date" },
  { key: "confirmation_code", label: "Confirmation Code" },
  { key: "booking_link", label: "Booking Link" },
  { key: "cancellation_deadline", label: "Cancellation Deadline" },
  { key: "booked_price", label: "Booked Price" },
];

function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("gemini_api_key") || "";
}

async function callGemini(apiKey: string, system: string, text: string): Promise<Record<string, string>> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0 },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  const txt: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!txt) throw new Error("Empty Gemini response");
  // Strip code fences if present
  const cleaned = txt.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Could not parse JSON from Gemini response");
  }
}

async function appendRow(kind: Mode, fields: Record<string, string>): Promise<void> {
  const payload = { kind, fields };
  const url = `${WEB_APP_URL}?action=append&payload=${encodeURIComponent(JSON.stringify(payload))}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Sheet append failed: ${res.status}`);
  const json = await res.json().catch(() => ({ ok: false }));
  if (!json.ok) throw new Error(json.error || "Sheet rejected the row");
}

export function AddBookingButton() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("flight");
  const [text, setText] = useState("");
  const [extracted, setExtracted] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(getApiKey());

  const fields = mode === "flight" ? FLIGHT_FIELDS : HOTEL_FIELDS;

  const reset = () => {
    setText("");
    setExtracted(null);
  };

  const saveKey = () => {
    localStorage.setItem("gemini_api_key", apiKey.trim());
    toast.success("API key saved");
    setShowSettings(false);
  };

  const extract = async () => {
    const key = getApiKey();
    if (!key) {
      toast.error("Add your Gemini API key in settings first");
      setShowSettings(true);
      return;
    }
    if (!text.trim()) {
      toast.error("Paste your booking confirmation text");
      return;
    }
    setBusy(true);
    try {
      const sys = mode === "flight" ? FLIGHT_PROMPT : HOTEL_PROMPT;
      const data = await callGemini(key, sys, text);
      const normalized: Record<string, string> = {};
      for (const f of fields) normalized[f.key] = String(data[f.key] ?? "");
      setExtracted(normalized);
      toast.success("Preview ready — review and save");
    } catch (e) {
      toast.error((e as Error).message || "Extraction failed");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!extracted) return;
    setBusy(true);
    try {
      await appendRow(mode, extracted);
      toast.success("✅ Booking added to sheet!");
      reset();
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message || "Could not save to sheet");
    } finally {
      setBusy(false);
    }
  };

  const updateField = (k: string, v: string) => {
    setExtracted((cur) => (cur ? { ...cur, [k]: v } : cur));
  };

  return (
    <>
      <button
        aria-label="Add booking"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground shadow-lg transition hover:opacity-90"
      >
        <Plus className="h-5 w-5" />
        Add Booking
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          <div className="relative flex max-h-[95vh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-2xl bg-card shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-bold">Add Booking</h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowSettings((s) => !s)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                  aria-label="Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {showSettings && (
              <div className="border-b border-border bg-muted/30 px-4 py-3">
                <label className="text-xs font-semibold text-muted-foreground">
                  Gemini API key
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIza..."
                    className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                  />
                  <button
                    onClick={saveKey}
                    className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
                  >
                    Save
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Stored locally in your browser only.
                </p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="mb-3 grid grid-cols-2 gap-2">
                {(["flight", "hotel"] as Mode[]).map((m) => {
                  const Icon = m === "flight" ? Plane : Hotel;
                  const active = mode === m;
                  return (
                    <button
                      key={m}
                      onClick={() => {
                        setMode(m);
                        setExtracted(null);
                      }}
                      className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                        active
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent-soft"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {m === "flight" ? "✈️ Flight" : "🏨 Hotel"}
                    </button>
                  );
                })}
              </div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Paste your ${mode} confirmation text here...`}
                rows={7}
                className="w-full resize-none rounded-md border border-input bg-background p-3 text-sm"
              />

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={extract}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground disabled:opacity-50"
                >
                  {busy && !extracted ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Extract & Preview
                </button>
                <button
                  onClick={reset}
                  disabled={busy}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold"
                >
                  Clear
                </button>
              </div>

              {extracted && (
                <div className="mt-4 overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <tbody>
                      {fields.map((f) => (
                        <tr key={f.key} className="border-b border-border last:border-0">
                          <td className="w-1/3 bg-muted/30 px-3 py-2 font-semibold text-muted-foreground">
                            {f.label}
                          </td>
                          <td className="px-2 py-1">
                            <input
                              value={extracted[f.key] ?? ""}
                              onChange={(e) => updateField(f.key, e.target.value)}
                              className="w-full rounded-sm bg-transparent px-1 py-1 text-foreground outline-none focus:bg-background"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {extracted && (
              <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
                <button
                  onClick={reset}
                  disabled={busy}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold"
                >
                  Clear
                </button>
                <button
                  onClick={save}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-xs font-bold text-accent-foreground disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Save to Sheet
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
