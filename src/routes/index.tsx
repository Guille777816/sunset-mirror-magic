import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Phone, ShoppingCart, User, Users, Search, Truck, AlertTriangle, MapPin, ChevronRight } from "lucide-react";
import heroTire from "@/assets/hero-tire.jpg";
import tireCar from "@/assets/tire-car.jpg";
import tireSuv from "@/assets/tire-suv.jpg";
import tireTruck from "@/assets/tire-truck.jpg";
import tireAgro from "@/assets/tire-agro.jpg";
import { supabase } from "@/integrations/supabase/client";
import { listPublicProducts } from "@/lib/products.functions";
import { getSettings } from "@/lib/settings.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Le Radial — Cubiertas y neumáticos en Posadas, Misiones" },
      { name: "description", content: "Venta de cubiertas para autos, camionetas, camiones y maquinaria agrícola en Posadas, Misiones. Buscá por medida y consultá precios actualizados." },
      { property: "og:title", content: "Le Radial — Cubiertas en Posadas, Misiones" },
      { property: "og:description", content: "Cubiertas para autos, camionetas, camiones y agro. Posadas, Misiones — Argentina." },
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

const widths =  ["Todos","145","155","165","175","185","195","205","215","225","235","245","255","265","275","285","295","305"];
const heights = ["Todos","30","35","40","45","50","55","60","65","70","75","80"];
const rims =    ["Todos","13","14","15","16","17","18","19","20","21","22"];

function formatArs(n: number) {
  return "$ " + Number(n).toLocaleString("es-AR");
}

