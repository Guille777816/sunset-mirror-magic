import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("*")
    .eq("id", "main")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
});

const settingsSchema = z.object({
  phone: z.string().min(1).max(80),
  whatsapp: z.string().min(1).max(40),
  email: z.string().email().max(200),
  address: z.string().min(1).max(300),
  business_name: z.string().max(150).default(""),
  cuit: z.string().max(40).default(""),
  instagram: z.string().max(200).default(""),
  facebook: z.string().max(200).default(""),
  hours: z.string().max(200).default(""),
  hero_eyebrow: z.string().max(120),
  hero_title: z.string().max(120),
  hero_subtitle: z.string().max(160),
  hero_description: z.string().max(600),
  promo_banner: z.string().max(300),
  logo_url: z.string().max(500).default(""),
  hero_image_url: z.string().max(500).default(""),
});

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => settingsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("No autorizado");
    const { error } = await supabaseAdmin
      .from("site_settings")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", "main");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
