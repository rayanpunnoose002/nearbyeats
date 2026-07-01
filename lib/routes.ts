const ROUTES_API_URL =
  "https://routes.googleapis.com/directions/v2:computeRoutes";
const GEOCODING_API_URL =
  "https://maps.googleapis.com/maps/api/geocode/json";

function requireApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY is not set");
  return key;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteResult {
  durationSeconds: number;
  distanceMeters: number;
  encodedPolyline: string;
}

export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function numStopsForDistance(meters: number): number {
  if (meters < 80_000) return 1;
  if (meters < 250_000) return 2;
  if (meters < 500_000) return 3;
  return 4;
}

export function sampleWaypoints(
  points: LatLng[],
  totalMeters: number,
  numStops: number,
): LatLng[] {
  if (points.length < 2 || numStops === 0) return [];
  const intervalMeters = totalMeters / (numStops + 1);
  const waypoints: LatLng[] = [];
  let accumulated = 0;
  let nextTarget = intervalMeters;

  for (let i = 1; i < points.length && waypoints.length < numStops; i++) {
    const seg = haversineMeters(points[i - 1], points[i]);
    accumulated += seg;
    while (accumulated >= nextTarget && waypoints.length < numStops) {
      waypoints.push(points[i]);
      nextTarget += intervalMeters;
    }
  }
  return waypoints;
}

export async function computeRoute(
  origin: string,
  destination: string,
): Promise<RouteResult> {
  const apiKey = requireApiKey();
  const res = await fetch(ROUTES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
    },
    body: JSON.stringify({
      origin: { address: origin },
      destination: { address: destination },
      travelMode: "DRIVE",
      polylineEncoding: "ENCODED_POLYLINE",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Routes API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) throw new Error("No route found between those locations.");

  return {
    durationSeconds: parseInt(
      (route.duration as string).replace("s", ""),
      10,
    ),
    distanceMeters: route.distanceMeters as number,
    encodedPolyline: route.polyline.encodedPolyline as string,
  };
}

export async function reverseGeocodeCity(
  lat: number,
  lng: number,
): Promise<string | null> {
  const apiKey = requireApiKey();
  const res = await fetch(
    `${GEOCODING_API_URL}?latlng=${lat},${lng}&key=${apiKey}&result_type=locality|postal_town|administrative_area_level_2`,
  );
  if (!res.ok) return null;

  const data = await res.json();
  const result = data.results?.[0];
  if (!result) return null;

  type Component = { types: string[]; long_name: string };
  const comps: Component[] = result.address_components ?? [];

  const locality = comps.find(
    (c) => c.types.includes("locality") || c.types.includes("postal_town"),
  );
  const area = comps.find((c) =>
    c.types.includes("administrative_area_level_2"),
  );
  return (
    locality?.long_name ??
    area?.long_name ??
    (result.formatted_address as string | undefined)?.split(",")?.[0] ??
    null
  );
}
