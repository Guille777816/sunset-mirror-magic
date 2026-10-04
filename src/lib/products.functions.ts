import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/lib/supabase-auth-middleware";
import { supabase } from "@/integrations/supabase/client";
import { productIdSchema, productSchema } from "@/lib/products.schema";
import { assertAdmin } from "@/lib/products.server";

export const listPublicProducts = createServerFn({ method: "GET" }).handler(async () => {
  // Sólo las columnas que usa la vitrina: evita mandar textos largos y acelera la carga.
  const { data, error } = await supabase
    .from("products")
    .select("id,slug,brand,model,size,category,categories,price_ars,stock,image_url,is_featured,free_shipping,catalog_url")
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
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
      return { id };
    }
    const { data: created, error } = await supabaseAuthed
      .from("products")
      .insert(rest as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
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

/** Copia el mismo catálogo PDF a todas las medidas de una marca + modelo/familia (ej: FORZA HT y FORZA H/T). */
export const applyCatalogToModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => applyCatalogSchema.parse(input))
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
