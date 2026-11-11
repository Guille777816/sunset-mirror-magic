import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/lib/supabase-auth-middleware";
import { assertAdmin } from "@/lib/products.server";
import type { SunsetSyncItem } from "@/lib/sunset-sync.helpers";

type RawSunsetProduct = {
  id: number | string;
  fullName?: string | null;
  size?: string | null;
  patternName?: string | null;
  subcategory?: string | null;
  inStock?: boolean | null;
  price?: {
    usd?: number | string | null;
  } | null;
};

type RawSunsetPage = {
  data?: RawSunsetProduct[];
  meta?: {
    total?: number;
    lastPage?: number;
  };
};

const EXCLUDED_NAME_RE = /\b(WHEEL|LONA|ALUMINUM|STEEL)\b/i;
const EXCLUDED_SUBCAT_RE = /(rodas|lonas|caminhões)/i;

async function fetchSunsetPage(page: number): Promise<RawSunsetPage> {
  const res = await fetch(`https://xbri.com.py/api/v1/products?page=${page}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; LeRadialSync/1.0)",
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Sunset Paraguay respondió HTTP ${res.status} en página ${page}`);
  }
  return (await res.json()) as RawSunsetPage;
}

function normalizeSunsetProducts(rawList: RawSunsetProduct[]): SunsetSyncItem[] {
  const out: SunsetSyncItem[] = [];
  for (const item of rawList) {
    const fullName = String(item.fullName || "").trim();
    const subcat = item.subcategory ? String(item.subcategory).trim() : null;
    if (!fullName || EXCLUDED_NAME_RE.test(fullName)) continue;
    if (subcat && EXCLUDED_SUBCAT_RE.test(subcat)) continue;

    const usdPrice = Number(item.price?.usd ?? 0);
    if (!Number.isFinite(usdPrice) || usdPrice <= 0) continue;

    out.push({
      id: item.id,
      fullName,
      size: item.size ? String(item.size).trim() : null,
      patternName: item.patternName ? String(item.patternName).trim() : null,
      subcategory: subcat,
      usdPrice,
      inStock: Boolean(item.inStock),
    });
  }
  return out;
}

/** Obtiene en vivo el catálogo completo de XBRI desde Sunset Paraguay (xbri.com.py) para previsualizar actualización en Admin. */
export const fetchSunsetCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase: supabaseAuthed, userId } = context;
    await assertAdmin(supabaseAuthed, userId);

    const firstPage = await fetchSunsetPage(1);
    const totalPages = Math.min(Math.max(1, Number(firstPage.meta?.lastPage || 1)), 25);

    const pageNumbers = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    const restPages = await Promise.all(pageNumbers.map((p) => fetchSunsetPage(p)));

    const allRaw: RawSunsetProduct[] = [
      ...(firstPage.data ?? []),
      ...restPages.flatMap((page) => page.data ?? []),
    ];

    const items = normalizeSunsetProducts(allRaw);

    return {
      fetchedAt: new Date().toISOString(),
      sourceUrl: "https://xbri.com.py/api/v1/products",
      totalPages,
      totalRaw: allRaw.length,
      pricedCount: items.length,
      items,
    };
  });
