import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nearby Eats",
    short_name: "Nearby Eats",
    description: "Find nearby restaurants and let us suggest where to eat.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#fb923c",
    icons: [
      { src: "/pwa-icon-192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon-512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
