import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ItemSchema = z.object({
  id: z.string().uuid(),
  brand: z.string().max(120),
  model: z.string().max(120),
  size: z.string().max(60),
  price_ars: z.number().nonnegative(),
  qty: z.number().int().min(1).max(99),
});

const OrderSchema = z.object({
  customer_name: z.string().min(2).max(120),
  customer_phone: z.string().min(5).max(40),
  customer_email: z.string().email().max(160).optional().or(z.literal("")),
  customer_address: z.string().max(300).optional().or(z.literal("")),
  notes: z.string().max(800).optional().or(z.literal("")),
  items: z.array(ItemSchema).min(1).max(50),
});

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => OrderSchema.parse(i))
  .handler(async ({ data }) => {
    const total = data.items.reduce((s, it) => s + it.price_ars * it.qty, 0);
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email || null,
        customer_address: data.customer_address || null,
        notes: data.notes || null,
        items: data.items,
        total_ars: total,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, total };
  });

export const listOrders = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
});
