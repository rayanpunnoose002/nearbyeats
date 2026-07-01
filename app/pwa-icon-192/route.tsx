import { ImageResponse } from "next/og";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #fb923c, #ec4899)",
          fontSize: 110,
        }}
      >
        🍽️
      </div>
    ),
    { width: 192, height: 192 },
  );
}
