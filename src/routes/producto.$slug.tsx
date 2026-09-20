import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Phone, ArrowLeft, ShoppingCart, Plus } from "lucide-react";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { getSettings } from "@/lib/settings.functions";
import { useCart } from "@/lib/cart";
import { SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/seo.constants";
import tireCar from "@/assets/tire-car.jpg";
import tireSuv from "@/assets/tire-suv.jpg";
import tireTruck from "@/assets/tire-truck.jpg";
import tireAgro from "@/assets/tire-agro.jpg";
export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ slug: z.string().min(1) }).parse(i))
  .handler(async ({ data }) => {
    const { data: p, error } = await supabase
      .from("products")
      .select("*")
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return p;
  });

function optimizeImg(url: string | undefined | null, width = 900, quality = 80): string {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (url.includes("/storage/v1/object/public/")) {
    const rewritten = url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
    const sep = rewritten.includes("?") ? "&" : "?";
    return `${rewritten}${sep}width=${width}&quality=${quality}&resize=contain`;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&output=webp&q=${quality}&fit=contain`;
  }
  return url;
}

function formatDescription(desc: string | null | undefined): string {
  if (!desc) return "";
  return desc
    .replace(/:\s*\n\s*/g, ": ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const categoryImg: Record<string, string> = {
  autos: tireCar, camionetas: tireSuv, camiones: tireTruck, agricolas: tireAgro, industriales: tireTruck,
};

export const Route = createFileRoute("/producto/$slug")({
  loader: async ({ params }) => {
    const product = await getProductBySlug({ data: { slug: params.slug } }).catch(() => null);
    return { product };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product as any;
    const fullName = p ? [p.brand, p.model, p.size].filter(Boolean).join(" ").trim() : "Producto";
    const title = p ? `${fullName} — Le Radial` : "Producto — Le Radial";
    const description = p
      ? (p.description ? formatDescription(p.description).slice(0, 155) : `${fullName}. Comprá online en Le Radial, envíos a toda la Argentina.`)
      : "Cubiertas y neumáticos para autos, camionetas, camiones y agro.";
    const productUrl = p ? `${SITE_URL}/producto/${p.slug}` : SITE_URL;
    const imageUrl = p?.image_url ? optimizeImg(p.image_url, 900) : DEFAULT_OG_IMAGE;

    const scripts: Array<{ type: string; children: string }> = [];

    if (p) {
      // Schema.org Product + Offer JSON-LD
      const categoryLabel = (Array.isArray(p.categories) && p.categories.length ? p.categories[0] : p.category) || "";
      const productJsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: fullName,
        description: p.description ? formatDescription(p.description) : `Neumático ${fullName}.`,
        image: imageUrl,
        sku: p.slug,
        brand: {
          "@type": "Brand",
          name: p.brand,
        },
        offers: {
          "@type": "Offer",
          url: productUrl,
          priceCurrency: "ARS",
          price: Number(p.price_ars),
          itemCondition: "https://schema.org/NewCondition",
          availability: p.stock > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          seller: {
            "@type": "Organization",
            name: "Le Radial SRL",
          },
        },
      };

      // Schema.org BreadcrumbList JSON-LD
      const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Inicio",
            item: SITE_URL,
          },
          ...(categoryLabel
            ? [{
                "@type": "ListItem" as const,
                position: 2,
                name: categoryLabel.charAt(0).toUpperCase() + categoryLabel.slice(1),
                item: `${SITE_URL}/#catalogo`,
              }]
            : []),
          {
            "@type": "ListItem",
            position: categoryLabel ? 3 : 2,
            name: fullName,
          },
        ],
      };

      scripts.push(
        { type: "application/ld+json", children: JSON.stringify(productJsonLd) },
        { type: "application/ld+json", children: JSON.stringify(breadcrumbJsonLd) },
      );
    }

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:image", content: imageUrl },
        { property: "og:url", content: productUrl },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: imageUrl },
      ],
      links: [
        { rel: "canonical", href: productUrl },
      ],
      scripts,
    };
  },
  component: ProductDetail,
});

