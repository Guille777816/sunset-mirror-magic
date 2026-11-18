import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/lib/supabase-auth-middleware";
import { supabase } from "@/integrations/supabase/client";
import { productIdSchema, productSchema } from "@/lib/products.schema";
import { assertAdmin } from "@/lib/products.server";

// Cache en memoria a nivel de Worker/Servidor para evitar consultas pesadas repetidas
// de 7.800+ productos a Supabase en cada visita (elimina tiempos de 4-8s y timeouts 500)
let cachedPublicProducts: any[] | null = null;
let cachedPublicProductsTime = 0;
let inflightPublicProductsPromise: Promise<any[]> | null = null;
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutos de caché en memoria del servidor

export function invalidatePublicProductsCache() {
  cachedPublicProducts = null;
  cachedPublicProductsTime = 0;
  inflightPublicProductsPromise = null;
}

export const listPublicProducts = createServerFn({ method: "GET" }).handler(async () => {
  const now = Date.now();
  if (cachedPublicProducts && now - cachedPublicProductsTime < CACHE_TTL_MS) {
    return cachedPublicProducts;
  }

  if (inflightPublicProductsPromise) {
    return inflightPublicProductsPromise;
  }

  inflightPublicProductsPromise = (async () => {
    try {
      // Timeout seguro de 6.5s para no bloquear el Worker ni el renderizado
      const queryPromise = supabase
        .from("products")
        .select("id,slug,brand,model,size,category,categories,price_ars,stock,image_url,is_featured,free_shipping,catalog_url")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });

      const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
        setTimeout(() => reject(new Error("Supabase public products query timed out")), 6500)
      );

      const { data, error } = await (Promise.race([queryPromise, timeoutPromise]) as any);
      if (error) throw new Error(error.message);

      const mapped = (data ?? []).map((p: any) => ({
        ...p,
        image_url: p.image_url && p.image_url.startsWith("data:") ? null : p.image_url,
      }));

      cachedPublicProducts = mapped;
      cachedPublicProductsTime = Date.now();
      return mapped;
    } catch (err) {
      console.error("[listPublicProducts] Error fetching from Supabase:", err);
      // Resiliencia crítica: si la base de datos se satura o demora, devolvemos la última caché disponible
      if (cachedPublicProducts && cachedPublicProducts.length > 0) {
        console.warn("[listPublicProducts] Devolviendo catálogo en caché previo como salvavidas");
        return cachedPublicProducts;
      }
      throw err;
    } finally {
      inflightPublicProductsPromise = null;
    }
  })();

  return inflightPublicProductsPromise;
});
export const listAllProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase: supabaseAuthed, userId } = context;
    await assertAdmin(supabaseAuthed, userId);
    const { data, error } = await supabaseAuthed
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => productSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase: supabaseAuthed, userId } = context;
    await assertAdmin(supabaseAuthed, userId);
    const { id, ...rest } = data;
    if (id) {
      const { error } = await supabaseAuthed.from("products").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      invalidatePublicProductsCache();
      return { id };
    }
    const { data: created, error } = await supabaseAuthed
      .from("products")
      .insert(rest as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    invalidatePublicProductsCache();
    return created;
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => productIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase: supabaseAuthed, userId } = context;
    await assertAdmin(supabaseAuthed, userId);
    const { error } = await supabaseAuthed.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    invalidatePublicProductsCache();
    return { ok: true };
  });

