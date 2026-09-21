import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://leradial.com.ar";
const PAGE_SIZE = 1000;

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const productUrls: string[] = [];
        let from = 0;
        let hasMore = true;

        while (hasMore) {
          const to = from + PAGE_SIZE - 1;
          const { data, error } = await supabase.from("products").select("slug").range(from, to);

          if (error) {
            console.error("Error fetching products for sitemap:", error);
            break;
          }

          if (data && data.length > 0) {
            for (const item of data) {
              if (item.slug) {
                productUrls.push(`${BASE_URL}/producto/${item.slug}`);
              }
            }

            if (data.length < PAGE_SIZE) {
              hasMore = false;
            } else {
              from += PAGE_SIZE;
            }
          } else {
            hasMore = false;
          }
        }

        const staticUrls = [BASE_URL, `${BASE_URL}/politica-devoluciones`];

        const urls = [...staticUrls, ...productUrls];

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${escapeXml(u)}</loc></url>`).join("\n")}
</urlset>`;

        return new Response(body, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
