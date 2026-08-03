import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";
import { productIdSchema, productSchema } from "@/lib/products.schema";
import { assertAdmin } from "@/lib/products.server";

export const listPublicProducts = createServerFn({ method: "GET" }).handler(async () => {
  // Sólo las columnas que usa la vitrina: evita mandar textos largos y acelera la carga.
  const { data, error } = await supabase
    .from("products")
    .select("id,brand,model,size,category,price_ars,stock,image_url,is_featured,free_shipping")
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
      .insert(rest)
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
