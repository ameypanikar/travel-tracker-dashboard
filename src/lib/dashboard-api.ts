export const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbxK75KALaxQNwDoxm0NB0mnHARmQtENse7dqyQhpZ1Y2KR31H_wOyWKuG1DjAPPO2VPXQ/exec";

export type Flight = {
  type: "flight";
  sourceSheet: string;
  sourceRow: number;
  airline: string;
  fromCode: string;
  fromCity: string;
  toCode: string;
  toCity: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  confirmationCode: string;
  bookingStatus: string;
  duration: string;
  manageLink: string;
  departureIso?: string;
  arrivalIso?: string;
  isPending: boolean;
  fields?: Record<string, string>;
};

export type Hotel = {
  type: "hotel";
  sourceSheet: string;
  sourceRow: number;
  hotelName: string;
  address: string;
  city: string;
  checkInDate: string;
  checkOutDate: string;
  confirmationCode: string;
  bookingStatus: string;
  bookingLink?: string;
  mapsLink?: string;
  latitude?: string;
  longitude?: string;
  phone?: string;
  checkInIso?: string;
  checkOutIso?: string;
  isPending: boolean;
  // Room fields
  numberofrooms?: string;
  roomassignments?: string;
  fields?: Record<string, string>;
};

export type Train = Record<string, string>;

export type TravelEvent = {
  eventname: string;
  startdate: string;
  enddate: string;
  location: string;
  type: string;       // Exhibition | Conference | Trade Show | Other
  ourrole: string;    // Stall Holder | Visitor | Organiser | Sponsor
  notes: string;
};

export type PendingItem = (Flight | Hotel) & { isPending: true };

export type DashboardData = {
  ok: boolean;
  flights: Flight[];
  hotels: Hotel[];
  trains: Train[];
  events: TravelEvent[];
  pending: PendingItem[];
  documents: Document[];
  updatedAt: string;
  error?: string;
};

export async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch(`${WEB_APP_URL}?action=all`, { redirect: "follow" });
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
  const json = (await res.json()) as DashboardData;
  if (!json.ok) throw new Error(json.error || "Sheet API returned error");
  return {
    ...json,
    flights: json.flights ?? [],
    hotels: json.hotels ?? [],
    trains: json.trains ?? [],
    events: json.events ?? [],
    pending: json.pending ?? [],
  };
}

// ── Gemini key from Config sheet ──────────────────────────────────────────────
const GEMINI_CACHE_KEY = "gemini_api_key";

export async function fetchGeminiKey(): Promise<string> {
  // Return cached value if available
  const cached = localStorage.getItem(GEMINI_CACHE_KEY);
  if (cached) return cached;

  const res = await fetch(`${WEB_APP_URL}?action=getConfig&key=gemini_api_key`, {
    redirect: "follow",
  });
  if (!res.ok) throw new Error("Could not fetch config");
  const json = await res.json();
  const key = json.value || "";
  if (key) localStorage.setItem(GEMINI_CACHE_KEY, key);
  return key;
}

export async function saveGeminiKey(newKey: string): Promise<void> {
  const url = `${WEB_APP_URL}?action=setConfig&payload=${encodeURIComponent(
    JSON.stringify({ key: "gemini_api_key", value: newKey }),
  )}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error("Could not save config");
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Failed to save");
  localStorage.setItem(GEMINI_CACHE_KEY, newKey);
}

export function getCachedGeminiKey(): string {
  return localStorage.getItem(GEMINI_CACHE_KEY) || "";
}

// ── Append event ──────────────────────────────────────────────────────────────
export async function appendEvent(fields: {
  eventname: string;
  startdate: string;
  enddate: string;
  location: string;
  type: string;
  ourrole: string;
  notes: string;
}): Promise<void> {
  const url = `${WEB_APP_URL}?action=append&payload=${encodeURIComponent(
    JSON.stringify({ kind: "event", fields }),
  )}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error("Could not save event");
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Failed to save event");
}

export type Document = {
  type: "flight" | "hotel";
  category: "ticket" | "boardingpass" | "confirmation";
  confirmationcode: string;
  passengername: string;
  fileurl: string;
  uploadedat: string;
};

// ── Document upload (tickets, boarding passes, hotel confirmations) ──────────
export async function uploadDocument(params: {
  type: "flight" | "hotel";
  category: "ticket" | "boardingpass" | "confirmation";
  confirmationCode: string;
  passengerName?: string;
  file: File;
}): Promise<string> {
  const { type, category, confirmationCode, passengerName, file } = params;

  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const res = await fetch(WEB_APP_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "uploadDocument",
      type,
      category,
      confirmationCode,
      passengerName: passengerName || "",
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      base64Data,
    }),
  });

  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Upload failed");
  return json.fileUrl as string;
}