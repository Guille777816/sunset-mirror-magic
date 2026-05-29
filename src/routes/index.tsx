import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, ShoppingCart, User, Users, Search, Truck, AlertTriangle, MapPin } from "lucide-react";
import heroTire from "@/assets/hero-tire.jpg";
import tireCar from "@/assets/tire-car.jpg";
import tireSuv from "@/assets/tire-suv.jpg";
import tireTruck from "@/assets/tire-truck.jpg";
import tireAgro from "@/assets/tire-agro.jpg";

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

const categories = [
  { name: "Autos", img: tireCar },
  { name: "Camionetas", img: tireSuv },
  { name: "Camiones", img: tireTruck },
  { name: "Agrícolas", img: tireAgro },
];

const products = [
  { brand: "ROADMAX", model: "GREEN-TOURING", size: "175/70R13 82T", price: 89000, img: tireCar },
  { brand: "ROADMAX", model: "ALL-TERRAIN A/T", size: "265/65R17 112T", price: 215000, img: tireSuv },
  { brand: "TITANGRIP", model: "URBAN PRO", size: "185/65R14 86H", price: 112000, img: tireCar },
  { brand: "TITANGRIP", model: "MUD-X M/T", size: "31x10.5R15 109Q", price: 298000, img: tireSuv },
  { brand: "HEAVYLINE", model: "CARGO STEER", size: "295/80R22.5", price: 620000, img: tireTruck },
  { brand: "AGROTRAC", model: "FIELD MASTER", size: "18.4-34", price: 1350000, img: tireAgro },
  { brand: "ROADMAX", model: "ECO DRIVE", size: "195/55R15 85V", price: 125000, img: tireCar },
  { brand: "TITANGRIP", model: "SPORT GT", size: "225/45R17 94W", price: 195000, img: tireCar },
];

const widths = ["Todos","145","155","165","175","185","195","205","215","225","235","245","255","265","275","285","295","305"];
const heights = ["Todos","30","35","40","45","50","55","60","65","70","75","80"];
const rims = ["Todos","13","14","15","16","17","18","19","20","21","22"];

function formatArs(n: number) {
  return "$ " + n.toLocaleString("es-AR");
}

