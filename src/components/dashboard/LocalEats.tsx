import { useState, useCallback, useRef } from "react";
import { MapPin, Navigation, UtensilsCrossed, Loader2, LocateFixed } from "lucide-react";
import { cn } from "@/lib/utils";

type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  lat: number;
  lon: number;
  distanceKm: number;
  address: string;
  openingHours?: string;
  phone?: string;
};

type CuisineFilter = "all" | "indian" | "chinese" | "italian" | "fast_food" | "cafe" | "pizza" | "seafood" | "vegetarian";

const CUISINE_LABELS: Record<CuisineFilter, string> = {
  all: "All",
  indian: "🍛 Indian",
  chinese: "🥡 Chinese",
  italian: "🍝 Italian",
  fast_food: "🍔 Fast Food",
  cafe: "☕ Café",
  pizza: "🍕 Pizza",
  seafood: "🦞 Seafood",
  vegetarian: "🥗 Veg",
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Use Nominatim search — fully CORS-enabled, no API key needed
async function fetchNearbyRestaurants(
  lat: number,
  lon: number,
  cuisine: CuisineFilter,
  signal: AbortSignal,
): Promise<Restaurant[]> {
  // Build search query
  const amenityMap: Record<CuisineFilter, string> = {
    all: "restaurant",
    indian: "restaurant",
    chinese: "restaurant",
    italian: "restaurant",
    fast_food: "fast_food",
    cafe: "cafe",
    pizza: "restaurant",
    seafood: "restaurant",
    vegetarian: "restaurant",
  };

  const amenity = amenityMap[cuisine];
  const cuisineTag = cuisine !== "all" && cuisine !== "fast_food" && cuisine !== "cafe"
    ? `&tag=cuisine:${cuisine}` : "";

  // Nominatim search around coordinates
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?format=json&limit=40&addressdetails=1&extratags=1` +
    `&amenity=${amenity}${cuisineTag}` +
    `&viewbox=${lon - 0.05},${lat + 0.05},${lon + 0.05},${lat - 0.05}` +
    `&bounded=1`;

  const res = await fetch(url, {
    signal,
    headers: { "Accept-Language": "en", "User-Agent": "TravelDashboard/1.0" },
  });

  if (!res.ok) throw new Error(`Search failed: HTTP ${res.status}`);
  const data = await res.json();

  if (!Array.isArray(data)) throw new Error("Unexpected response format");

  const results: Restaurant[] = data
    .filter((el: Record<string, unknown>) => el.display_name && el.lat && el.lon)
    .map((el: Record<string, unknown>) => {
      const elLat = parseFloat(el.lat as string);
      const elLon = parseFloat(el.lon as string);
      const extratags = (el.extratags as Record<string, string>) || {};
      const address = el.address as Record<string, string> || {};

      // Extract cuisine from extratags
      let cuisineLabel = extratags.cuisine
        ? extratags.cuisine.split(";")[0].replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
        : el.type === "cafe" ? "Café"
        : el.type === "fast_food" ? "Fast Food"
        : "Restaurant";

      // Build short address
      const addrParts = [
        address.road || address.pedestrian,
        address.suburb || address.neighbourhood,
      ].filter(Boolean);

      return {
        id: String(el.place_id),
        name: (el.name as string) || (el.display_name as string).split(",")[0],
        cuisine: cuisineLabel,
        lat: elLat,
        lon: elLon,
        distanceKm: Math.round(haversineKm(lat, lon, elLat, elLon) * 10) / 10,
        address: addrParts.join(", "),
        openingHours: extratags.opening_hours,
        phone: extratags.phone || extratags["contact:phone"],
      };
    })
    .sort((a: Restaurant, b: Restaurant) => a.distanceKm - b.distanceKm)
    .slice(0, 20);

  return results;
}

// Map cuisine keywords to Unsplash photo IDs (stable, no API key needed)
const CUISINE_PHOTOS: Record<string, string> = {
  indian:       "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80",
  chinese:      "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80",
  italian:      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80",
  pizza:        "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80",
  cafe:         "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&q=80",
  fast_food:    "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&q=80",
  seafood:      "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=600&q=80",
  vegetarian:   "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
  sandwich:     "https://images.unsplash.com/photo-1553909489-cd47e0907980?w=600&q=80",
  burger:       "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80",
  default:      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80",
};

function getCuisinePhoto(cuisine: string): string {
  const key = cuisine.toLowerCase();
  for (const [k, url] of Object.entries(CUISINE_PHOTOS)) {
    if (key.includes(k)) return url;
  }
  return CUISINE_PHOTOS.default;
}

export function LocalEats({ defaultLocation = "" }: Props) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cuisine, setCuisine] = useState<CuisineFilter>("all");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationName, setLocationName] = useState(defaultLocation);
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const doFetch = useCallback(async (lat: number, lon: number, c: CuisineFilter) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setLoadingStep("Searching nearby restaurants…");
    try {
      const results = await fetchNearbyRestaurants(lat, lon, c, controller.signal);
      setRestaurants(results);
      setHasSearched(true);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  }, []);

  const handleLocate = () => {
    if (!navigator.geolocation) { setError("Geolocation not supported."); return; }
    setLoading(true);
    setLoadingStep("Getting your location…");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCoords({ lat, lon });

        // Reverse geocode non-blocking
        fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
          { headers: { "Accept-Language": "en" } },
        )
          .then(r => r.json())
          .then(j => {
            const addr = j.address ?? {};
            setLocationName(
              addr.suburb || addr.neighbourhood || addr.city_district ||
              addr.city || addr.town || addr.village || "Your location",
            );
          })
          .catch(() => setLocationName(`${lat.toFixed(3)}, ${lon.toFixed(3)}`));

        await doFetch(lat, lon, cuisine);
      },
      (err) => {
        setLoading(false);
        setLoadingStep("");
        setError(
          err.code === 1
            ? "Location permission denied. Please allow location access and try again."
            : "Could not get your location. Please try again.",
        );
      },
      { timeout: 8000, maximumAge: 30000 },
    );
  };

  const handleCuisineChange = (c: CuisineFilter) => {
    setCuisine(c);
    if (coords) doFetch(coords.lat, coords.lon, c);
  };

  const mapsUrl = (r: Restaurant) =>
    `https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lon}`;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-card p-4 shadow-card">
        {locationName && (
          <div className="mb-3 flex items-center gap-1.5 text-xs">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" />
            <span className="font-medium text-foreground">{locationName}</span>
          </div>
        )}

        <button
          onClick={handleLocate}
          disabled={loading}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          {loading ? (loadingStep || "Loading…") : coords ? "Refresh location" : "Use my location"}
        </button>

        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(CUISINE_LABELS) as CuisineFilter[]).map((c) => (
            <button
              key={c}
              onClick={() => handleCuisineChange(c)}
              disabled={loading}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                cuisine === c ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-accent-soft",
              )}
            >
              {CUISINE_LABELS[c]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Real restaurants within ~5 km · OpenStreetMap
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3 shadow-card text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          {loadingStep}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {hasSearched && !loading && restaurants.length === 0 && !error && (
        <div className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground shadow-card">
          <UtensilsCrossed className="mx-auto mb-2 h-6 w-6" />
          No restaurants found nearby. Try a different filter or tap Refresh.
        </div>
      )}

      {!hasSearched && !loading && (
        <div className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground shadow-card">
          <LocateFixed className="mx-auto mb-2 h-6 w-6" />
          Tap "Use my location" to find restaurants near you.
        </div>
      )}

      {!loading && restaurants.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {restaurants.map((r) => (
            <div key={r.id} className="overflow-hidden rounded-2xl bg-card shadow-card">
              {/* Cuisine photo */}
              <div
                className="h-32 w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${getCuisinePhoto(r.cuisine)})` }}
                role="img"
                aria-label={r.cuisine}
              >
                {/* Name overlay at bottom */}
                <div className="flex h-full flex-col justify-end bg-gradient-to-t from-black/60 to-transparent px-3 pb-2">
                  <div className="truncate text-sm font-bold text-white">{r.name}</div>
                  <div className="text-[11px] text-white/80">{r.cuisine}</div>
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span>
                    {r.distanceKm < 1
                      ? `${Math.round(r.distanceKm * 1000)} m away`
                      : `${r.distanceKm.toFixed(1)} km away`}
                  </span>
                </div>
                {r.address && (
                  <div className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{r.address}</div>
                )}
                {r.openingHours && (
                  <div className="mt-1 text-[11px] text-muted-foreground">🕐 {r.openingHours}</div>
                )}
                {r.phone && (
                  <div className="mt-1 text-[11px] text-muted-foreground">📞 {r.phone}</div>
                )}
                <a
                  href={mapsUrl(r)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-accent-foreground hover:opacity-90"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  View on Map
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}