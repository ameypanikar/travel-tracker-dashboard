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
  fields?: Record<string, string>;
};

export type Train = Record<string, string>;

export type PendingItem = (Flight | Hotel) & { isPending: true };

export type DashboardData = {
  ok: boolean;
  flights: Flight[];
  hotels: Hotel[];
  trains: Train[];
  pending: PendingItem[];
  updatedAt: string;
  error?: string;
};

export async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch(`${WEB_APP_URL}?action=all`, {
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
  const json = (await res.json()) as DashboardData;
  if (!json.ok) throw new Error(json.error || "Sheet API returned error");
  return {
    ...json,
    flights: json.flights ?? [],
    hotels: json.hotels ?? [],
    trains: json.trains ?? [],
    pending: json.pending ?? [],
  };
}
