import { NextRequest, NextResponse } from "next/server";
import { searchNearby } from "@/lib/places";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const radiusMeters = Math.min(
    parseInt(searchParams.get("radius") ?? "15000", 10),
    50_000,
  );
  const minRating = searchParams.get("minRating")
    ? parseFloat(searchParams.get("minRating")!)
    : undefined;

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "lat and lng are required." },
      { status: 400 },
    );
  }

  try {
    const restaurants = await searchNearby({
      lat,
      lng,
      radiusMeters,
      minRating,
      includedPrimaryTypes: ["restaurant"],
    });
    return NextResponse.json({ results: restaurants.slice(0, 6) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Restaurant search failed." },
      { status: 500 },
    );
  }
}
