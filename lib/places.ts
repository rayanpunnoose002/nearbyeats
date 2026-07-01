import { rankRestaurants } from "./score";

const PLACES_BASE_URL = "https://places.googleapis.com/v1";

export type PriceLevel =
  | "PRICE_LEVEL_UNSPECIFIED"
  | "PRICE_LEVEL_FREE"
  | "PRICE_LEVEL_INEXPENSIVE"
  | "PRICE_LEVEL_MODERATE"
  | "PRICE_LEVEL_EXPENSIVE"
  | "PRICE_LEVEL_VERY_EXPENSIVE";

export interface RestaurantSummary {
  placeId: string;
  name: string;
  rating: number | null;
  userRatingCount: number;
  priceLevel: PriceLevel | null;
  address: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  openNow: boolean | null;
  photoName: string | null;
  businessStatus: string | null;
}

export interface PlaceReview {
  authorName: string;
  rating: number;
  text: string;
  relativePublishTimeDescription: string;
}

export interface PlaceDetails extends RestaurantSummary {
  reviews: PlaceReview[];
  googleMapsUri: string;
}

export interface SearchNearbyParams {
  lat: number;
  lng: number;
  radiusMeters: number;
  minRating?: number;
  priceLevels?: PriceLevel[];
  includedPrimaryTypes?: string[];
  openNow?: boolean;
}

function requireApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    throw new Error("GOOGLE_PLACES_API_KEY is not set");
  }
  return key;
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.formattedAddress",
  "places.location",
  "places.currentOpeningHours.openNow",
  "places.photos.name",
  "places.businessStatus",
].join(",");

export async function searchNearby(
  params: SearchNearbyParams,
): Promise<RestaurantSummary[]> {
  const apiKey = requireApiKey();

  const body: Record<string, unknown> = {
    includedPrimaryTypes: params.includedPrimaryTypes?.length
      ? params.includedPrimaryTypes
      : ["restaurant"],
    locationRestriction: {
      circle: {
        center: { latitude: params.lat, longitude: params.lng },
        radius: params.radiusMeters,
      },
    },
    maxResultCount: 20,
    rankPreference: "DISTANCE",
  };

  const res = await fetch(`${PLACES_BASE_URL}/places:searchNearby`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": SEARCH_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Places searchNearby failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const places: unknown[] = data.places ?? [];

  let results: RestaurantSummary[] = places.map((p) => {
    const place = p as Record<string, any>;
    return {
      placeId: place.id,
      name: place.displayName?.text ?? "Unknown",
      rating: typeof place.rating === "number" ? place.rating : null,
      userRatingCount: place.userRatingCount ?? 0,
      priceLevel: place.priceLevel ?? null,
      address: place.formattedAddress ?? "",
      lat: place.location?.latitude ?? params.lat,
      lng: place.location?.longitude ?? params.lng,
      distanceMeters: haversineMeters(
        params.lat,
        params.lng,
        place.location?.latitude ?? params.lat,
        place.location?.longitude ?? params.lng,
      ),
      openNow: place.currentOpeningHours?.openNow ?? null,
      photoName: place.photos?.[0]?.name ?? null,
      businessStatus: place.businessStatus ?? null,
    };
  });

  // Remove permanently or temporarily closed businesses immediately — never show them
  results = results.filter(
    (r) => r.businessStatus == null || r.businessStatus === "OPERATIONAL",
  );

  if (params.minRating !== undefined) {
    results = results.filter(
      (r) => r.rating !== null && r.rating >= params.minRating!,
    );
  }
  if (params.priceLevels?.length) {
    results = results.filter(
      (r) => r.priceLevel !== null && params.priceLevels!.includes(r.priceLevel),
    );
  }
  if (params.openNow) {
    results = results.filter((r) => r.openNow === true);
  }

  return rankRestaurants(results);
}

const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "rating",
  "userRatingCount",
  "priceLevel",
  "formattedAddress",
  "location",
  "currentOpeningHours.openNow",
  "photos.name",
  "reviews",
  "googleMapsUri",
].join(",");

export async function getPlaceDetails(
  placeId: string,
  userLat: number,
  userLng: number,
): Promise<PlaceDetails> {
  const apiKey = requireApiKey();

  const res = await fetch(`${PLACES_BASE_URL}/places/${placeId}`, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": DETAILS_FIELD_MASK,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Places details failed: ${res.status} ${errText}`);
  }

  const place = await res.json();

  const reviews: PlaceReview[] = (place.reviews ?? []).map((r: any) => ({
    authorName: r.authorAttribution?.displayName ?? "Anonymous",
    rating: r.rating ?? 0,
    text: r.text?.text ?? "",
    relativePublishTimeDescription: r.relativePublishTimeDescription ?? "",
  }));

  return {
    placeId: place.id,
    name: place.displayName?.text ?? "Unknown",
    rating: typeof place.rating === "number" ? place.rating : null,
    userRatingCount: place.userRatingCount ?? 0,
    priceLevel: place.priceLevel ?? null,
    address: place.formattedAddress ?? "",
    lat: place.location?.latitude ?? userLat,
    lng: place.location?.longitude ?? userLng,
    distanceMeters: haversineMeters(
      userLat,
      userLng,
      place.location?.latitude ?? userLat,
      place.location?.longitude ?? userLng,
    ),
    openNow: place.currentOpeningHours?.openNow ?? null,
    photoName: place.photos?.[0]?.name ?? null,
    businessStatus: place.businessStatus ?? null,
    reviews,
    googleMapsUri: place.googleMapsUri ?? "",
  };
}

export function placePhotoUrl(photoName: string, maxWidthPx = 400): string {
  const apiKey = requireApiKey();
  return `${PLACES_BASE_URL}/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${apiKey}`;
}