function ProductDetail() {
  const { slug } = useParams({ from: "/producto/$slug" });
  const fetchP = useServerFn(getProductBySlug);
  const fetchS = useServerFn(getSettings);
  const initial = Route.useLoaderData();
  const { data: p, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchP({ data: { slug } }),
    initialData: initial?.product as any,
  });
  const { data: s } = useQuery({ queryKey: ["settings"], queryFn: () => fetchS() });
  const cart = useCart();

  if (isLoading) return <div className="p-16 text-center text-muted-foreground">Cargando...</div>;
  if (!p) return (
    <div className="container mx-auto max-w-xl p-16 text-center">
      <h1 className="text-2xl font-bold text-secondary">Producto no encontrado</h1>
      <Link to="/" className="mt-6 inline-block rounded-full bg-primary px-6 py-2 text-sm font-bold uppercase text-primary-foreground">Volver</Link>
    </div>
  );

  const phone = s?.phone ?? "";
  const wa = s?.whatsapp ?? "";
  const fullName = [p.brand, p.model, p.size].filter(Boolean).join(" ").trim();
  const msg = encodeURIComponent(`Hola! Estoy interesado en ${fullName}.`);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl bg-muted shadow-[var(--shadow-product)]">
            <img
              src={optimizeImg(p.image_url, 900) || (categoryImg[(Array.isArray((p as any).categories) && (p as any).categories.length ? (p as any).categories[0] : p.category) as string] || tireCar)}
              alt={fullName}
              referrerPolicy="no-referrer"
              onError={(e) => {
                const el = e.currentTarget;
                const original = p.image_url || "";
                const placeholder = categoryImg[(Array.isArray((p as any).categories) && (p as any).categories.length ? (p as any).categories[0] : p.category) as string] || tireCar;
                if (original && el.src !== original && !el.dataset.triedOriginal) {
                  el.dataset.triedOriginal = "1";
                  el.src = original;
                } else if (el.src !== placeholder) {
                  el.src = placeholder;
                }
              }}
              className="aspect-square w-full object-cover"
            />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">{p.brand}</p>
            <h1 className="mt-2 text-3xl font-black text-secondary md:text-4xl">{p.model}</h1>
            {p.size ? <p className="mt-2 text-lg text-muted-foreground">Medida: <strong>{p.size}</strong></p> : null}
            <p className="mt-1 text-sm capitalize text-muted-foreground">Categoría: {(Array.isArray((p as any).categories) && (p as any).categories.length ? (p as any).categories : [p.category]).join(", ")}</p>
            <p className="mt-6 text-4xl font-black text-secondary">$ {Number(p.price_ars).toLocaleString("es-AR")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{p.stock > 0 ? `Stock disponible: ${p.stock}` : "Sin stock — consultar"}</p>
            {p.description && <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-foreground/80">{formatDescription(p.description)}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  cart.add({ id: p.id, brand: p.brand, model: p.model, size: p.size, price_ars: Number(p.price_ars), image_url: p.image_url });
                  cart.open();
                }}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-primary)] hover:scale-105 transition"
              >
                <Plus className="h-4 w-4" /> Agregar al carrito
              </button>
              <a href={`https://wa.me/${wa}?text=${msg}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full border border-secondary/20 px-7 py-3 text-sm font-bold uppercase tracking-wider text-secondary">
                <ShoppingCart className="h-4 w-4" /> Consultar por WhatsApp
              </a>
              {phone && (
                <a href={`tel:${phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 rounded-full border border-secondary/20 px-7 py-3 text-sm font-bold uppercase tracking-wider text-secondary">
                  <Phone className="h-4 w-4" /> {phone}
                </a>
              )}
            </div>
            <div className="mt-8 flex items-center gap-6 border-t border-border/60 pt-6">
             <img src="/inmetro.webp" alt="INMETRO" className="h-14 w-auto object-contain" />
<img src="/tuv.webp" alt="TÜV SÜD" className="h-14 w-auto object-contain" />
<img src="/garantia.webp" alt="Garantía 5 años" className="h-14 w-auto object-contain" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
