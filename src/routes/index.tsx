import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchDashboard } from "@/lib/dashboard-api";
import { TopBar } from "@/components/dashboard/TopBar";
import { Tabs, type TabKey } from "@/components/dashboard/Tabs";
import { DateFilterBar } from "@/components/dashboard/DateFilterBar";
import { DailyItinerary } from "@/components/dashboard/DailyItinerary";
import { FlightsList } from "@/components/dashboard/FlightsList";
import { HotelsList } from "@/components/dashboard/HotelsList";
import { TrainsList } from "@/components/dashboard/TrainsList";
import { UberTab } from "@/components/dashboard/UberTab";
import { MonthlyView } from "@/components/dashboard/MonthlyView";
import { LocalEats } from "@/components/dashboard/LocalEats";
import { AddBookingButton } from "@/components/dashboard/AddBookingButton";
import { LoginPage } from "@/components/auth/LoginPage";
import { clearSessionUser, getSessionUser, type SessionUser } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [tab, setTab] = useState<TabKey>("day");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    setUser(getSessionUser());
    setAuthReady(true);
  }, []);

  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  if (!authReady) return null;
  if (!user) return <LoginPage onLogin={setUser} />;

  const handleLogout = () => {
    clearSessionUser();
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-dashboard-bg text-foreground">
      <div className="mx-auto w-full max-w-[760px] px-4 pb-24 pt-5">
        <TopBar
          onRefresh={() => refetch()}
          isFetching={isFetching}
          updatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
          user={user}
          onLogout={handleLogout}
        />

        <Tabs value={tab} onChange={setTab} />

        {(tab === "flights" || tab === "hotels" || tab === "trains" || tab === "day") && (
          <DateFilterBar value={selectedDate} onChange={setSelectedDate} />
        )}

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
            {tab === "flights" && (
              <FlightsList flights={data.flights} selectedDate={selectedDate} />
            )}
            {tab === "hotels" && (
              <HotelsList hotels={data.hotels} selectedDate={selectedDate} />
            )}
            {tab === "trains" && (
              <TrainsList trains={(data.trains ?? []) as unknown as Record<string, string>[]} selectedDate={selectedDate} />
            )}
            {tab === "day" && (
              <DailyItinerary
                flights={data.flights}
                hotels={data.hotels}
                trains={data.trains ?? []}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            )}
            {tab === "monthly" && (
              <MonthlyView flights={data.flights} hotels={data.hotels} trains={data.trains ?? []} />
            )}
            {tab === "uber" && (
              <UberTab
                suggestions={data.hotels
                  .filter((h) => h.address || h.hotelName)
                  .map((h) => ({
                    label: h.hotelName || "Hotel",
                    address: h.address || h.hotelName,
                  }))}
              />
            )}
            {tab === "eats" && (
              <LocalEats
                defaultLocation={data.hotels[0]?.city || data.hotels[0]?.address || ""}
              />
            )}
          </>
        )}

        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          Travel Dashboard · live from Google Sheets
        </p>
      </div>
      <AddBookingButton />
    </div>
  );
}
