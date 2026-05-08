import type { Hotel } from "@/lib/dashboard-api";
import { HotelCard } from "./HotelCard";
import { EmptyState } from "./EmptyState";

export function HotelsList({ hotels }: { hotels: Hotel[] }) {
  if (!hotels.length) {
    return <EmptyState title="No hotels yet" message="Add a row to your Hotels sheet." />;
  }
  return (
    <div className="flex flex-col gap-3">
      {hotels.map((h) => (
        <HotelCard key={`${h.sourceSheet}-${h.sourceRow}`} hotel={h} />
      ))}
    </div>
  );
}
