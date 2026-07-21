import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";

export const listPublicProducts = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

const productSchema = z.object({
  id: z.string().uuid().optional(),
  brand: z.string().min(1).max(80),
  model: z.string().min(1).max(120),
  size: z.string().min(1).max(80),
  category: z.enum(["autos", "camionetas", "camiones", "agricolas", "industriales"]),
  price_ars: z.number().min(0),
  stock: z.number().int().min(0),
  image_url: z.string().url().max(500).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  free_shipping: z.boolean().default(false),
});

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No autorizado");
}

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
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
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
