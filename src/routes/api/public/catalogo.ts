import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

export const Route = createFileRoute('/api/public/catalogo')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = (url.searchParams.get('q') ?? '').trim().slice(0, 60);
        const categoria = (url.searchParams.get('categoria') ?? '').trim().slice(0, 40);
        const soloStock = url.searchParams.get('stock') === '1';
        const limitRaw = Number(url.searchParams.get('limit') ?? '200');
        const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 200, 1), 1000);

        const SUPABASE_URL = process.env['SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL'];
        const KEY =
          process.env['SUPABASE_PUBLISHABLE_KEY'] ??
          process.env['SUPABASE_ANON_KEY'] ??
          process.env['VITE_SUPABASE_PUBLISHABLE_KEY'];

        if (!SUPABASE_URL || !KEY) {
          return Response.json({ error: 'Backend no configurado' }, { status: 500, headers: CORS });
        }

        const supabase = createClient<Database>(SUPABASE_URL, KEY, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });

        const sel = (s: string): string => s;
        let query = supabase
          .from('products')
          .select(sel('id, brand, model, size, category, price_ars, stock, free_shipping'))
          .eq('is_active', true)
          .order('brand', { ascending: true })
          .limit(limit);

        if (categoria) query = query.eq('category', categoria);
        if (soloStock) query = query.gt('stock', 0);
        if (q) query = query.or(`brand.ilike.%${q}%,model.ilike.%${q}%,size.ilike.%${q}%`);

        interface Row {
          id: string;
          brand: string;
          model: string;
          size: string;
          category: string;
          price_ars: number;
          stock: number;
          free_shipping: boolean;
        }

        const { data, error } = await query.returns<Row[]>();
        if (error) {
          return Response.json({ error: 'No se pudo leer el catálogo' }, { status: 500, headers: CORS });
        }

        const productos = (data ?? []).map((p) => ({
          id: p.id,
          marca: p.brand,
          modelo: p.model,
          medida: p.size,
          categoria: p.category,
          precio_ars: Number(p.price_ars),
          stock: p.stock,
          disponible: p.stock > 0,
          envio_gratis: p.free_shipping,
        }));

        return Response.json(
          { total: productos.length, productos },
          { headers: { ...CORS, 'cache-control': 'public, max-age=60' } },
        );
      },
    },
  },
});
