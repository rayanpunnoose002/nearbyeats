import { NextRequest, NextResponse } from "next/server";
import { getPlaceDetails } from "@/lib/places";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ placeId: string }> },
) {
  const { placeId } = await params;
  const search = req.nextUrl.searchParams;
  const lat = parseFloat(search.get("lat") ?? "");
  const lng = parseFloat(search.get("lng") ?? "");

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json(
      { error: "lat and lng query params are required" },
      { status: 400 },
    );
  }

  try {
    const details = await getPlaceDetails(placeId, lat, lng);
    return NextResponse.json(details);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch place details" },
      { status: 502 },
    );
  }
}
