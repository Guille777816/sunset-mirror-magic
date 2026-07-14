import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Phone, ShoppingCart, User, Users, Search, Truck, AlertTriangle, MapPin, Plus, Instagram, Facebook, Star, ChevronDown, Camera } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import heroTire from "@/assets/hero-tire.jpg";
import tireCar from "@/assets/tire-car.jpg";
import tireSuv from "@/assets/tire-suv.jpg";
import tireTruck from "@/assets/tire-truck.jpg";
import tireAgro from "@/assets/tire-agro.jpg";
import leRadialHeaderAsset from "@/assets/le-radial-header.jpg.asset.json";
import leRadialCircleAsset from "@/assets/le-radial-circle.png.asset.json";
import medidaAsset from "@/assets/medida-cubiertas.webp.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { listPublicProducts } from "@/lib/products.functions";
import { getSettings } from "@/lib/settings.functions";
import { listPublicBanners } from "@/lib/banners.functions";
import { listApprovedTestimonials, submitTestimonial } from "@/lib/testimonials.functions";
import { useCart } from "@/lib/cart";
import { useCurrency, CURRENCIES, type Currency } from "@/lib/currency";

const HEADER_LOGO_URL = leRadialHeaderAsset.url;
const CIRCLE_LOGO_URL = leRadialCircleAsset.url;
const MEDIDA_IMG_URL = medidaAsset.url;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Le Radial — Cubiertas y neumáticos en Buenos Aires" },
      { name: "description", content: "Venta de cubiertas para autos, camionetas, camiones y maquinaria agrícola. Buscá por medida, elegí tu moneda y comprá online. Envíos a toda la Argentina." },
      { property: "og:title", content: "Le Radial — Cubiertas y neumáticos" },
      { property: "og:description", content: "Cubiertas para autos, camionetas, camiones y agro. Envíos a toda la Argentina." },
    ],
  }),
  component: Index,
});

const CATEGORY_CONFIG = [
  { slug: "autos",        label: "Autos",        img: tireCar },
  { slug: "camionetas",   label: "Camionetas",   img: tireSuv },
  { slug: "camiones",     label: "Camiones",     img: tireTruck },
  { slug: "agricolas",    label: "Agrícolas",    img: tireAgro },
  { slug: "industriales", label: "Industriales", img: tireTruck },
];

const categoryImg: Record<string, string> = {
  autos: tireCar, camionetas: tireSuv, camiones: tireTruck, agricolas: tireAgro, industriales: tireTruck,
};

