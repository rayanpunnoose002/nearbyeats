import { NextRequest, NextResponse } from "next/server";
import {
  computeRoute,
  decodePolyline,
  numStopsForDistance,
  reverseGeocodeCity,
  sampleWaypoints,
} from "@/lib/routes";

export interface JourneyWaypoint {
  lat: number;
  lng: number;
  label: string;
}

export interface JourneyRouteResponse {
  distanceMeters: number;
  durationSeconds: number;
  waypoints: JourneyWaypoint[];
  encodedPolyline: string;
  originCoords: { lat: number; lng: number };
  destCoords: { lat: number; lng: number };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { origin, destination, numStops: numStopsOverride } = body as {
      origin?: string;
      destination?: string;
      numStops?: number;
    };

    if (!origin?.trim() || !destination?.trim()) {
      return NextResponse.json(
        { error: "Origin and destination are required." },
        { status: 400 },
      );
    }

    const route = await computeRoute(origin.trim(), destination.trim());
    const points = decodePolyline(route.encodedPolyline);
    const numStops =
      typeof numStopsOverride === "number" && numStopsOverride >= 0
        ? numStopsOverride
        : numStopsForDistance(route.distanceMeters);
    const waypointCoords = sampleWaypoints(points, route.distanceMeters, numStops);

    const waypoints: JourneyWaypoint[] = await Promise.all(
      waypointCoords.map(async (coords, i) => {
        const cityName = await reverseGeocodeCity(coords.lat, coords.lng);
        return {
          ...coords,
          label: cityName ? `Stop ${i + 1} — ${cityName}` : `Stop ${i + 1}`,
        };
      }),
    );

    return NextResponse.json({
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      waypoints,
      encodedPolyline: route.encodedPolyline,
      originCoords: points[0] ?? { lat: 0, lng: 0 },
      destCoords: points[points.length - 1] ?? { lat: 0, lng: 0 },
    } satisfies JourneyRouteResponse);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Journey planning failed.",
      },
      { status: 500 },
    );
  }
}
