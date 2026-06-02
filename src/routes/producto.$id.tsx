import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Phone, ArrowLeft, ShoppingCart, Plus } from "lucide-react";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getSettings } from "@/lib/settings.functions";
import { useCart } from "@/lib/cart";
import tireCar from "@/assets/tire-car.jpg";
import tireSuv from "@/assets/tire-suv.jpg";
import tireTruck from "@/assets/tire-truck.jpg";
import tireAgro from "@/assets/tire-agro.jpg";

export const getProductById = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { data: p, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", data.id)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return p;
  });

const categoryImg: Record<string, string> = {
  autos: tireCar, camionetas: tireSuv, camiones: tireTruck, agricolas: tireAgro, industriales: tireTruck,
};

export const Route = createFileRoute("/producto/$id")({
  head: () => ({ meta: [{ title: "Producto — Le Radial" }] }),
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = useParams({ from: "/producto/$id" });
  const fetchP = useServerFn(getProductById);
  const fetchS = useServerFn(getSettings);
  const { data: p, isLoading } = useQuery({ queryKey: ["product", id], queryFn: () => fetchP({ data: { id } }) });
  const { data: s } = useQuery({ queryKey: ["settings"], queryFn: () => fetchS() });

  if (isLoading) return <div className="p-16 text-center text-muted-foreground">Cargando...</div>;
  if (!p) return (
    <div className="container mx-auto max-w-xl p-16 text-center">
      <h1 className="text-2xl font-bold text-secondary">Producto no encontrado</h1>
      <Link to="/" className="mt-6 inline-block rounded-full bg-primary px-6 py-2 text-sm font-bold uppercase text-primary-foreground">Volver</Link>
    </div>
  );

  const phone = s?.phone ?? "";
  const wa = s?.whatsapp ?? "";
  const msg = encodeURIComponent(`Hola! Estoy interesado en ${p.brand} ${p.model} ${p.size}.`);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl bg-muted shadow-[var(--shadow-product)]">
            <img src={p.image_url || categoryImg[p.category] || tireCar} alt={`${p.brand} ${p.model}`} className="aspect-square w-full object-cover" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">{p.brand}</p>
            <h1 className="mt-2 text-3xl font-black text-secondary md:text-4xl">{p.model}</h1>
            <p className="mt-2 text-lg text-muted-foreground">Medida: <strong>{p.size}</strong></p>
            <p className="mt-1 text-sm capitalize text-muted-foreground">Categoría: {p.category}</p>
            <p className="mt-6 text-4xl font-black text-secondary">$ {Number(p.price_ars).toLocaleString("es-AR")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{p.stock > 0 ? `Stock disponible: ${p.stock}` : "Sin stock — consultar"}</p>
            {p.description && <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-foreground/80">{p.description}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={`https://wa.me/${wa}?text=${msg}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-primary)]">
                <ShoppingCart className="h-4 w-4" /> Consultar por WhatsApp
              </a>
              {phone && (
                <a href={`tel:${phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 rounded-full border border-secondary/20 px-7 py-3 text-sm font-bold uppercase tracking-wider text-secondary">
                  <Phone className="h-4 w-4" /> {phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
