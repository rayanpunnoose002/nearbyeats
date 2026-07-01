# Nearby Restaurant Finder

Find nearby restaurants, filter by radius/rating/price/cuisine, and get a one-click "suggest a spot" pick when you're too indecisive to scroll.

## Setup

1. **Get a Google Places API key**
   - Create or select a project in the [Google Cloud Console](https://console.cloud.google.com/).
   - Enable billing on the project (Places API requires it, though small hobby usage stays within the free tier).
   - Enable the **Places API (New)** and **Geocoding API**.
   - Create an API key under "Credentials" and restrict it to those two APIs (and optionally your domain/IP for safety).

2. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` and set:
   ```
   GOOGLE_PLACES_API_KEY=your_real_key_here
   ```

3. **Install dependencies and run**
   ```bash
   npm install
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## How it works

- `lib/places.ts` — thin wrapper around the Places API (New): `searchNearby` and `getPlaceDetails`, using field masks to control cost.
- `lib/suggest.ts` — weighted-random selection logic (favors higher rating + closer distance) used by the "Suggest a spot" button.
- `app/api/restaurants/search` — proxies nearby search server-side so the API key never reaches the browser.
- `app/api/restaurants/[placeId]` — fetches full place details + reviews on demand (only when a user expands a card, to limit API calls).
- `app/api/suggest` — re-runs the search and picks one restaurant via the weighting function, excluding previously shown picks in the session.
- `app/api/geocode` — converts a manually typed address/zip into coordinates, used as a fallback when geolocation is denied.

No accounts or database in this version — it's a stateless, anonymous public tool. A natural v2 extension would add lightweight accounts to persist favorites/history and feed real personalization into the suggestion algorithm.

## Notes on Google Places usage

- Reviews are capped at 5 per place by the API itself.
- Review display must keep Google's attribution link (already wired into `RestaurantCard`).
- Photos aren't rendered yet — `lib/places.ts` exposes `placePhotoUrl()` if you want to add them.
