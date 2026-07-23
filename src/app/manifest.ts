import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finalia: Client Operations",
    short_name: "Finalia",
    description:
      "Invite clients, share deliverables, and collect payments in one workspace.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/finalia-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/finalia-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