function extractModelFamily(model: string): string {
  const cleaned = model
    .replace(/\b(?:LT|LTR|SUV|AT|A\/T|MT|M\/T)?\s*\d{2,3}(?:\/\d{2,3})?[A-Z]\b/gi, "")
    .replace(/\b\d{1,2}PR\b/gi, "")
    .replace(/\b(?:LT|LTR)\b/gi, "")
    .replace(/\b\d{2,3}(?:\.\d{1,2})?\/\d{2,3}(?:\.\d{1,2})?R\d{2}[A-Z]*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length >= 3 ? cleaned : model.trim();
}

const applyCatalogSchema = z.object({
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(120),
  keyword: z.string().trim().max(100).optional(),
  catalog_url: z.string().max(2000).nullable(),
});

export const applyModelBatchAssetsSchema = z.object({
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(120),
  keyword: z.string().trim().max(100).optional(),
  catalog_url: z.string().max(2000).nullable().optional(),
  apply_catalog: z.boolean().optional(),
  image_url: z.string().nullable().optional(),
  apply_image: z.boolean().optional(),
  description: z.string().nullable().optional(),
  apply_description: z.boolean().optional(),
});

/** Copia foto, descripción y/o catálogo PDF a todas las medidas del mismo modelo/familia (ej: todos los DS2). */
export const applyModelBatchAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => applyModelBatchAssetsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase: supabaseAuthed, userId } = context;
    await assertAdmin(supabaseAuthed, userId);
    const exact = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
    
    const rawPattern = data.keyword?.trim() || extractModelFamily(data.model);
    // Normaliza acrónimos con o sin barra (HT <-> H/T, AT <-> A/T, MT <-> M/T, TA <-> T/A, RT <-> R/T)
    const normalizedPattern = exact(rawPattern)
      .replace(/\bH(?:\/|\\\/)?T\b/gi, "H%T")
      .replace(/\bA(?:\/|\\\/)?T\b/gi, "A%T")
      .replace(/\bM(?:\/|\\\/)?T\b/gi, "M%T")
      .replace(/\bT(?:\/|\\\/)?A\b/gi, "T%A")
      .replace(/\bR(?:\/|\\\/)?T\b/gi, "R%T");

    const updatePayload: Record<string, any> = {};
    if (data.apply_catalog) updatePayload.catalog_url = data.catalog_url ?? null;
    if (data.apply_image) updatePayload.image_url = data.image_url ?? null;
    if (data.apply_description) updatePayload.description = data.description ?? null;

    if (Object.keys(updatePayload).length === 0) {
      return { count: 0, matchedPattern: rawPattern };
    }

    let query = supabaseAuthed
      .from("products")
      .update(updatePayload as never)
      .ilike("brand", exact(data.brand));

    if (normalizedPattern.length >= 2) {
      query = query.ilike("model", `%${normalizedPattern}%`);
    } else {
      query = query.ilike("model", exact(data.model));
    }

    const { data: updated, error } = await query.select("id");
    if (error) throw new Error(error.message);
    invalidatePublicProductsCache();
    return { count: updated?.length ?? 0, matchedPattern: rawPattern };
  });

/** Copia el mismo catálogo PDF a todas las medidas de una marca + modelo/familia (ej: FORZA HT y FORZA H/T). */
export const applyCatalogToModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => applyCatalogSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase: supabaseAuthed, userId } = context;
    await assertAdmin(supabaseAuthed, userId);
    const exact = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
    
    const rawPattern = data.keyword?.trim() || extractModelFamily(data.model);
    const normalizedPattern = exact(rawPattern)
      .replace(/\bH(?:\/|\\\/)?T\b/gi, "H%T")
      .replace(/\bA(?:\/|\\\/)?T\b/gi, "A%T")
      .replace(/\bM(?:\/|\\\/)?T\b/gi, "M%T")
      .replace(/\bT(?:\/|\\\/)?A\b/gi, "T%A")
      .replace(/\bR(?:\/|\\\/)?T\b/gi, "R%T");

    let query = supabaseAuthed
      .from("products")
      .update({ catalog_url: data.catalog_url } as never)
      .ilike("brand", exact(data.brand));

    if (normalizedPattern.length >= 2) {
      query = query.ilike("model", `%${normalizedPattern}%`);
    } else {
      query = query.ilike("model", exact(data.model));
    }

    const { data: updated, error } = await query.select("id");
    if (error) throw new Error(error.message);
    invalidatePublicProductsCache();
    return { count: updated?.length ?? 0, matchedPattern: rawPattern };
  });


export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data, userId };
  });
