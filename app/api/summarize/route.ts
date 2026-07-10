import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIP } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  if (!checkRateLimit(getClientIP(req))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Summary not available" }, { status: 503 });
  }

  let body: { reviews?: { rating: number; text: string }[]; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { reviews, name } = body;
  if (!Array.isArray(reviews) || reviews.length < 2 || !name) {
    return NextResponse.json({ error: "reviews (min 2) and name are required" }, { status: 400 });
  }

  const reviewText = reviews
    .slice(0, 5)
    .map((r, i) => `Review ${i + 1} (${r.rating}★): ${r.text}`)
    .join("\n\n");

  const prompt = `Summarise these customer reviews for "${name}".

${reviewText}

Reply ONLY with a JSON object:
{
  "pros": [up to 3 short bullet strings of what reviewers love],
  "cons": [up to 2 short bullet strings of common complaints, or [] if none],
  "vibe": "one sentence: atmosphere and best occasion for this place"
}

Be honest and specific. Use what the reviews actually say.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Summary failed" }, { status: 502 });
    }

    const data = await res.json();
    const text: string = data.content?.[0]?.text ?? "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse summary" }, { status: 502 });
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      pros: string[];
      cons: string[];
      vibe: string;
    };

    if (!Array.isArray(parsed.pros) || typeof parsed.vibe !== "string") {
      return NextResponse.json({ error: "Unexpected summary format" }, { status: 502 });
    }

    return NextResponse.json(parsed, {
      headers: { "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return NextResponse.json({ error: "Summary failed" }, { status: 502 });
  }
}
