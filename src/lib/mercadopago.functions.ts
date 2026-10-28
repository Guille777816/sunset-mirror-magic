import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const inputSchema = z.object({
  order_id: z.string().uuid(),
  back_url_base: z.string().url().optional(),
  items: z.array(z.object({
    id: z.string().optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
    size: z.string().optional(),
    price_ars: z.number().optional(),
    qty: z.number().optional(),
  })).optional(),
  customer_name: z.string().optional(),
  customer_email: z.string().optional(),
  customer_phone: z.string().optional(),
});

export const createMpPreference = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => inputSchema.parse(i))
  .handler(async ({ data }) => {
    const DEFAULT_MP_ACCESS_TOKEN = "APP_USR-1189686297548167-102812-555475b31106d190a90341e07c3c29cc-3666126588";
    const token = process.env.MP_ACCESS_TOKEN || DEFAULT_MP_ACCESS_TOKEN;

    if (!token) {
      return {
        notConfigured: true,
        init_point: "",
        sandbox_init_point: "",
        preference_id: "",
        message: "Mercado Pago no está configurado actualmente. Podés abonar por Transferencia Bancaria o coordinar por WhatsApp.",
      };
    }

    let items = data.items || [];
    let customerName = data.customer_name;
    let customerEmail = data.customer_email;
    let customerPhone = data.customer_phone;

    // Si no vinieron los items por parámetro, intentamos leerlos de la base
    if (!items || items.length === 0) {
      try {
        const { data: order } = await supabase
          .from("orders")
          .select("id, customer_name, customer_email, customer_phone, items, total_ars, status")
          .eq("id", data.order_id)
          .maybeSingle();
        if (order) {
          items = Array.isArray(order.items) ? (order.items as any[]) : [];
          customerName = customerName || (order.customer_name ?? undefined);
          customerEmail = customerEmail || (order.customer_email ?? undefined);
          customerPhone = customerPhone || (order.customer_phone ?? undefined);
        }
      } catch {
        // ignore
      }
    }

    if (!items || items.length === 0) {
      throw new Error("No se encontraron productos para generar el cobro.");
    }

    const mpItems = items.map((it) => ({
      id: String(it.id ?? ""),
      title: `${it.brand ?? ""} ${it.model ?? ""} ${it.size ?? ""}`.trim() || "Neumático Le Radial",
      quantity: Number(it.qty) || 1,
      unit_price: Number(it.price_ars) || 0,
      currency_id: "ARS",
    }));

    const base = (data.back_url_base || "https://www.leradial.com.ar").replace(/\/+$/, "");
    const shortRef = data.order_id.slice(0, 8).toUpperCase();

    const payload = {
      items: mpItems,
      external_reference: data.order_id,
      statement_descriptor: "LE RADIAL",
      payer: {
        name: customerName || undefined,
        email: customerEmail || undefined,
        phone: customerPhone ? { number: customerPhone } : undefined,
      },
      back_urls: {
        success: `${base}/?pago=exito&ref=${shortRef}`,
        pending: `${base}/?pago=pendiente&ref=${shortRef}`,
        failure: `${base}/?pago=error&ref=${shortRef}`,
      },
      auto_return: "approved",
      notification_url: `${base}/api/public/mp-webhook`,
      metadata: { order_id: data.order_id },
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
      throw new Error(body?.message || "No se pudo iniciar el pago con Mercado Pago.");
    }

    try {
      await supabase
        .from("orders")
        .update({ mp_preference_id: body.id })
        .eq("id", data.order_id);
    } catch {
      // ignore
    }

    return {
      init_point: body.init_point as string,
      sandbox_init_point: body.sandbox_init_point as string,
      preference_id: body.id as string,
    };
  });
