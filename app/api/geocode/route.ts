import { NextRequest, NextResponse } from "next/server";

function extractCountryCode(addressComponents: any[]): string | null {
  const country = addressComponents?.find((c: any) => c.types?.includes("country"));
  return country?.short_name ?? null;
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");

  if (!address && !(lat && lng)) {
    return NextResponse.json(
      { error: "Either address, or lat and lng, are required" },
      { status: 400 },
    );
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY is not set" },
      { status: 500 },
    );
  }

  const query = address
    ? `address=${encodeURIComponent(address)}`
    : `latlng=${encodeURIComponent(`${lat},${lng}`)}`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?${query}&key=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK" || !data.results?.length) {
      return NextResponse.json(
        { error: "Couldn't find that location" },
        { status: 404 },
      );
    }

    const result = data.results[0];
    const { lat: resultLat, lng: resultLng } = result.geometry.location;
    const countryCode = extractCountryCode(result.address_components);

    return NextResponse.json({
      lat: resultLat,
      lng: resultLng,
      formattedAddress: result.formatted_address,
      countryCode,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
  }
}
