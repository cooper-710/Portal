import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Portal: Client Workspace",
    short_name: "Portal",
    description:
      "Invite clients, share deliverables, and collect payments in one workspace.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/portal-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/portal-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
