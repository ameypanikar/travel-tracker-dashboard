import type { PendingItem } from "@/lib/dashboard-api";
import { FlightCard } from "./FlightCard";
import { HotelCard } from "./HotelCard";
import { EmptyState } from "./EmptyState";

export function PendingList({ items }: { items: PendingItem[] }) {
  if (!items.length) {
    return <EmptyState title="Nothing pending" message="Everything is booked. Nice." />;
  }
  return (
    <div className="flex flex-col gap-3">
      {items.map((it) =>
        it.type === "flight" ? (
          <FlightCard key={`${it.sourceSheet}-${it.sourceRow}`} flight={it} />
        ) : it.type === "hotel" ? (
          <HotelCard key={`${it.sourceSheet}-${it.sourceRow}`} hotel={it} />
        ) : null
      )}
    </div>
  );
}
