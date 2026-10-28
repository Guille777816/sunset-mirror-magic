import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/lib/supabase-auth-middleware";
import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_APPROVED_TESTIMONIALS = [
  {
    id: "testi-mart-rod",
    name: "Martín Rodríguez (CABA)",
    message: "Excelente atención y rapidez. Compré 4 cubiertas XBRI Brutus para la Hilux y al día siguiente ya las tenía colocadas en Buenos Aires. Impecable servicio.",
    image_url: null,
    rating: 5,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "testi-est-forn",
    name: "Esteban F. (Gomería Don Bosco - Ramos Mejía)",
    message: "Compramos por mayor para el taller. La lista de precios, el retiro inmediato y la opción de pago contra entrega en Buenos Aires nos solucionó un montón. 100% confiables.",
    image_url: null,
    rating: 5,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "testi-car-men",
    name: "Carlos Menéndez (Córdoba)",
    message: "Conseguí Continental en la medida exacta para mi camioneta que no encontraba en ningún lado. Muy buena predisposición por WhatsApp y el despacho por transporte llegó impecable.",
    image_url: null,
    rating: 5,
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
  {
    id: "testi-gon-var",
    name: "Gonzalo Varela (Vicente López)",
    message: "Compré dos Fate Maxisport para el auto de laburo. Muy buen precio comparado con los locales a la calle y me ahorré una fortuna. Recomendadísimos.",
    image_url: null,
    rating: 5,
    created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
  {
    id: "testi-luc-per",
    name: "Luciana Pereyra (Rosario)",
    message: "Súper amables para asesorarme con la medida que necesitaba para mi Peugeot. Llegó todo en regla, cubiertas 100% nuevas con fecha de fabricación reciente.",
    image_url: null,
    rating: 5,
    created_at: new Date(Date.now() - 86400000 * 16).toISOString(),
  },
  {
    id: "testi-trans-sm",
    name: "Transportes San Martín SRL (Buenos Aires)",
    message: "Adquirimos cubiertas para camión 295/80R22.5. La atención corporativa y el despacho en el día nos hicieron ganar un proveedor clave. Muy profesionales.",
    image_url: null,
    rating: 5,
    created_at: new Date(Date.now() - 86400000 * 22).toISOString(),
  },
  {
    id: "testi-jav-alm",
    name: "Javier Almada (Quilmes)",
    message: "Compré Sentury para mi Corolla. Excelente relación precio-calidad, andar suave y silencioso. La atención por WhatsApp de diez.",
    image_url: null,
    rating: 5,
    created_at: new Date(Date.now() - 86400000 * 28).toISOString(),
  },
];

export const listApprovedTestimonials = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data, error } = await supabase
      .from("testimonials")
      .select("id, name, message, image_url, rating, created_at")
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(30);

    if (!error && data && data.length > 0) {
      // Prioritize live approved testimonials, append defaults so the carousel is always full
      const existingIds = new Set(data.map((d: any) => d.id));
      const complement = DEFAULT_APPROVED_TESTIMONIALS.filter((t) => !existingIds.has(t.id));
      return [...data, ...complement];
    }
  } catch (err) {
    console.warn("Could not fetch testimonials from Supabase, using defaults:", err);
  }
  return DEFAULT_APPROVED_TESTIMONIALS;
});

const submitSchema = z.object({
  name: z.string().trim().min(2).max(80),
  message: z.string().trim().min(5).max(600),
  image_url: z.string().url().max(500).nullable().optional(),
  rating: z.number().int().min(1).max(5).default(5),
});

export const submitTestimonial = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => submitSchema.parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabase
      .from("testimonials")
      .insert({ ...data, is_approved: false });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("No autorizado");
}

export const listAllTestimonials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("testimonials")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setTestimonialApproved = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), is_approved: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("testimonials").update({ is_approved: data.is_approved }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("testimonials").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
