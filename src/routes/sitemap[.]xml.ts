import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SITE_URL = 'https://www.leradial.com.ar';

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const SUPABASE_URL = process.env['SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL'];
        const KEY =
          process.env['SUPABASE_PUBLISHABLE_KEY'] ??
          process.env['SUPABASE_ANON_KEY'] ??
          process.env['VITE_SUPABASE_PUBLISHABLE_KEY'];

        let productUrls: string[] = [];

        if (SUPABASE_URL && KEY) {
          const supabase = createClient<Database>(SUPABASE_URL, KEY, {
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          });
          const { data } = await supabase
            .from('products')
            .select('slug')
            .eq('is_active', true)
            .returns<{ slug: string }[]>();
          productUrls = (data ?? []).map((p) => `${SITE_URL}/producto/${p.slug}`);
        }

        const staticUrls = [SITE_URL];

        const urls = [...staticUrls, ...productUrls];
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>`;

        return new Response(body, {
          headers: {
            'content-type': 'application/xml; charset=utf-8',
            'cache-control': 'public, max-age=3600',
          },
        });
      },
    },
  },
});
