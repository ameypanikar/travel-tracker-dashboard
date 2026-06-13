import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Settings, X, Upload, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Kind = "flight" | "hotel" | "train";

const SHEET_URL =
  "https://script.google.com/macros/s/AKfycbxK75KALaxQNwDoxm0NB0mnHARmQtENse7dqyQhpZ1Y2KR31H_wOyWKuG1DjAPPO2VPXQ/exec";

const FLIGHT_PROMPT =
  "Extract flight booking details and return ONLY a raw JSON object with no markdown, no backticks, just the JSON. Keys: airline, from_code (airport code), city_from, to_code (airport code), city_to, departure_date (DD/MM/YYYY), departure_time (HH:MM 24hr), arrival_date (DD/MM/YYYY), arrival_time (HH:MM 24hr), confirmation_code, duration (HH:MM), manage_link. Use empty string for missing fields.";

const HOTEL_PROMPT =
  "Extract hotel booking details and return ONLY a raw JSON object with no markdown, no backticks, just the JSON. Keys: hotel_name, address, city, checkin_date (DD/MM/YYYY), checkout_date (DD/MM/YYYY), confirmation_code, booking_link, cancellation_deadline (DD/MM/YYYY), booked_price. Use empty string for missing fields.";

const TRAIN_PROMPT =
  "Extract train booking details and return ONLY a raw JSON object with no markdown, no backticks, just the JSON. Keys: train_name, train_number, from_code (station code), city_from, to_code (station code), city_to, departure_date (DD/MM/YYYY), departure_time (HH:MM 24hr), arrival_date (DD/MM/YYYY), arrival_time (HH:MM 24hr), pnr, class. Use empty string for missing fields.";

const FLIGHT_KEYS = [
  "airline","from_code","city_from","to_code","city_to","departure_date","departure_time","arrival_date","arrival_time","confirmation_code","duration","manage_link",
];
const HOTEL_KEYS = [
  "hotel_name","address","city","checkin_date","checkout_date","confirmation_code","booking_link","cancellation_deadline","booked_price",
];
const TRAIN_KEYS = [
  "train_name","train_number","from_code","city_from","to_code","city_to","departure_date","departure_time","arrival_date","arrival_time","pnr","class",
];

const PROMPTS: Record<Kind, string> = { flight: FLIGHT_PROMPT, hotel: HOTEL_PROMPT, train: TRAIN_PROMPT };
const KEYS: Record<Kind, string[]> = { flight: FLIGHT_KEYS, hotel: HOTEL_KEYS, train: TRAIN_KEYS };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function AddBookingButton() {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [kind, setKind] = useState<Kind>("flight");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [fields, setFields] = useState<Record<string, string> | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setApiKey(localStorage.getItem("gemini_api_key") || "");
    }
  }, [open]);

  const reset = useCallback(() => {
    setFields(null);
    setError("");
    setStatus("");
    setLoading(false);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const saveKey = (val: string) => {
    setApiKey(val);
    localStorage.setItem("gemini_api_key", val);
  };

  const extractWithGemini = async (base64: string, k: Kind, mimeType: string): Promise<Record<string, string>> => {
    const key = localStorage.getItem("gemini_api_key");
    if (!key) throw new Error("Please click ⚙️ settings to enter your Gemini API key first");
    const prompt = PROMPTS[k];

    let attempt = 0;
    while (attempt < 3) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { inline_data: { mime_type: mimeType, data: base64 } },
                  { text: prompt },
                ],
              },
            ],
          }),
        },
      );

      if (res.status === 429) {
        attempt++;
        if (attempt >= 3) throw new Error("Rate limited after 3 attempts. Please try again later.");
        for (let s = 15; s > 0; s--) {
          setStatus(`Rate limited - retrying in ${s}s...`);
          await new Promise((r) => setTimeout(r, 1000));
        }
        setStatus("Reading PDF... please wait");
        continue;
      }

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Gemini error ${res.status}: ${t}`);
      }

      const json = await res.json();
      const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const cleaned = text.replace(/```json|```/g, "").trim();
      try {
        return JSON.parse(cleaned);
      } catch (e) {
        throw new Error(`Failed to parse JSON from Gemini: ${cleaned.slice(0, 200)}`);
      }
    }
    throw new Error("Failed after retries");
  };

  const handleFile = async (file: File) => {
    reset();
    if (!localStorage.getItem("gemini_api_key")) {
      setError("Please click ⚙️ settings to enter your Gemini API key first");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    let mimeType = "application/pdf";
    if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
    else if (ext === "png") mimeType = "image/png";
    else if (ext === "webp") mimeType = "image/webp";
    setLoading(true);
    setStatus("Reading PDF... please wait");
    try {
      const base64 = await fileToBase64(file);
      const data = await extractWithGemini(base64, kind, mimeType);
      const keys = KEYS[kind];
      const normalized: Record<string, string> = {};
      for (const k of keys) normalized[k] = String(data[k] ?? "");
      setFields(normalized);
      setStatus("");
    } catch (e) {
      setError((e as Error).message);
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onSave = async () => {
    if (!fields) return;
    setSaving(true);
    try {
      const payload = encodeURIComponent(JSON.stringify({ kind, fields }));
      const res = await fetch(`${SHEET_URL}?action=append&payload=${payload}`, { redirect: "follow" });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      toast.success("✅ Booking added to sheet!");
      reset();
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const keys = KEYS[kind];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-bold text-accent-foreground shadow-lg transition hover:scale-105"
        aria-label="Add booking"
      >
        <Plus className="h-4 w-4" /> Add Booking
      </button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { reset(); setShowSettings(false); } }}>
        <DialogContent className="max-w-lg p-0">
          <div className="flex items-center justify-between border-b p-4">
            <div className="text-base font-bold">Add Booking</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings((s) => !s)}
                className="rounded-lg p-1.5 hover:bg-accent-soft"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-4 p-4">
            {showSettings && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <label className="mb-1 block text-xs font-semibold">Gemini API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => saveKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">Stored locally in your browser.</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {(["flight", "hotel", "train"] as Kind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => { setKind(k); reset(); }}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-semibold transition",
                    kind === k ? "bg-accent text-accent-foreground" : "bg-card hover:bg-accent-soft",
                  )}
                >
                  {k === "flight" ? "✈️ Flight" : k === "hotel" ? "🏨 Hotel" : "🚂 Train"}
                </button>
              ))}
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-sm transition",
                dragOver ? "border-accent bg-accent-soft" : "border-border",
              )}
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <div className="font-medium">Drop your booking PDF or image here or click to browse</div>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>

            {loading && (
              <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-3 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{status || "Reading PDF... please wait"}</span>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            {fields && (
              <div className="rounded-lg border">
                <div className="border-b bg-muted/30 px-3 py-2 text-xs font-bold uppercase tracking-wider">
                  Preview & edit
                </div>
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {keys.map((k) => (
                        <tr key={k} className="border-b last:border-0">
                          <td className="w-1/3 px-3 py-1.5 text-xs font-semibold text-muted-foreground">{k}</td>
                          <td className="px-3 py-1.5">
                            <input
                              value={fields[k] ?? ""}
                              onChange={(e) => setFields({ ...fields, [k]: e.target.value })}
                              className="w-full rounded border bg-background px-2 py-1 text-xs"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t pt-3">
              <button
                onClick={reset}
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-accent-soft"
              >
                <X className="h-3 w-3" /> Clear
              </button>
              <button
                onClick={onSave}
                disabled={!fields || saving}
                className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Save to Sheet
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