function Index() {
  const [w, setW] = useState("Todos");
  const [h, setH] = useState("Todos");
  const [r, setR] = useState("Todos");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <div className="bg-secondary text-secondary-foreground text-xs">
        <div className="container mx-auto flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>Posadas, Misiones · Envíos a toda la Argentina</span>
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
          <a href="/" className="flex items-baseline gap-1">
            <span className="text-3xl font-black tracking-tighter text-primary">LE</span>
            <span className="text-3xl font-black tracking-tighter text-secondary">RADIAL</span>
            <span className="ml-1 hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:inline">cubiertas</span>
          </a>
          <div className="hidden items-center gap-6 lg:flex">
            <a href="tel:+543764000000" className="flex items-center gap-2 text-sm font-semibold">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
                <Phone className="h-4 w-4" />
              </span>
              (376) 4-000000
            </a>
            <button className="flex items-center gap-2 text-sm font-semibold hover:text-primary">
              <ShoppingCart className="h-5 w-5" /> Mi Carrito
            </button>
            <button className="flex items-center gap-2 text-sm font-semibold hover:text-primary">
              <User className="h-5 w-5" /> Login
            </button>
            <button className="flex items-center gap-2 text-sm font-semibold hover:text-primary">
              <Users className="h-5 w-5" /> Revendedores
            </button>
          </div>
          <button className="lg:hidden">
            <ShoppingCart className="h-6 w-6" />
          </button>
        </div>
        {/* Nav */}
        <nav className="border-t bg-muted">
          <div className="container mx-auto flex items-center justify-between overflow-x-auto px-4">
            {["Autos","Camionetas","Camiones","Agrícolas","Industriales","Lonas"].map((c) => (
              <a key={c} href="#categorias" className="whitespace-nowrap px-4 py-3 text-sm font-semibold uppercase tracking-wide text-secondary hover:text-primary">
                {c}
              </a>
            ))}
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <img
          src={heroTire}
          alt="Cubierta off-road"
          width={1600}
          height={700}
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-primary">Nueva línea 2026</p>
          <h1 className="max-w-2xl text-4xl font-black uppercase leading-[0.95] text-white md:text-6xl">
            Brutus A/T
            <span className="mt-2 block text-primary">Dominio total del terreno</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/80 md:text-lg">
            Diseñada para ofrecer un equilibrio entre rendimiento y durabilidad en una amplia gama de condiciones de velocidad y terreno.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#productos" className="rounded-full bg-primary px-7 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-primary)] transition hover:scale-105">
              Ver productos
            </a>
            <a href="#buscador" className="rounded-full border border-white/30 px-7 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-white/10">
              Buscar por medida
            </a>
          </div>
        </div>
      </section>

      {/* Search by size */}
      <section id="buscador" className="bg-muted py-12">
        <div className="container mx-auto px-4">
          <h2 className="mb-6 text-center text-2xl font-bold text-secondary md:text-3xl">
            Buscar cubiertas por medida
          </h2>
          <div className="mx-auto grid max-w-5xl gap-4 rounded-2xl bg-card p-6 shadow-[var(--shadow-product)] md:grid-cols-[1fr_1fr_1fr_auto]">
            <Select label="Ancho" value={w} onChange={setW} options={widths} />
            <Select label="Alto" value={h} onChange={setH} options={heights} />
            <Select label="Aro" value={r} onChange={setR} options={rims} />
            <div className="flex items-end">
              <button className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-8 font-bold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-primary)] transition hover:scale-[1.02] md:w-auto">
                <Search className="h-4 w-4" /> Buscar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Alert strip */}
      <section className="bg-primary py-6 text-primary-foreground">
        <div className="container mx-auto grid gap-3 px-4 text-center text-sm md:grid-cols-3 md:text-left">
          <div className="flex items-center justify-center gap-2 md:justify-start">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span><strong>Precios promocionales</strong> con descuentos especiales.</span>
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

      {/* Categories */}
      <section id="categorias" className="container mx-auto px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Categorías</p>
            <h2 className="mt-1 text-3xl font-black text-secondary md:text-4xl">Encontrá tu cubierta</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((c) => (
            <a key={c.name} href="#productos" className="group relative overflow-hidden rounded-2xl border bg-card p-5 transition hover:-translate-y-1 hover:shadow-[var(--shadow-primary)]">
              <div className="aspect-square overflow-hidden rounded-xl bg-muted">
                <img src={c.img} alt={c.name} loading="lazy" width={600} height={600} className="h-full w-full object-cover transition group-hover:scale-110" />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-secondary">{c.name}</h3>
                <span className="text-primary opacity-0 transition group-hover:opacity-100">→</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Products */}
      <section id="productos" className="bg-muted py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Cubiertas para autos</p>
              <h2 className="mt-1 text-3xl font-black text-secondary md:text-4xl">Destacados</h2>
            </div>
            <a href="#" className="hidden text-sm font-semibold text-primary hover:underline md:inline">Ver todos →</a>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p, i) => (
              <article key={i} className="group flex flex-col overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-product)] transition hover:-translate-y-1">
                <div className="relative aspect-square overflow-hidden bg-muted">
                  <span className="absolute left-3 top-3 z-10 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                    Promo
                  </span>
                  <img src={p.img} alt={`${p.brand} ${p.model}`} loading="lazy" width={600} height={600} className="h-full w-full object-cover transition group-hover:scale-105" />
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-primary">{p.brand}</p>
                  <h3 className="mt-1 line-clamp-2 text-sm font-bold text-secondary">{p.model}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{p.size}</p>
                  <div className="mt-auto pt-4">
                    <p className="text-lg font-black text-secondary">{formatArs(p.price)}</p>
                    <button className="mt-3 w-full rounded-full bg-secondary py-2 text-xs font-bold uppercase tracking-wider text-secondary-foreground transition hover:bg-primary">
                      Agregar al carrito
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
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
              <li>Autos</li><li>Camionetas</li><li>Camiones</li><li>Agrícolas</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-primary">Empresa</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li>Sucursal Posadas</li><li>Revendedores</li><li>Contacto</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-primary">Atención</h4>
            <p className="text-sm opacity-80">(376) 4-000000</p>
            <p className="text-sm opacity-80">hola@leradial.com.ar</p>
            <p className="mt-2 text-sm opacity-80">Posadas, Misiones — Argentina</p>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs opacity-60">
          © {new Date().getFullYear()} Le Radial · Todos los derechos reservados
        </div>
      </footer>
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
