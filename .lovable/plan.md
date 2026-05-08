## Goal

Replace the placeholder home page with a clean, mobile-friendly travel dashboard that fetches your trip data from your Google Sheet via the existing Apps Script Web App. No backend, no database — same model as your `trip.html`, just rebuilt properly in React with the FIFA tab removed.

## Why your current setup isn't showing data

Two likely culprits I'll account for in the build:
1. The `trip.html` you ran is opened from `file://`, which can fail CORS / mixed-content rules and silently show "no data."
2. The Apps Script returns dates as strings like `19/05/2026` and times like `7:25 am` / `22:05:00`. The HTML's day-grouping needs strict ISO matching — any parse mismatch leaves rows unassigned, so the day card shows "No flights, hotels or matches for this day."

Verified your endpoint works — `?action=all` returns 3 flights and 1 hotel correctly, including `departureIso` fields we can rely on for grouping.

## What we'll build

**Single page at `/`** with 4 tabs (no FIFA):

- **Day View** — horizontal day strip (week scroller), shows flights + hotel stays for the selected day. Defaults to today (or the trip's first day if today is outside the range). Buttons: Today, Trip Start, Next Week, Calendar (date picker).
- **Pending** — items where `bookingStatus` isn't `BOOKED` (uses the `pending` array from the API).
- **Flights** — full sortable list of flights with route (PNQ → BLR), date/time, airline, duration, confirmation code, and "Manage booking" link.
- **Hotels** — list of hotels with name, address, check-in/out dates, confirmation code, booking link, Google Maps link, phone.

**Top bar:** Title "Travel Dashboard", manual refresh icon, last-synced timestamp.

**Data fetching:**
- Single `useQuery` hitting `${WEB_APP_URL}?action=all` on mount.
- Manual refresh button calls `refetch()`.
- Web App URL stored as a constant in `src/lib/dashboard-api.ts` (your `/exec` URL).

**Date handling (the key fix):**
- A `parseDate.ts` utility that handles `dd/mm/yyyy`, ISO, and the `departureIso` field the API already provides.
- Day grouping uses `departureIso` / `checkInIso` first, falling back to parsing the string fields. This is what makes Day View actually populate.

## Visual direction

Match the calm, card-based feel of your `trip.html` — soft blue accent, rounded cards, subtle shadows, plenty of whitespace. Mobile-first (max-width ~760px, centered) since dashboards like this get checked on a phone.

## Files

- `src/lib/dashboard-api.ts` — fetch function, types (`Flight`, `Hotel`, `PendingItem`), Web App URL constant.
- `src/lib/date-utils.ts` — robust date parsing + "is on day X" helpers.
- `src/routes/index.tsx` — replaces the placeholder; renders the dashboard shell + tab state.
- `src/components/dashboard/TopBar.tsx`
- `src/components/dashboard/Tabs.tsx`
- `src/components/dashboard/DayView.tsx` (week strip + day card)
- `src/components/dashboard/PendingList.tsx`
- `src/components/dashboard/FlightsList.tsx`
- `src/components/dashboard/HotelsList.tsx`
- `src/components/dashboard/FlightCard.tsx`, `HotelCard.tsx` (shared)

Design tokens added to `src/styles.css` (soft blue accent, success/danger softs) so we don't hardcode colors.

## SEO / head

Update `src/routes/__root.tsx` head: title "Travel Dashboard", description "Personal flights & hotel tracker."

## Out of scope (call out if you want them later)

- Editing the sheet from the dashboard (would need POST + Apps Script changes).
- Auth (your Web App is "Anyone" — anyone with the URL can read).
- Maps embed, weather, push notifications.

## Open question (won't block)

Your Apps Script URL will be hardcoded into the bundle. That's fine for "Anyone (public)" deployment. If you ever want to rotate it without a redeploy, we can move it to an env var later.
