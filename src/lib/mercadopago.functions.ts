import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  order_id: z.string().uuid(),
  back_url_base: z.string().url(),
});

// Crea una preferencia de Mercado Pago para un pedido existente y devuelve el init_point.
// La orden ya fue creada por createOrder (que valida precios en el servidor), por lo que
// aquí re-cargamos los datos oficiales desde la base y NO confiamos en el cliente.
export const createMpPreference = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => inputSchema.parse(i))
  .handler(async ({ data }) => {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) throw new Error("Mercado Pago no está configurado.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, customer_name, customer_email, customer_phone, items, total_ars, status")
      .eq("id", data.order_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Pedido no encontrado.");
    if (order.status && order.status !== "pendiente") {
      throw new Error("Este pedido ya no admite pagos online.");
    }

    const items = Array.isArray(order.items) ? (order.items as any[]) : [];
    if (items.length === 0) throw new Error("El pedido no tiene productos.");

    const mpItems = items.map((it) => ({
      id: String(it.id ?? ""),
      title: `${it.brand ?? ""} ${it.model ?? ""} ${it.size ?? ""}`.trim() || "Producto",
      quantity: Number(it.qty) || 1,
      unit_price: Number(it.price_ars) || 0,
      currency_id: "ARS",
    }));

    const base = data.back_url_base.replace(/\/+$/, "");
    const shortRef = order.id.slice(0, 8).toUpperCase();

    const payload = {
      items: mpItems,
      external_reference: order.id,
      statement_descriptor: "LE RADIAL",
      payer: {
        name: order.customer_name || undefined,
        email: order.customer_email || undefined,
      },
      back_urls: {
        success: `${base}/?pago=exito&ref=${shortRef}`,
        pending: `${base}/?pago=pendiente&ref=${shortRef}`,
        failure: `${base}/?pago=error&ref=${shortRef}`,
      },
      auto_return: "approved",
      notification_url: `${base}/api/public/mp-webhook`,
      metadata: { order_id: order.id },
    };

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) {
      console.error("MP preference error", body);
      throw new Error(body?.message || "No se pudo iniciar el pago.");
    }

    await supabaseAdmin
      .from("orders")
      .update({ mp_preference_id: body.id })
      .eq("id", order.id);

    return {
      init_point: body.init_point as string,
      sandbox_init_point: body.sandbox_init_point as string,
      preference_id: body.id as string,
    };
  });