function Index() {
  const [w, setW] = useState("Todos");
  const [h, setH] = useState("Todos");
  const [r, setR] = useState("Todos");
  const [searchActive, setSearchActive] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => subscription.unsubscribe();
  }, []);

  const fetchProducts = useServerFn(listPublicProducts);
  const fetchSettings = useServerFn(getSettings);
  const { data: products = [] } = useQuery({
    queryKey: ["public-products"],
    queryFn: () => fetchProducts(),
  });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => fetchSettings() });

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

  // Solo productos destacados (promo) en la portada, divididos en 2 carruseles
  const featured = useMemo(
    () => (products as any[]).filter((p) => p.is_featured),
    [products]
  );
  const featuredTop = useMemo(() => featured.slice(0, Math.ceil(featured.length / 2)), [featured]);
  const featuredBottom = useMemo(() => featured.slice(Math.ceil(featured.length / 2)), [featured]);

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
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>{settings?.address ?? "Posadas, Misiones · Envíos a toda la Argentina"}</span>
          </div>
          <div className="hidden gap-4 md:flex">
            <span>Lun a Vie 8:00 – 18:00</span>
            <span>Sáb 8:00 – 12:00</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
          <a href="/" className="flex items-center gap-2">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt={settings?.business_name || "Logo"} className="h-12 w-auto max-w-[200px] object-contain" />
            ) : (
              <>
                <span className="text-3xl font-black tracking-tighter text-primary">LE</span>
                <span className="text-3xl font-black tracking-tighter text-secondary">RADIAL</span>
                <span className="ml-1 hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:inline">cubiertas</span>
              </>
            )}
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
          </div>
          <a href={phoneHref} className="lg:hidden flex items-center gap-2 text-sm font-bold text-primary">
            <Phone className="h-5 w-5" /> {phone}
          </a>
        </div>
        {/* Nav — categorías clickeables */}
        <nav className="border-t bg-muted">
          <div className="container mx-auto flex items-center justify-between overflow-x-auto px-4">
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
            <a href="#categorias" className="rounded-full bg-primary px-7 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-primary)] transition hover:scale-105">
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
          <h2 className="mb-6 text-center text-2xl font-bold text-secondary md:text-3xl">
            Buscar cubiertas por medida
          </h2>
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

      {/* Categorías visuales */}
      <section id="categorias" className="container mx-auto px-4 py-16">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Categorías</p>
          <h2 className="mt-1 text-3xl font-black text-secondary md:text-4xl">Encontrá tu cubierta</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {CATEGORY_CONFIG.filter(c => c.slug !== "industriales").map((c) => {
            const count = (products as any[]).filter((p) => p.category === c.slug).length;
            const customImg = (settings as any)?.category_images?.[c.slug];
            return (
              <button
                key={c.slug}
                onClick={() => handleCategoryNav(c.slug)}
                className="group relative overflow-hidden rounded-2xl border bg-card p-5 text-left transition hover:-translate-y-1 hover:shadow-[var(--shadow-primary)]"
              >
                <div className="aspect-square overflow-hidden rounded-xl bg-muted">
                  <img src={customImg || c.img} alt={c.label} loading="lazy" width={600} height={600}
                    className="h-full w-full object-cover transition group-hover:scale-110" />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-secondary">{c.label}</h3>
                    {count > 0 && <p className="text-xs text-muted-foreground">{count} producto{count !== 1 ? "s" : ""}</p>}
                  </div>
                  <ChevronRight className="h-5 w-5 text-primary opacity-0 transition group-hover:opacity-100" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Carruseles de PROMO en la portada */}
      {!searchActive && featured.length > 0 && (
        <>
          <PromoCarousel id="promo-top" eyebrow="Promo destacada" title="Ofertas seleccionadas" items={featuredTop} bg="bg-muted" />
          {featuredBottom.length > 0 && (
            <PromoCarousel id="promo-bottom" eyebrow="Más promos" title="Aprovechá ahora" items={featuredBottom} bg="bg-background" />
          )}
        </>
      )}

      {/* Estado vacío */}
      {!searchActive && featured.length === 0 && (
        <section className="py-20 text-center text-muted-foreground">
          <p>Todavía no hay productos en promoción. Marcalos como ★ Promo desde el panel admin.</p>
        </section>
      )}

      {/* Beneficios */}
      <section className="container mx-auto grid gap-6 px-4 py-16 md:grid-cols-3">
        {[
          { icon: Truck, title: "Envíos a toda la Argentina", desc: "Coordinamos con transportadoras de confianza desde Posadas a cualquier provincia." },
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
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black tracking-tighter text-primary">LE</span>
              <span className="text-2xl font-black tracking-tighter">RADIAL</span>
            </div>
            <p className="mt-3 text-sm opacity-70">Cubiertas y neumáticos para autos, camionetas, camiones y agro. Posadas, Misiones.</p>
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
              <li>Sucursal Posadas</li>
              <li>Revendedores</li>
              <li>Contacto</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-primary">Atención</h4>
            <p className="text-sm opacity-80">{phone}</p>
            <p className="text-sm opacity-80">{settings?.email ?? "hola@leradial.com.ar"}</p>
            <p className="mt-2 text-sm opacity-80">{settings?.address ?? "Posadas, Misiones — Argentina"}</p>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-xs font-bold text-white"
            >
              WhatsApp
            </a>
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
  return (
    <Link
      to="/producto/$id"
      params={{ id: p.id }}
      className="group flex flex-col overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-product)] transition hover:-translate-y-1"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {p.is_featured && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
            Promo
          </span>
        )}
        <img
          src={p.image_url || categoryImg[p.category] || tireCar}
          alt={`${p.brand} ${p.model}`}
          loading="lazy"
          width={600}
          height={600}
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">{p.brand}</p>
        <h3 className="mt-1 line-clamp-2 text-sm font-bold text-secondary">{p.model}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{p.size}</p>
        <div className="mt-auto pt-4">
          <p className="text-lg font-black text-secondary">{formatArs(p.price_ars)}</p>
          <div className="mt-3 w-full rounded-full bg-secondary py-2 text-center text-xs font-bold uppercase tracking-wider text-secondary-foreground transition group-hover:bg-primary">
            Ver detalle
          </div>
        </div>
      </div>
    </Link>
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
