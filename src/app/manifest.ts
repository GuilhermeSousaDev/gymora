import type { MetadataRoute } from "next";

/** Makes Gymora installable ("Add to Home Screen"): opens full screen with its own icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gymora",
    short_name: "Gymora",
    description: "Evidence-based training plans for natural lifters",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#eef0ec",
    theme_color: "#eef0ec",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
