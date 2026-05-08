import type { Flight } from "@/lib/dashboard-api";
import { FlightCard } from "./FlightCard";
import { EmptyState } from "./EmptyState";

export function FlightsList({ flights }: { flights: Flight[] }) {
  if (!flights.length) {
    return <EmptyState title="No flights yet" message="Add a row to your Flights sheet." />;
  }
  return (
    <div className="flex flex-col gap-3">
      {flights.map((f) => (
        <FlightCard key={`${f.sourceSheet}-${f.sourceRow}`} flight={f} />
      ))}
    </div>
  );
}
