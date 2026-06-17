import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Chambellan Concierge",
    short_name: "Chambellan",
    description: "Private luxury concierge operating system",
    start_url: "/",
    scope: "/",
    display: "fullscreen",
    orientation: "portrait-primary",
    background_color: "#111111",
    theme_color: "#111111",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