// Optimiza URLs: Supabase Storage usa el endpoint de render; URLs externas
// (sunset.com.py, fate.com.ar, etc.) se enrutan por images.weserv.nl para
// evitar bloqueos de hotlinking (Referer) y servir con CDN + resize.
function optimizeImg(url: string | undefined | null, width: number, quality = 70): string {
  if (!url) return "";
  if (url.includes("/storage/v1/object/public/")) {
    const rewritten = url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
    const sep = rewritten.includes("?") ? "&" : "?";
    return `${rewritten}${sep}width=${width}&quality=${quality}&resize=contain`;
  }
  if (/^https?:\/\//i.test(url)) {
    const clean = url.replace(/^https?:\/\//i, "");
    return `https://images.weserv.nl/?url=${encodeURIComponent(clean)}&w=${width}&q=${quality}&output=webp`;
  }
  return url;
}

const widths = [
  "Todos",
  "145","155","165","175","185","195","205","215","225","235","245","255","265","275","285","295","305","315","320","385","400","405","460","600","650","850",
  "05.00","06.00","06.50","07.00","07.50","08.25","08.30","09.00","09.50",
  "10.00","10.5/80","11.00","12.4","12.5/80","13.00","13.6","14.00","14.9","15.5",
  "16.70","16.90","17.5","18.4","19.5","20.5","20.8","21.00","23.1","23.5","24.5",
  "27","28.00","30.5","31.00","32.00","33.00","35.00",
];
const heights = ["Todos","8.50","10.50","12.50","25","30","35","40","45","50","55","60","65","70","75","80","85"];
const rims = [
  "Todos",
  "08","10","12","13","14","15","15.3","15.5","16","16.5","17","17.5","18","19","19.5","20","21","22","22.5",
  "24","24.5","25","26","28","30","30.5","32","34","36","38","42",
];

function Index() {
  const [w, setW] = useState("Todos");
  const [h, setH] = useState("Todos");
  const [r, setR] = useState("Todos");
  const [searchActive, setSearchActive] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const cart = useCart();
  const { currency, setCurrency, setRates } = useCurrency();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => subscription.unsubscribe();
  }, []);

  const fetchProducts = useServerFn(listPublicProducts);
  const fetchSettings = useServerFn(getSettings);
  const fetchBanners = useServerFn(listPublicBanners);
  const { data: products = [] } = useQuery({
    queryKey: ["public-products"],
    queryFn: () => fetchProducts(),
  });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => fetchSettings() });
  const { data: banners = [] } = useQuery({ queryKey: ["public-banners"], queryFn: () => fetchBanners() });
  const fetchTestimonials = useServerFn(listApprovedTestimonials);
  const { data: testimonials = [] } = useQuery({ queryKey: ["public-testimonials"], queryFn: () => fetchTestimonials() });

  // Sync rates from settings so the currency switcher converts using admin-managed values
  useEffect(() => {
    if (!settings) return;
    const s: any = settings;
    setRates({
      rate_usd: Number(s.rate_usd) || 1450,
      rate_brl: Number(s.rate_brl) || 279,
      rate_pyg: Number(s.rate_pyg) || 5.5,
    });
  }, [settings, setRates]);

  const phone = settings?.phone ?? "(376) 4-000000";
  const phoneHref = "tel:" + (settings?.phone ?? "").replace(/\s/g, "");
  const whatsappHref = `https://wa.me/${settings?.whatsapp ?? "5493764000000"}`;

  // Search filter
  const searchResults = useMemo(() => {
    if (!searchActive) return [];
    return (products as any[]).filter((p) => {
      const size = String(p.size || "");
      if (w !== "Todos" && !size.includes(w)) return false;
      if (h !== "Todos" && !size.includes(h)) return false;
      if (r !== "Todos" && !new RegExp(`\\b${r}\\b|R${r}\\b`).test(size)) return false;
      return true;
    });
  }, [products, w, h, r, searchActive]);

  // Solo productos destacados (promo) en la portada
  const featured = useMemo(
    () => (products as any[]).filter((p) => p.is_featured),
    [products]
  );
  // Carruseles auto-scroll por categoría
  const autos = useMemo(() => (products as any[]).filter((p) => p.category === "autos"), [products]);
  const camionetas = useMemo(() => (products as any[]).filter((p) => p.category === "camionetas"), [products]);
  const camiones = useMemo(() => (products as any[]).filter((p) => p.category === "camiones"), [products]);

  // Handle nav category click
  function handleCategoryNav(slug: string) {
    setSearchActive(false);
    setActiveCategory(slug);
    setTimeout(() => {
      document.getElementById(`cat-${slug}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <div className="bg-secondary text-secondary-foreground text-xs">
        <div className="container mx-auto flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            {settings?.address && (
              <>
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span>{settings.address}</span>
              </>
            )}
          </div>
          <div className="hidden gap-4 md:flex">
            <span>{(settings as any)?.hours || "Lun a Vie 8:00 – 18:00"}</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
          <a href="/" className="flex items-center gap-2">
            <img
              src={settings?.logo_url || HEADER_LOGO_URL}
              alt={settings?.business_name || "Le Radial"}
              className="h-14 w-auto max-w-[240px] object-contain"
            />
          </a>
          <div className="hidden items-center gap-6 lg:flex">
            <a href={phoneHref} className="flex items-center gap-2 text-sm font-semibold">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
                <Phone className="h-4 w-4" />
              </span>
              {phone}
            </a>
            {authed ? (
              <>
                <Link to="/admin" className="flex items-center gap-2 text-sm font-semibold hover:text-primary">
                  <Users className="h-5 w-5" /> Admin
                </Link>
                <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 text-sm font-semibold hover:text-primary">
                  <User className="h-5 w-5" /> Salir
                </button>
              </>
            ) : (
              <Link to="/login" className="flex items-center gap-2 text-sm font-semibold hover:text-primary">
                <User className="h-5 w-5" /> Login
              </Link>
            )}
            <CurrencySelect value={currency} onChange={setCurrency} />
            <button onClick={cart.open} aria-label="Carrito" className="relative grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground hover:scale-105 transition">
              <ShoppingCart className="h-5 w-5" />
              {cart.count > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-secondary px-1 text-[10px] font-bold text-secondary-foreground">{cart.count}</span>}
            </button>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <CurrencySelect value={currency} onChange={setCurrency} compact />
            <button onClick={cart.open} aria-label="Carrito" className="relative grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
              <ShoppingCart className="h-5 w-5" />
              {cart.count > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-secondary px-1 text-[10px] font-bold text-secondary-foreground">{cart.count}</span>}
            </button>
            <a href={phoneHref} aria-label="Llamar" className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-secondary-foreground">
              <Phone className="h-5 w-5" />
            </a>
          </div>
        </div>
        {/* Nav — Inicio + categorías clickeables */}
        <nav className="border-t bg-muted">
          <div className="container mx-auto flex items-center overflow-x-auto px-4">
            <button
              onClick={() => { setActiveCategory(null); setSearchActive(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className={`whitespace-nowrap px-4 py-3 text-sm font-semibold uppercase tracking-wide transition ${
                !activeCategory && !searchActive
                  ? "border-b-2 border-primary text-primary"
                  : "text-secondary hover:text-primary"
              }`}
            >
              Inicio
            </button>
            {CATEGORY_CONFIG.map((c) => (
              <button
                key={c.slug}
                onClick={() => handleCategoryNav(c.slug)}
                className={`whitespace-nowrap px-4 py-3 text-sm font-semibold uppercase tracking-wide transition ${
                  activeCategory === c.slug
                    ? "border-b-2 border-primary text-primary"
                    : "text-secondary hover:text-primary"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <img src={settings?.hero_image_url || heroTire} alt="Cubierta off-road" width={1600} height={700}
          className="absolute inset-0 h-full w-full object-cover opacity-50" />
        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-primary">{settings?.hero_eyebrow ?? "Nueva línea 2026"}</p>
          <h1 className="max-w-2xl text-4xl font-black uppercase leading-[0.95] text-white md:text-6xl">
            {settings?.hero_title ?? "Brutus A/T"}
            <span className="mt-2 block text-primary">{settings?.hero_subtitle ?? "Dominio total del terreno"}</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/80 md:text-lg">{settings?.hero_description ?? ""}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#banners" className="rounded-full bg-primary px-7 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-primary)] transition hover:scale-105">
              Ver productos
            </a>
            <a href="#buscador" className="rounded-full border border-white/30 px-7 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-white/10">
              Buscar por medida
            </a>
          </div>
        </div>
      </section>

      {/* Buscador */}
      <section id="buscador" className="bg-muted py-12">
        <div className="container mx-auto px-4">
          <h2 className="mb-2 text-center text-2xl font-bold text-secondary md:text-3xl">
            Buscar cubiertas por medida
          </h2>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Fijate en el flanco de tu cubierta: <strong>ancho / alto R aro</strong> (ej. 175/70R14).
          </p>
          <div className="mx-auto mb-6 grid max-w-4xl items-center gap-6 overflow-hidden rounded-2xl bg-card p-4 shadow-[var(--shadow-product)] md:grid-cols-2 md:p-6">
            <img
              src={MEDIDA_IMG_URL}
              alt="Cómo conocer la medida de sus cubiertas: ancho, alto y aro"
              className="mx-auto w-full max-w-sm object-contain md:max-w-md"
              loading="lazy"
              decoding="async"
            />
            <div className="text-center md:text-left">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary md:text-sm">
                Cómo conocer la medida de sus cubiertas
              </p>
              <div className="flex items-end justify-center gap-4 md:justify-start md:gap-6">
                <div className="text-center">
                  <span className="block text-4xl font-black leading-none text-secondary md:text-5xl">175</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground md:text-sm">Ancho</span>
                </div>
                <div className="text-center">
                  <span className="block text-4xl font-black leading-none text-secondary md:text-5xl">70</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground md:text-sm">Alto</span>
                </div>
                <div className="text-center">
                  <span className="block text-4xl font-black leading-none text-secondary md:text-5xl">14</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground md:text-sm">Aro</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl gap-4 rounded-2xl bg-card p-6 shadow-[var(--shadow-product)] md:grid-cols-[1fr_1fr_1fr_auto]">
            <Select label="Ancho" value={w} onChange={setW} options={widths} />
            <Select label="Alto" value={h} onChange={setH} options={heights} />
            <Select label="Aro" value={r} onChange={setR} options={rims} />
            <div className="flex items-end gap-2">
              <button
                onClick={() => {
                  setSearchActive(true);
                  setActiveCategory(null);
                  document.getElementById("resultados-busqueda")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-8 font-bold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-primary)] transition hover:scale-[1.02]"
              >
                <Search className="h-4 w-4" /> Buscar
              </button>
              {searchActive && (
                <button
                  onClick={() => { setSearchActive(false); setW("Todos"); setH("Todos"); setR("Todos"); }}
                  className="h-12 rounded-full border px-4 text-xs font-bold uppercase text-secondary"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>
      </section>



      {/* Resultados de búsqueda */}
      {searchActive && (
        <section id="resultados-busqueda" className="bg-background py-12">
          <div className="container mx-auto px-4">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Resultados</p>
              <h2 className="mt-1 text-2xl font-black text-secondary">{searchResults.length} producto(s) encontrado(s)</h2>
            </div>
            {searchResults.length === 0 ? (
              <div className="rounded-2xl bg-muted p-10 text-center text-muted-foreground">
                No encontramos cubiertas con esa medida. Probá ajustar los filtros o consultanos directamente.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {searchResults.map((p: any) => <ProductCard key={p.id} p={p} />)}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Banner */}
      <section className="bg-primary py-6 text-primary-foreground">
        <div className="container mx-auto grid gap-3 px-4 text-center text-sm md:grid-cols-3 md:text-left">
          <div className="flex items-center justify-center gap-2 md:justify-start">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{settings?.promo_banner ?? "Precios promocionales con descuentos especiales."}</span>
          </div>
          <div className="flex items-center justify-center gap-2 md:justify-start">
            <ShoppingCart className="h-5 w-5 shrink-0" />
            <span>Válidos sólo para compras <strong>online</strong>.</span>
          </div>
          <div className="flex items-center justify-center gap-2 md:justify-start">
            <Truck className="h-5 w-5 shrink-0" />
            <span>Costo de envío <strong>no incluido</strong>.</span>
          </div>
        </div>
      </section>

      {/* Banners administrables (rotan solos) */}
      {!searchActive && !activeCategory && banners.length > 0 && (
        <section id="banners" className="container mx-auto px-4 py-10">
          <BannerCarousel banners={banners as any[]} circleLogoUrl={CIRCLE_LOGO_URL} />
        </section>
      )}

      {/* Carruseles auto-scroll por categoría (estilo página original) */}
      {!searchActive && !activeCategory && (
        <>
          {autos.length > 0 && (
            <AutoCarousel id="auto-autos" eyebrow="Autos" title="Cubiertas para autos" items={autos} bg="bg-muted" direction="left" />
          )}
          {camionetas.length > 0 && (
            <AutoCarousel id="auto-camionetas" eyebrow="Camionetas" title="Cubiertas para camionetas" items={camionetas} bg="bg-background" direction="right" />
          )}
          {camiones.length > 0 && (
            <AutoCarousel id="auto-camiones" eyebrow="Camiones" title="Cubiertas para camiones" items={camiones} bg="bg-muted" direction="left" />
          )}
        </>
      )}

      {/* Carrusel destacados (promo) */}
      {!searchActive && featured.length > 0 && (
        <PromoCarousel id="promo-top" eyebrow="Promo destacada" title="Ofertas seleccionadas" items={featured} bg="bg-background" />
      )}

      {/* Estado vacío */}
      {!searchActive && featured.length === 0 && autos.length === 0 && camionetas.length === 0 && camiones.length === 0 && (
        <section className="py-12 text-center text-muted-foreground">
          <p>Todavía no hay productos cargados. Agregalos desde el panel admin.</p>
        </section>
      )}

      {/* Sección de categoría activa (solo cuando el usuario hace click en una categoría) */}
      {!searchActive && activeCategory && (() => {
        const c = CATEGORY_CONFIG.find((x) => x.slug === activeCategory);
        if (!c) return null;
        const items = (products as any[]).filter((p) => p.category === c.slug);
        return (
          <CategorySection
            key={c.slug}
            slug={c.slug}
            label={c.label}
            items={items}
            onBack={() => setActiveCategory(null)}
          />
        );
      })()}

      {/* Testimonios */}
      {!searchActive && (
        <TestimonialsSection testimonials={testimonials as any[]} />
      )}

      {/* Preguntas frecuentes */}
      {!searchActive && <FaqSection whatsappHref={whatsappHref} />}

      {/* Beneficios */}
      <section className="container mx-auto grid gap-6 px-4 py-16 md:grid-cols-3">
        {[
          { icon: Truck, title: "Envíos a toda la Argentina", desc: "Coordinamos con transportadoras de confianza a cualquier provincia." },
          { icon: ShoppingCart, title: "Compra 100% online", desc: "Reservá tu cubierta en minutos y retirá en local o recibí en tu domicilio." },
          { icon: Users, title: "Plan revendedores", desc: "Precios mayoristas y soporte dedicado para gomerías y talleres." },
        ].map((b) => (
          <div key={b.title} className="rounded-2xl border bg-card p-6">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
              <b.icon className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-secondary">{b.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="bg-secondary text-secondary-foreground">
        <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-4">
          <div>
            <img
              src={settings?.logo_url || CIRCLE_LOGO_URL}
              alt={settings?.business_name || "Le Radial"}
              className="h-20 w-auto object-contain"
            />
            <p className="mt-3 text-sm opacity-70">Cubiertas y neumáticos para autos, camionetas, camiones y agro.</p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-primary">Categorías</h4>
            <ul className="space-y-2 text-sm opacity-80">
              {CATEGORY_CONFIG.map((c) => (
                <li key={c.slug}>
                  <button onClick={() => handleCategoryNav(c.slug)} className="hover:text-primary hover:opacity-100">
                    {c.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-primary">Empresa</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li>Revendedores</li>
              <li>Contacto</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-primary">Atención</h4>
            <p className="text-sm opacity-80">{phone}</p>
            {settings?.email && <p className="text-sm opacity-80">{settings.email}</p>}
            {settings?.address && <p className="mt-2 text-sm opacity-80">{settings.address}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-xs font-bold text-white hover:opacity-90"
              >
                WhatsApp
              </a>
              {(settings as any)?.instagram && (
                <a
                  href={(settings as any).instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white hover:opacity-90"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {(settings as any)?.facebook && (
                <a
                  href={(settings as any).facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="grid h-9 w-9 place-items-center rounded-full bg-[#1877F2] text-white hover:opacity-90"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs opacity-60">
          © {new Date().getFullYear()} Le Radial · Todos los derechos reservados
        </div>
      </footer>
    </div>
  );
}

function ProductCard({ p }: { p: any }) {
  const cart = useCart();
  const { format } = useCurrency();
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-product)] transition hover:-translate-y-1">
      <Link to="/producto/$id" params={{ id: p.id }} className="relative block aspect-square overflow-hidden bg-muted">
        {p.is_featured && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
            Promo
          </span>
        )}
        {p.free_shipping && (
          <span className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-green-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
            <Truck className="h-3 w-3" /> Envío gratis
          </span>
        )}
        <img
          src={optimizeImg(p.image_url, 500) || categoryImg[p.category] || tireCar}
          alt={`${p.brand} ${p.model}`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          width={500}
          height={500}
          onError={(e) => {
            const el = e.currentTarget;
            const original = p.image_url || "";
            const placeholder = categoryImg[p.category] || tireCar;
            if (original && el.src !== original && !el.dataset.triedOriginal) {
              el.dataset.triedOriginal = "1";
              el.src = original;
            } else if (el.src !== placeholder) {
              el.src = placeholder;
            }
          }}
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link to="/producto/$id" params={{ id: p.id }} className="block">
          <p className="text-sm font-extrabold uppercase tracking-wider text-primary">{p.brand}</p>
          <h3 className="mt-1 line-clamp-2 text-sm font-bold text-secondary hover:text-primary">{p.model}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{p.size}</p>
        </Link>
        <div className="mt-auto pt-4">
          <p className="text-lg font-black text-secondary">{format(Number(p.price_ars))}</p>
          <div className="mt-3 flex gap-2">
            <Link
              to="/producto/$id"
              params={{ id: p.id }}
              className="flex-1 rounded-full border border-secondary/20 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-secondary hover:bg-secondary hover:text-secondary-foreground transition"
            >
              Ver
            </Link>
            <button
              onClick={() => {
                cart.add({ id: p.id, brand: p.brand, model: p.model, size: p.size, price_ars: Number(p.price_ars), image_url: p.image_url });
                cart.open();
              }}
              className="flex flex-1 items-center justify-center gap-1 rounded-full bg-primary py-2 text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-primary)] hover:scale-[1.02] transition"
            >
              <Plus className="h-3 w-3" /> Carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-secondary">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-full border border-input bg-background px-5 text-sm font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function PromoCarousel({ id, eyebrow, title, items, bg }: { id: string; eyebrow: string; title: string; items: any[]; bg: string }) {
  const scrollerRef = (typeof window !== "undefined") ? (null as any) : null;
  function scroll(dir: -1 | 1) {
    const el = document.getElementById(`${id}-scroller`);
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.85), behavior: "smooth" });
  }
  return (
    <section id={id} className={`py-12 ${bg}`}>
      <div className="container mx-auto px-4">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">{eyebrow}</p>
            <h2 className="mt-1 text-2xl font-black text-secondary md:text-3xl">{title}</h2>
          </div>
          <div className="hidden gap-2 md:flex">
            <button onClick={() => scroll(-1)} aria-label="Anterior" className="grid h-10 w-10 place-items-center rounded-full border bg-card hover:bg-primary hover:text-primary-foreground transition">‹</button>
            <button onClick={() => scroll(1)} aria-label="Siguiente" className="grid h-10 w-10 place-items-center rounded-full border bg-card hover:bg-primary hover:text-primary-foreground transition">›</button>
          </div>
        </div>
        <div
          id={`${id}-scroller`}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]"
        >
          {items.map((p) => (
            <div key={p.id} className="w-[70%] shrink-0 snap-start sm:w-[45%] md:w-[32%] lg:w-[24%]">
              <ProductCard p={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategorySection({ slug, label, items, onBack }: { slug: string; label: string; items: any[]; onBack: () => void }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    const tokens = term.split(/\s+/).filter(Boolean);
    return items.filter((p) => {
      const hay = `${p.brand ?? ""} ${p.model ?? ""} ${p.size ?? ""}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }, [items, q]);
  return (
    <section id={`cat-${slug}`} className="bg-muted py-12">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Categoría</p>
            <h2 className="mt-1 text-2xl font-black text-secondary md:text-3xl">{label}</h2>
            <p className="text-sm text-muted-foreground">{filtered.length} producto{filtered.length !== 1 ? "s" : ""}{q ? ` de ${items.length}` : ""}</p>
          </div>
          <button onClick={onBack} className="rounded-full border px-4 py-2 text-xs font-bold uppercase text-secondary hover:bg-background">
            ← Volver al inicio
          </button>
        </div>
        <div className="mb-6">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por marca o medida (ej: Michelin, 285/45R22, 285)"
              className="w-full rounded-full border bg-background py-3 pl-10 pr-10 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                aria-label="Limpiar búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        {items.length === 0 ? (
          <p className="rounded-2xl bg-background p-8 text-center text-sm text-muted-foreground">
            Todavía no hay productos en esta categoría.
          </p>
        ) : filtered.length === 0 ? (
          <p className="rounded-2xl bg-background p-8 text-center text-sm text-muted-foreground">
            No se encontraron productos con esa búsqueda.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function AutoCarousel({ id, eyebrow, title, items, bg, direction = "left" }: { id: string; eyebrow: string; title: string; items: any[]; bg: string; direction?: "left" | "right" }) {
  // Duplicamos los items para conseguir el efecto de scroll infinito
  const loop = [...items, ...items];
  const animClass = direction === "left" ? "animate-marquee-left" : "animate-marquee-right";
  const durationSec = Math.max(20, items.length * 6);
  return (
    <section id={id} className={`overflow-hidden py-12 ${bg}`}>
      <div className="container mx-auto px-4">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-black text-secondary md:text-3xl">{title}</h2>
        </div>
      </div>
      <div className="group relative">
        <div
          className={`flex w-max gap-4 px-4 ${animClass} group-hover:[animation-play-state:paused]`}
          style={{ animationDuration: `${durationSec}s` }}
        >
          {loop.map((p, idx) => (
            <div key={`${p.id}-${idx}`} className="w-[260px] shrink-0 sm:w-[280px] md:w-[300px]">
              <ProductCard p={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

type BannerRow = { id: string; title: string; subtitle: string; image_url: string; link_url: string };

function BannerCarousel({ banners, circleLogoUrl }: { banners: BannerRow[]; circleLogoUrl: string }) {
  const autoplay = useMemo(
    () => Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true }),
    []
  );
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" }, [autoplay]);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSel = () => setSelected(emblaApi.selectedScrollSnap());
    onSel();
    emblaApi.on("select", onSel);
    return () => { emblaApi.off("select", onSel); };
  }, [emblaApi]);

  const snaps = emblaApi?.scrollSnapList() ?? banners.map((_, i) => i);

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-3xl" ref={emblaRef}>
        <div className="flex">
          {banners.map((b, idx) => {
            const inner = (
              <div className="relative h-[220px] w-full overflow-hidden bg-secondary md:h-[360px] lg:h-[440px]">
                <img
                  src={optimizeImg(b.image_url, 1200, 75) || b.image_url || circleLogoUrl}
                  alt={b.title || "Banner"}
                  className="h-full w-full object-cover"
                  loading={idx === 0 ? "eager" : "lazy"}
                  decoding="async"
                  {...(idx === 0 ? { fetchPriority: "high" as any } : {})}
                  onError={(e) => {
                    const el = e.currentTarget;
                    const fallback = b.image_url || circleLogoUrl;
                    if (el.src !== fallback) el.src = fallback;
                  }}
                />

                {(b.title || b.subtitle) && (
                  <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-6 md:p-10">
                    {b.title && (
                      <h3 className="max-w-xl text-2xl font-black uppercase tracking-tight text-white md:text-4xl">
                        {b.title}
                      </h3>
                    )}
                    {b.subtitle && (
                      <p className="mt-2 max-w-xl text-sm text-white/90 md:text-base">{b.subtitle}</p>
                    )}
                  </div>
                )}
              </div>
            );
            return (
              <div key={b.id} className="min-w-0 shrink-0 grow-0 basis-full">
                {b.link_url ? (
                  <a href={b.link_url} target={b.link_url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="block">
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </div>
            );
          })}
        </div>
      </div>
      {banners.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {snaps.map((_, i) => (
            <button
              key={i}
              aria-label={`Ir al banner ${i + 1}`}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`h-2 rounded-full transition-all ${
                selected === i ? "w-8 bg-primary" : "w-2 bg-muted-foreground/40 hover:bg-muted-foreground/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}


/* ─────────── CURRENCY SELECT ─────────── */
function CurrencySelect({ value, onChange, compact = false }: { value: Currency; onChange: (c: Currency) => void; compact?: boolean }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Moneda</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Currency)}
        aria-label="Elegir moneda"
        className={`appearance-none rounded-full border border-input bg-background pr-7 text-xs font-bold uppercase tracking-wider text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 ${
          compact ? "h-10 pl-2.5" : "h-10 pl-3"
        }`}
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-muted-foreground" />
    </label>
  );
}

/* ─────────── TESTIMONIOS ─────────── */
type Testi = { id: string; name: string; message: string; image_url: string | null; rating: number; created_at: string };

function TestimonialsSection({ testimonials }: { testimonials: Testi[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: testimonials.length > 1, align: "start" },
    testimonials.length > 1 ? [Autoplay({ delay: 6000, stopOnInteraction: false, stopOnMouseEnter: true })] : []
  );
  const [showForm, setShowForm] = useState(false);

  function scroll(dir: -1 | 1) {
    if (!emblaApi) return;
    dir === -1 ? emblaApi.scrollPrev() : emblaApi.scrollNext();
  }

  return (
    <section id="testimonios" className="bg-muted py-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Opiniones</p>
            <h2 className="mt-1 text-2xl font-black text-secondary md:text-3xl">Lo que dicen nuestros clientes</h2>
          </div>
          <div className="flex items-center gap-2">
            {testimonials.length > 1 && (
              <>
                <button onClick={() => scroll(-1)} aria-label="Anterior" className="grid h-10 w-10 place-items-center rounded-full border bg-card hover:bg-primary hover:text-primary-foreground transition">‹</button>
                <button onClick={() => scroll(1)} aria-label="Siguiente" className="grid h-10 w-10 place-items-center rounded-full border bg-card hover:bg-primary hover:text-primary-foreground transition">›</button>
              </>
            )}
            <button
              onClick={() => setShowForm(true)}
              className="rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-primary)] hover:scale-[1.02] transition"
            >
              <Plus className="mr-1 inline h-3 w-3" /> Dejar mi opinión
            </button>
          </div>
        </div>

        {testimonials.length === 0 ? (
          <div className="rounded-2xl bg-card p-10 text-center text-sm text-muted-foreground shadow-[var(--shadow-product)]">
            Todavía no hay opiniones publicadas. ¡Sé el primero en dejar tu experiencia!
          </div>
        ) : (
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-4">
              {testimonials.map((t) => (
                <div key={t.id} className="min-w-0 shrink-0 grow-0 basis-full sm:basis-1/2 lg:basis-1/3">
                  <TestimonialCard t={t} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showForm && <TestimonialForm onClose={() => setShowForm(false)} />}
    </section>
  );
}

function TestimonialCard({ t }: { t: Testi }) {
  return (
    <div className="flex h-full flex-col rounded-2xl bg-card p-6 shadow-[var(--shadow-product)]">
      <div className="flex items-center gap-3">
        {t.image_url ? (
          <img src={t.image_url} alt={t.name} className="h-14 w-14 rounded-full object-cover border-2 border-primary/30" loading="lazy" />
        ) : (
          <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary">
            <User className="h-6 w-6" />
          </div>
        )}
        <div>
          <p className="font-bold text-secondary">{t.name}</p>
          <div className="flex text-primary" aria-label={`${t.rating} de 5`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-3.5 w-3.5 ${i < t.rating ? "fill-current" : "opacity-30"}`} />
            ))}
          </div>
        </div>
      </div>
      <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">"{t.message}"</p>
    </div>
  );
}

function TestimonialForm({ onClose }: { onClose: () => void }) {
  const submit = useServerFn(submitTestimonial);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(f: File | null) {
    if (!f) return;
    setUploading(true);
    setErr(null);
    try {
      const ext = f.name.split(".").pop() || "jpg";
      const path = `testimonials/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("site-assets").upload(path, f, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
      setImageUrl(data.publicUrl);
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo subir la foto");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await submit({ data: { name: name.trim(), message: message.trim(), rating, image_url: imageUrl || null } });
      setOk(true);
    } catch (e: any) {
      setErr(e?.message ?? "Error al enviar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {ok ? (
          <div className="text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary">
              <Star className="h-7 w-7 fill-current" />
            </div>
            <h3 className="text-lg font-bold text-secondary">¡Gracias por tu opinión!</h3>
            <p className="mt-2 text-sm text-muted-foreground">La revisaremos y publicaremos pronto.</p>
            <button onClick={onClose} className="mt-5 rounded-full bg-primary px-6 py-2 text-sm font-bold uppercase text-primary-foreground">Cerrar</button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-secondary">Dejá tu opinión</h3>
              <button type="button" onClick={onClose} className="text-muted-foreground hover:text-secondary">✕</button>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-secondary">Nombre</span>
              <input required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)}
                className="h-11 w-full rounded-full border border-input bg-background px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-secondary">Tu opinión</span>
              <textarea required minLength={5} maxLength={600} value={message} onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </label>
            <div>
              <span className="mb-1 block text-sm font-semibold text-secondary">Puntuación</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} estrellas`}>
                    <Star className={`h-6 w-6 transition ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="mb-1 block text-sm font-semibold text-secondary">Foto (opcional)</span>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-input bg-muted/50 p-3 text-sm text-muted-foreground hover:bg-muted">
                <Camera className="h-5 w-5" />
                {uploading ? "Subiendo..." : imageUrl ? "Cambiar foto" : "Elegir foto"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
                {imageUrl && <img src={imageUrl} alt="preview" className="ml-auto h-10 w-10 rounded-full object-cover" />}
              </label>
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <button type="submit" disabled={saving || uploading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-primary)] disabled:opacity-60">
              {saving ? "Enviando..." : "Enviar opinión"}
            </button>
            <p className="text-center text-[11px] text-muted-foreground">
              Tu opinión pasa por moderación antes de publicarse.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

/* ─────────── FAQ ─────────── */
function FaqSection({ whatsappHref }: { whatsappHref: string }) {
  const [open, setOpen] = useState<number | null>(0);
  const items = [
    {
      q: "¿Cómo es el envío?",
      a: "Realizamos envíos a toda la Argentina a través de transportes de confianza. El costo depende del destino y la cantidad de cubiertas. Coordinamos el envío por WhatsApp una vez confirmada tu compra. También podés retirar en nuestro local de Mitre 480, Piso 12, Buenos Aires.",
    },
    {
      q: "¿Tienen garantía?",
      a: "Sí. Todas nuestras cubiertas son 100% nuevas y cuentan con la garantía oficial del fabricante contra defectos de fabricación. Ante cualquier inconveniente, contactanos y te asesoramos con el proceso.",
    },
    {
      q: "¿Qué formas de pago aceptan?",
      a: "Aceptamos transferencia bancaria y tarjeta de crédito/débito directamente al confirmar el pedido. Los datos aparecen al finalizar la compra.",
    },
    {
      q: "¿Cómo sé qué medida es la mía?",
      a: "Mirá el flanco lateral de tu cubierta actual. Ahí encontrás una secuencia como 175/70R14: el primer número es el ancho, el segundo el alto y el último el aro. Usá el buscador por medida para encontrar tu cubierta rápido.",
    },
  ];

  return (
    <section id="faq" className="bg-background py-16">
      <div className="container mx-auto max-w-3xl px-4">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Ayuda</p>
          <h2 className="mt-1 text-2xl font-black text-secondary md:text-3xl">Preguntas frecuentes</h2>
        </div>
        <div className="space-y-3">
          {items.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-bold text-secondary md:text-base">{it.q}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-primary transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="border-t bg-muted/40 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
                    {it.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Tenés otra pregunta?{" "}
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline">
            Escribinos por WhatsApp
          </a>
        </p>
      </div>
    </section>
  );
}



