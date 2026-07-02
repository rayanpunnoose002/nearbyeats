import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIP } from "@/lib/ratelimit";

export async function GET(req: NextRequest) {
  if (!checkRateLimit(getClientIP(req))) {
    return new Response("Too many requests", { status: 429 });
  }

  const name = req.nextUrl.searchParams.get("name") ?? "";
  // Validate: must look like places/xxx/photos/yyy
  if (!/^places\/[^/]+\/photos\/[^/]+$/.test(name)) {
    return new Response("Invalid photo name", { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return new Response("Not configured", { status: 500 });

  try {
    // skipHttpRedirect=true returns JSON { photoUri } — a CDN URL with no API key exposed
    const metaRes = await fetch(
      `https://places.googleapis.com/v1/${name}/media?maxWidthPx=800&skipHttpRedirect=true&key=${apiKey}`,
    );
    if (!metaRes.ok) return new Response("Photo not found", { status: 404 });

    const data = await metaRes.json().catch(() => ({}));
    const photoUri: string | undefined = data?.photoUri;
    if (!photoUri) return new Response("No photo URI", { status: 404 });

    // Redirect to Google's CDN URL — key never appears in the response the browser sees
    return NextResponse.redirect(photoUri, {
      status: 302,
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return new Response("Failed to fetch photo", { status: 502 });
  }
}
