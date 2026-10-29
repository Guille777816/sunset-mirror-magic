import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/lib/supabase-auth-middleware";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ItemSchema = z.object({
  id: z.string().uuid(),
  qty: z.number().int().min(1).max(99),
});

const OrderSchema = z.object({
  customer_name: z.string().min(2).max(120),
  customer_phone: z.string().min(5).max(40),
  customer_email: z.string().email().max(160).optional().or(z.literal("")),
  customer_address: z.string().max(300).optional().or(z.literal("")),
  notes: z.string().max(800).optional().or(z.literal("")),
  items: z.array(ItemSchema).min(1).max(50),
  back_url_base: z.string().optional(),
});

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => OrderSchema.parse(i))
  .handler(async ({ data }) => {
    // SEGURIDAD: precios SIEMPRE desde la base de datos, nunca desde el cliente
    const productIds = data.items.map((i) => i.id);
    const { data: dbProducts, error: prodErr } = await supabase
      .from("products")
      .select("id, brand, model, size, price_ars, is_active, free_shipping, image_url")
      .in("id", productIds);
    if (prodErr) throw new Error(prodErr.message);

    const map = new Map((dbProducts ?? []).map((p) => [p.id, p]));

    const verifiedItems = data.items.map((it) => {
      const p = map.get(it.id);
      if (!p || !p.is_active) throw new Error("Uno de los productos ya no está disponible.");
      return {
        id: p.id,
        brand: p.brand,
        model: p.model,
        size: p.size,
        price_ars: Number(p.price_ars),
        free_shipping: !!p.free_shipping,
        qty: it.qty,
      };
    });

    const total = verifiedItems.reduce((s, it) => s + it.price_ars * it.qty, 0);

    // Cargar datos bancarios usando cliente seguro sin depender de supabaseAdmin
    let settings: any = null;
    try {
      const { data: st } = await supabase
        .from("site_settings")
        .select("bank_name, bank_holder, bank_cbu, bank_alias, bank_extra, whatsapp")
        .eq("id", "main")
        .maybeSingle();
      settings = st;
    } catch {
      // ignore
    }

    const orderId = crypto.randomUUID();

    const DEFAULT_MP_ACCESS_TOKEN = "APP_USR-6019246233127130-102812-247332aec0379521ac48b01770a7b6e4-2418423393";
    const mpToken = process.env.MP_ACCESS_TOKEN || DEFAULT_MP_ACCESS_TOKEN;
    let initPoint: string | null = null;
    let mpPrefId: string | null = null;

    if (mpToken) {
      try {
        const shortRef = orderId.slice(0, 8).toUpperCase();
        const base = (data.back_url_base || "https://www.leradial.com.ar").replace(/\/+$/, "");
        const mpPayload = {
          items: verifiedItems.map((it) => ({
            id: String(it.id ?? ""),
            title: `${it.brand ?? ""} ${it.model ?? ""} ${it.size ?? ""}`.trim() || "Neumático Le Radial",
            quantity: Number(it.qty) || 1,
            unit_price: Number(it.price_ars) || 0,
            currency_id: "ARS",
          })),
          external_reference: orderId,
          statement_descriptor: "LE RADIAL",
          payer: {
            name: data.customer_name || undefined,
            email: data.customer_email || undefined,
            phone: { number: data.customer_phone || undefined },
          },
          back_urls: {
            success: `${base}/?pago=exito&ref=${shortRef}`,
            pending: `${base}/?pago=pendiente&ref=${shortRef}`,
            failure: `${base}/?pago=error&ref=${shortRef}`,
          },
          auto_return: "approved",
          notification_url: `${base}/api/public/mp-webhook`,
          metadata: { order_id: orderId },
        };

        const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mpToken}`,
          },
          body: JSON.stringify(mpPayload),
        });

        if (mpRes.ok) {
          const mpData: any = await mpRes.json();
          initPoint = mpData.init_point || null;
          mpPrefId = mpData.id || null;
        } else {
          const errBody = await mpRes.text();
          console.error("Mercado Pago preference creation failed:", errBody);
        }
      } catch (mpErr) {
        console.error("Mercado Pago fetch error:", mpErr);
      }
    }

    const { error } = await supabase
      .from("orders")
      .insert({
        id: orderId,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email || null,
        customer_address: data.customer_address || null,
        notes: data.notes || null,
        items: verifiedItems,
        total_ars: total,
        mp_preference_id: mpPrefId,
      });
    if (error) throw new Error(error.message);

    return {
      id: orderId,
      total,
      init_point: initPoint,
      payment: {
        bank_name: settings?.bank_name || "Banco",
        bank_holder: settings?.bank_holder || "Le Radial",
        bank_cbu: settings?.bank_cbu || "",
        bank_alias: "LERADIAL", // Alias oficial confirmado por Guillermo
        bank_extra: settings?.bank_extra || "",
        whatsapp: settings?.whatsapp || "5491178292980",
      },
    };
  });

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("No autorizado");
}

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const StatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pendiente", "pagado", "enviado", "entregado", "cancelado"]),
});

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => StatusSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("orders")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("orders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
