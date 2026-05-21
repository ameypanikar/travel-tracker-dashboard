import { useMemo, useState } from "react";
import { Star, MapPin, Navigation, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

type Meal = "lunch" | "dinner";

type Restaurant = {
  name: string;
  cuisine: string;
  rating: number;
  reviews: number;
  distanceKm: number;
  priceLevel: string;
  meals: Meal[];
  image: string;
};

// Mock dataset — curated per common destinations + a generic fallback.
const MOCK_DB: Record<string, Restaurant[]> = {
  default: [
    { name: "The Copper Spoon", cuisine: "Modern European", rating: 4.6, reviews: 842, distanceKm: 0.4, priceLevel: "$$", meals: ["lunch", "dinner"], image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600" },
    { name: "Sakura Ramen House", cuisine: "Japanese", rating: 4.4, reviews: 1230, distanceKm: 0.7, priceLevel: "$$", meals: ["lunch", "dinner"], image: "https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=600" },
    { name: "Olive & Vine", cuisine: "Mediterranean", rating: 4.7, reviews: 560, distanceKm: 1.1, priceLevel: "$$$", meals: ["dinner"], image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600" },
    { name: "Bistro Lumière", cuisine: "French", rating: 4.8, reviews: 412, distanceKm: 1.6, priceLevel: "$$$", meals: ["dinner"], image: "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=600" },
    { name: "Casa Mia Trattoria", cuisine: "Italian", rating: 4.5, reviews: 980, distanceKm: 0.9, priceLevel: "$$", meals: ["lunch", "dinner"], image: "https://images.unsplash.com/photo-1481931098730-318b6f776db0?w=600" },
    { name: "Green Bowl Café", cuisine: "Healthy / Vegan", rating: 4.3, reviews: 320, distanceKm: 0.3, priceLevel: "$", meals: ["lunch"], image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600" },
    { name: "Tandoor Nights", cuisine: "Indian", rating: 4.6, reviews: 745, distanceKm: 1.3, priceLevel: "$$", meals: ["dinner"], image: "https://images.unsplash.com/photo-1542367597-8849eb950fd8?w=600" },
    { name: "El Mercado", cuisine: "Mexican", rating: 4.2, reviews: 510, distanceKm: 0.8, priceLevel: "$", meals: ["lunch", "dinner"], image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600" },
  ],
};

type Props = {
  defaultLocation?: string;
};

export function LocalEats({ defaultLocation = "" }: Props) {
  const [location, setLocation] = useState(defaultLocation);
  const [meal, setMeal] = useState<Meal | "all">("all");

  const list = useMemo(() => {
    const restaurants = MOCK_DB.default
      .filter((r) => r.rating >= 4.0)
      .filter((r) => meal === "all" || r.meals.includes(meal))
      .sort((a, b) => b.rating - a.rating);
    return restaurants;
  }, [meal]);

  const directionsUrl = (name: string) => {
    const q = location ? `${name} near ${location}` : name;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-card p-4 shadow-card">
        <label className="text-xs font-semibold text-muted-foreground">Destination</label>
        <div className="mt-1 flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter city or address (e.g. Lisbon, Portugal)"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>

        <div className="mt-3 flex gap-2">
          {(["all", "lunch", "dinner"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMeal(m)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition",
                meal === m ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-accent-soft"
              )}
            >
              {m === "all" ? "All" : m}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Showing curated 4.0★+ picks. Enter a destination to tailor directions.
        </p>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground shadow-card">
          <UtensilsCrossed className="mx-auto mb-2 h-6 w-6" />
          No restaurants match your filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {list.map((r) => (
            <div key={r.name} className="overflow-hidden rounded-2xl bg-card shadow-card">
              <div
                className="h-32 w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${r.image})` }}
                role="img"
                aria-label={r.name}
              />
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold">{r.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {r.cuisine} · {r.priceLevel}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                    <Star className="h-3 w-3 fill-current" />
                    {r.rating.toFixed(1)}
                  </div>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {r.reviews} reviews · ~{r.distanceKm} km from hotel
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.meals.map((m) => (
                    <span key={m} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold capitalize text-muted-foreground">
                      {m}
                    </span>
                  ))}
                </div>
                <a
                  href={directionsUrl(r.name)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-accent-foreground hover:opacity-90"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  View Directions
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
