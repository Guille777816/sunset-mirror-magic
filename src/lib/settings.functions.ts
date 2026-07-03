import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Campos sensibles que NO se exponen públicamente
const SENSITIVE_FIELDS = ["bank_name", "bank_holder", "bank_cbu", "bank_alias", "bank_extra", "cuit"] as const;

function stripSensitive<T extends Record<string, any> | null>(row: T): T {
  if (!row) return row;
  const out: any = { ...row };
  for (const f of SENSITIVE_FIELDS) delete out[f];
  return out;
}

// Pública: usada por el sitio. NUNCA devuelve datos bancarios ni CUIT.
export const getSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("*")
    .eq("id", "main")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return stripSensitive(data);
});

// Admin: incluye datos bancarios para edición en el panel.
export const getAdminSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: role } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("No autorizado");
    const { data, error } = await supabaseAdmin
      .from("site_settings").select("*").eq("id", "main").maybeSingle();
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
  category_images: z.record(z.string(), z.string().max(500)).default({}),
  bank_name: z.string().max(120).default(""),
  bank_holder: z.string().max(150).default(""),
  bank_cbu: z.string().max(60).default(""),
  bank_alias: z.string().max(60).default(""),
  bank_extra: z.string().max(400).default(""),
  rate_usd: z.number().min(0).default(1450),
  rate_brl: z.number().min(0).default(279),
  rate_pyg: z.number().min(0).default(5.5),
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
