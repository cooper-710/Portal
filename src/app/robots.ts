import type { MetadataRoute } from "next";

import { appBaseUrl } from "@/lib/product";

export default function robots(): MetadataRoute.Robots {
  const base = appBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/api/", "/auth/", "/onboarding/", "/login"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
