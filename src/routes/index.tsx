import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchDashboard } from "@/lib/dashboard-api";
import { TopBar } from "@/components/dashboard/TopBar";
import { Tabs, type TabKey } from "@/components/dashboard/Tabs";
import { DayView } from "@/components/dashboard/DayView";
import { PendingList } from "@/components/dashboard/PendingList";
import { FlightsList } from "@/components/dashboard/FlightsList";
import { HotelsList } from "@/components/dashboard/HotelsList";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [tab, setTab] = useState<TabKey>("day");
  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const pendingCount = useMemo(() => data?.pending?.length ?? 0, [data]);

  return (
    <div className="min-h-screen bg-dashboard-bg text-foreground">
      <div className="mx-auto w-full max-w-[760px] px-4 pb-24 pt-5">
        <TopBar
          onRefresh={() => refetch()}
          isFetching={isFetching}
          updatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
        />

        <Tabs value={tab} onChange={setTab} pendingCount={pendingCount} />

        {isLoading && (
          <div className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground shadow-card">
            Loading your trip…
          </div>
        )}

        {error && !isLoading && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
            <div className="font-semibold">Couldn't reach the sheet</div>
            <div className="mt-1 opacity-80">{(error as Error).message}</div>
            <button
              onClick={() => refetch()}
              className="mt-3 rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground"
            >
              Try again
            </button>
          </div>
        )}

        {data && !isLoading && (
          <>
            {tab === "day" && (
              <DayView flights={data.flights} hotels={data.hotels} />
            )}
            {tab === "pending" && <PendingList items={data.pending} />}
            {tab === "flights" && <FlightsList flights={data.flights} />}
            {tab === "hotels" && <HotelsList hotels={data.hotels} />}
          </>
        )}

        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          Travel Dashboard · live from Google Sheets
        </p>
      </div>
    </div>
  );
}
