import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://kingdavez.click";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/second-life", changefreq: "weekly", priority: "0.95" },
          { path: "/community", changefreq: "daily", priority: "0.7" },
          { path: "/generate", changefreq: "weekly", priority: "0.9" },
          { path: "/tutorials", changefreq: "weekly", priority: "0.85" },
          { path: "/tutorials/second-life-mesh", changefreq: "monthly", priority: "0.8" },
          { path: "/tutorials/ai-3d-models", changefreq: "monthly", priority: "0.8" },
          { path: "/tutorials/pbr-textures", changefreq: "monthly", priority: "0.8" },
          { path: "/tutorials/retexture-models", changefreq: "monthly", priority: "0.8" },
          { path: "/faq", changefreq: "monthly", priority: "0.7" },
          { path: "/roadmap", changefreq: "weekly", priority: "0.6" },
          { path: "/changelog", changefreq: "weekly", priority: "0.6" },
          { path: "/docs", changefreq: "weekly", priority: "0.6" },
          { path: "/credits", changefreq: "monthly", priority: "0.5" },
          { path: "/tos", changefreq: "yearly", priority: "0.3" },
          { path: "/login", changefreq: "yearly", priority: "0.3" },
          { path: "/signup", changefreq: "yearly", priority: "0.4" },
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
