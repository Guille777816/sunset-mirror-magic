import { createFileRoute } from "@tanstack/react-router";

// Webhook de Mercado Pago. MP no siempre firma la notificación en la práctica,
// por lo que SIEMPRE re-consultamos el pago contra la API de MP con nuestro
// access token; así descartamos suplantaciones antes de tocar la base.
export const Route = createFileRoute("/api/public/mp-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.MP_ACCESS_TOKEN;
        if (!token) return new Response("mp not configured", { status: 500 });

        const url = new URL(request.url);
        let paymentId: string | null =
          url.searchParams.get("data.id") ||
          url.searchParams.get("id") ||
          null;
        let topic =
          url.searchParams.get("type") ||
          url.searchParams.get("topic") ||
          null;

        try {
          const body = await request.json().catch(() => null as any);
          if (body) {
            paymentId = paymentId || body?.data?.id || body?.id || null;
            topic = topic || body?.type || body?.topic || null;
          }
        } catch {}

        // Sólo nos interesan los pagos; el resto lo confirmamos y salimos.
        if (topic && !String(topic).includes("payment")) {
          return new Response("ignored", { status: 200 });
        }
        if (!paymentId) return new Response("ok", { status: 200 });

        const res = await fetch(
          `https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(paymentId))}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) {
          console.error("mp-webhook fetch payment failed", res.status);
          return new Response("ok", { status: 200 });
        }
        const pay = await res.json();
        const orderId: string | null = pay?.external_reference ?? pay?.metadata?.order_id ?? null;
        const mpStatus: string = pay?.status ?? "unknown";
        if (!orderId) return new Response("ok", { status: 200 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const patch: Record<string, any> = {
          mp_payment_id: String(paymentId),
          mp_status: mpStatus,
          updated_at: new Date().toISOString(),
        };
        if (mpStatus === "approved") patch.status = "pagado";
        else if (mpStatus === "rejected" || mpStatus === "cancelled") patch.status = "cancelado";

        const { error } = await supabaseAdmin.from("orders").update(patch).eq("id", orderId);
        if (error) console.error("mp-webhook update error", error.message);

        return new Response("ok", { status: 200 });
      },
      GET: async () => new Response("ok", { status: 200 }),
    },
  },
});
