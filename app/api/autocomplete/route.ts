import { NextRequest, NextResponse } from "next/server";

const AUTOCOMPLETE_URL =
  "https://places.googleapis.com/v1/places:autocomplete";

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input") ?? "";
  if (input.trim().length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 500 },
    );
  }

  const res = await fetch(AUTOCOMPLETE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "suggestions.placePrediction.text,suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat",
    },
    body: JSON.stringify({ input: input.trim(), languageCode: "en" }),
  });

  if (!res.ok) {
    return NextResponse.json({ suggestions: [] });
  }

  const data = await res.json();

  type RawSuggestion = {
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    };
  };

  const suggestions = ((data.suggestions ?? []) as { placePrediction?: RawSuggestion["placePrediction"] }[])
    .slice(0, 5)
    .map((s) => ({
      placeId: s.placePrediction?.placeId ?? "",
      text: s.placePrediction?.text?.text ?? "",
      mainText: s.placePrediction?.structuredFormat?.mainText?.text ?? "",
      secondaryText:
        s.placePrediction?.structuredFormat?.secondaryText?.text ?? "",
    }))
    .filter((s) => s.text);

  return NextResponse.json({ suggestions });
}
