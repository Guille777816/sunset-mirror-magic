import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Phone, ShoppingCart, ArrowLeft, ShieldCheck, Truck, Clock } from "lucide-react";
import { listPublicProducts } from "@/lib/products.functions";
import { getSettings } from "@/lib/settings.functions";
import { useCart } from "@/lib/cart";
import { useCurrency } from "@/lib/currency";
import { SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/seo.constants";
import { SunsetStoreView } from "@/components/SunsetStoreView";
import { FloatingSearchButton } from "@/components/FloatingSearchButton";

const HEADER_LOGO_URL = "/images/logo-leradial.png";

const CATEGORY_MAP: Record<string, string> = {
  industrial: "industriales",
  industriales: "industriales",
  vial: "industriales",
  construccion: "industriales",
  mineria: "industriales",
  izaje: "industriales",
  carritos: "industriales",
  auto: "autos",
  autos: "autos",
  pasajero: "autos",
  camioneta: "camionetas",
  camionetas: "camionetas",
  "camioneta-comercial": "camionetas",
  camion: "camiones",
  camiones: "camiones",
  transporte: "camiones",
  agricola: "agricolas",
  agricolas: "agricolas",
  suv: "suv",
};

const CATEGORY_INFO: Record<string, { title: string; metaTitle: string; desc: string }> = {
  industriales: {
    title: "Neumáticos Industriales y Viales",
    metaTitle: "Neumáticos Industriales y Viales | Catálogo Oficial Le Radial",
    desc: "Cubiertas para autoelevadores, retroexcavadoras, palas cargadoras, motoniveladoras y maquinaria vial. Envíos a todo el país.",
  },
  agricolas: {
    title: "Neumáticos Agrícolas",
    metaTitle: "Neumáticos Agrícolas para Tractores y Cosechadoras | Le Radial",
    desc: "Cubiertas agrícolas de alta tracción y durabilidad para campo, tractores, cosechadoras e implementos con garantía oficial.",
  },
  camiones: {
    title: "Neumáticos para Camiones",
    metaTitle: "Cubiertas para Camiones y Transporte Pesado | Le Radial",
    desc: "Neumáticos radiales para transporte pesado, camiones y colectivos. Rendimiento kilométrico superior y precios directos.",
  },
  camionetas: {
    title: "Neumáticos para Camionetas y SUV",
    metaTitle: "Neumáticos para Camionetas y Pickups | Le Radial",
    desc: "Cubiertas AT, MT, HT para camionetas, pickups y utilitarios. Todas las medidas listas para despacho.",
  },
  autos: {
    title: "Neumáticos para Autos",
    metaTitle: "Neumáticos para Autos | Catálogo con Envíos a Todo el País | Le Radial",
    desc: "Cubiertas de primera calidad para vehículos de pasajeros con máxima adherencia, frenado seguro y financiación.",
  },
  suv: {
    title: "Neumáticos SUV",
    metaTitle: "Cubiertas para SUV | Le Radial",
    desc: "Neumáticos de máximo confort y seguridad para vehículos SUV y crossover.",
  },
};

export const Route = createFileRoute("/categoria/$category")({
  head: ({ params }) => {
    const rawCat = (params?.category || "").toLowerCase();
    const resolvedCat = CATEGORY_MAP[rawCat] || "industriales";
    const info = CATEGORY_INFO[resolvedCat] || CATEGORY_INFO.industriales;
    const pageUrl = `${SITE_URL}/categoria/${rawCat}`;

    return {
      meta: [
        { title: info.metaTitle },
        { name: "description", content: info.desc },
        { property: "og:title", content: info.metaTitle },
        { property: "og:description", content: info.desc },
        { property: "og:type", content: "website" },
        { property: "og:image", content: DEFAULT_OG_IMAGE },
        { property: "og:url", content: pageUrl },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: DEFAULT_OG_IMAGE },
      ],
      links: [{ rel: "canonical", href: pageUrl }],
    };
  },
  loader: async () => {
    const [products, settings] = await Promise.all([
      listPublicProducts().catch(() => []),
      getSettings().catch(() => null),
    ]);
    return {
      products: Array.isArray(products) ? products : [],
      settings: settings ?? null,
    };
  },
  staleTime: 60_000,
  component: CategoryPage,
});

function CategoryPage() {
  const { category: rawCategory } = useParams({ from: "/categoria/$category" });
  const navigate = useNavigate();
  const loaderData = Route.useLoaderData();
  const { count: cartCount } = useCart();
  const { format } = useCurrency();

  const resolvedCategory = useMemo(() => {
    const raw = (rawCategory || "").toLowerCase();
    return CATEGORY_MAP[raw] || "industriales";
  }, [rawCategory]);

  const [activeCategory, setActiveCategory] = useState<string | null>(resolvedCategory);

  const { data: products = loaderData.products } = useQuery({
    queryKey: ["products", "public"],
    queryFn: async () => {
      const res = await listPublicProducts();
      return Array.isArray(res) ? res : [];
    },
    initialData: loaderData.products,
    staleTime: 60_000,
  });

  const { data: settings = loaderData.settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => getSettings(),
    initialData: loaderData.settings,
    staleTime: 300_000,
  });

  const info = CATEGORY_INFO[activeCategory || resolvedCategory] || CATEGORY_INFO.industriales;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-[#070b14]/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Inicio</span>
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <Link to="/" className="flex items-center gap-2">
              <img
                src={HEADER_LOGO_URL}
                alt="Le Radial"
                className="h-8 md:h-10 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <span className="font-black text-lg md:text-xl tracking-tight text-white hidden sm:inline">
                LE <span className="text-amber-400">RADIAL</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {settings?.phone && (
              <a
                href={`tel:${settings.phone.replace(/[^0-9+]/g, "")}`}
                className="hidden md:inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-amber-400 border border-slate-700/60 rounded-full px-3 py-1.5 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>{settings.phone}</span>
              </a>
            )}

            <Link
              to="/"
              className="relative p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
              title="Ver Carrito"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Categoría */}
      <section className="bg-gradient-to-b from-slate-900 via-[#0a0f1d] to-[#070b14] py-8 border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-bold tracking-wide uppercase mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Garantía Oficial de Fábrica por 5 Años</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2">
              {info.title}
            </h1>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed mb-4">
              {info.desc}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>Envíos a todo el país</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Despacho directo de depósito</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vista de Catálogo / SunsetStoreView */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        <SunsetStoreView
          products={products as any[]}
          selectedCategory={activeCategory}
          onSelectCategory={(cat) => {
            setActiveCategory(cat);
            if (cat) {
              navigate({ to: "/categoria/$category", params: { category: cat } });
            } else {
              navigate({ to: "/" });
            }
          }}
          onBackToHome={() => navigate({ to: "/" })}
        />
      </main>

      <FloatingSearchButton />
    </div>
  );
}
