import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, CreditCard, Sparkles, Tag, ShieldCheck } from "lucide-react";

export interface OfertaCard {
  id: string;
  vehicleType: string; // ej: "Pickup 4x4", "Auto Paseo", "SUV", "Camión"
  title: string; // ej: "Hilux & Ranger — XBRI Brutus T/A"
  subtitle: string; // ej: "Máxima tracción off-road y durabilidad extrema"
  tireBrand: string; // ej: "XBRI"
  tireModel: string; // ej: "Brutus T/A"
  tireSize: string; // ej: "265/70R16"
  priceArs: number;
  vehicleImageUrl: string;
  badge: string; // ej: "OFERTA TOP", "MÁS VENDIDO", "3 CUOTAS SIN INTERÉS"
  slug?: string;
  searchParams?: { w: string; h: string; r: string };
}

export const DEFAULT_OFERTAS: OfertaCard[] = [
  {
    id: "brutus-pickup",
    vehicleType: "Pickups 4x4 & All-Terrain",
    title: "Pickups & 4x4 — XBRI Brutus T/A",
    subtitle: "Tracción todoterreno en ripio, barro y ruta para Hilux, Ranger y Amarok",
    tireBrand: "XBRI",
    tireModel: "Brutus T/A",
    tireSize: "265/70R16",
    priceArs: 245000,
    vehicleImageUrl: "/images/banners/es_desktop_brutus.jpg",
    badge: "MÁS ELEGIDO 4X4",
    searchParams: { w: "265", h: "70", r: "16" },
  },
  {
    id: "fastway-autos",
    vehicleType: "Autos & Sedán de Paseo",
    title: "Sedán y Hatch — XBRI Fastway A3",
    subtitle: "Silencio de marcha, excelente frenado en lluvia y máximo kilometraje",
    tireBrand: "XBRI",
    tireModel: "Fastway A3",
    tireSize: "205/55R16",
    priceArs: 138000,
    vehicleImageUrl: "/images/banners/es_desktop_fastway.jpg",
    badge: "OFERTA IMPERDIBLE",
    searchParams: { w: "205", h: "55", r: "16" },
  },
  {
    id: "linea-brutus-suv",
    vehicleType: "SUV & Crossovers",
    title: "SUV y Crossover — Línea Reforzada",
    subtitle: "Seguridad para viajar en familia con carcasa multicapa y 5 años de garantía",
    tireBrand: "XBRI",
    tireModel: "Sport+ SUV",
    tireSize: "225/65R17",
    priceArs: 175000,
    vehicleImageUrl: "/images/banners/es_desktop_linea_brutus.jpg",
    badge: "3 CUOTAS SIN INTERÉS",
    searchParams: { w: "225", h: "65", r: "17" },
  },
  {
    id: "cargoplus-camiones",
    vehicleType: "Camiones & Transporte Pesado",
    title: "Transporte Pesado — XBRI Cargo Plus",
    subtitle: "Rendimiento kilométrico superior y costo mínimo por kilómetro recorrido",
    tireBrand: "XBRI",
    tireModel: "Cargo Plus",
    tireSize: "295/80R22.5",
    priceArs: 395000,
    vehicleImageUrl: "/images/banners/es_desktop_cargoplus.jpg",
    badge: "FLOTAS Y MAYORISTAS",
    searchParams: { w: "295", h: "80", r: "22.5" },
  },
  {
    id: "continental-premium",
    vehicleType: "Autos y Alta Gama",
    title: "Alta Gama — Continental Premium",
    subtitle: "Ingeniería alemana con agarre insuperable y confort premium en ruta",
    tireBrand: "Continental",
    tireModel: "PowerContact 2",
    tireSize: "185/60R15",
    priceArs: 155000,
    vehicleImageUrl: "/images/banners/es_desktop_fastway.jpg",
    badge: "TECNOLOGÍA ALEMANA",
    searchParams: { w: "185", h: "60", r: "15" },
  },
];

export function parseCarruselCards(categoryImages?: Record<string, string> | null): OfertaCard[] {
  if (!categoryImages) return DEFAULT_OFERTAS;
  try {
    const raw = categoryImages.carrusel_3d_cards || categoryImages["carrusel_3d"];
    if (raw) {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Error parseando carrusel_3d_cards:", e);
  }
  return DEFAULT_OFERTAS;
}

interface Carrusel3DOfertasProps {
  cards?: OfertaCard[];
  onSelectSize?: (w: string, h: string, r: string) => void;
}

export function Carrusel3DOfertas({
  cards = DEFAULT_OFERTAS,
  onSelectSize,
}: Carrusel3DOfertasProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const total = cards.length;

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Autoplay con pausa en hover
  useEffect(() => {
    if (isHovered || total <= 1) return;
    const interval = setInterval(nextSlide, 4500);
    return () => clearInterval(interval);
  }, [isHovered, nextSlide, total]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) {
      nextSlide();
    } else if (diff < -50) {
      prevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <section
      id="carrusel-3d-ofertas"
      className="relative overflow-hidden bg-white py-14 sm:py-20 border-y border-neutral-100"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="container relative z-10 mx-auto px-4">
        {/* Encabezado limpio con fondo blanco estilo Wigy */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800 border border-emerald-200/80">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>OFERTAS EN VEHÍCULOS</span>
          </div>

          <h2 className="mt-3 text-3xl font-black tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl">
            Vehículos en Acción con Neumáticos en Oferta
          </h2>

          <p className="mt-2 text-sm sm:text-base text-neutral-500 max-w-2xl mx-auto">
            Mirá cómo lucen y rinden en autos, pickups, SUVs y transporte pesado.{" "}
            <strong className="text-emerald-700 font-bold">3 cuotas fijas sin interés</strong> o{" "}
            <strong className="text-emerald-700 font-bold">15% OFF por transferencia</strong>.
          </p>
        </div>

        {/* Escenario 3D Claro y Limpio */}
        <div
          className="relative mx-auto mt-10 sm:mt-14 h-[490px] sm:h-[530px] w-full max-w-5xl"
          style={{ perspective: "1200px" }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="relative h-full w-full">
            {cards.map((card, idx) => {
              // Distancia relativa
              let diff = (idx - activeIndex) % total;
              if (diff > total / 2) diff -= total;
              if (diff < -total / 2) diff += total;

              const isActive = diff === 0;
              const isPrev = diff === -1;
              const isNext = diff === 1;
              const isFarPrev = diff === -2;
              const isFarNext = diff === 2;

              let transform = "";
              let zIndex = 10;
              let opacity = 0;
              let pointerEvents: "auto" | "none" = "none";
              let shadow = "0 10px 25px -5px rgba(0, 0, 0, 0.08)";

              if (isActive) {
                transform = "translate3d(-50%, -50%, 0px) scale(1) rotateY(0deg)";
                zIndex = 40;
                opacity = 1;
                pointerEvents = "auto";
                shadow = "0 25px 50px -12px rgba(0, 0, 0, 0.18)";
              } else if (isNext) {
                transform = "translate3d(calc(-50% + 230px), -50%, -90px) scale(0.86) rotateY(-24deg)";
                zIndex = 30;
                opacity = 0.88;
                pointerEvents = "auto";
                shadow = "0 15px 30px -10px rgba(0, 0, 0, 0.12)";
              } else if (isPrev) {
                transform = "translate3d(calc(-50% - 230px), -50%, -90px) scale(0.86) rotateY(24deg)";
                zIndex = 30;
                opacity = 0.88;
                pointerEvents = "auto";
                shadow = "0 15px 30px -10px rgba(0, 0, 0, 0.12)";
              } else if (isFarNext) {
                transform = "translate3d(calc(-50% + 400px), -50%, -200px) scale(0.72) rotateY(-36deg)";
                zIndex = 20;
                opacity = 0.45;
                pointerEvents = "auto";
              } else if (isFarPrev) {
                transform = "translate3d(calc(-50% - 400px), -50%, -200px) scale(0.72) rotateY(36deg)";
                zIndex = 20;
                opacity = 0.45;
                pointerEvents = "auto";
              } else {
                transform = "translate3d(-50%, -50%, -350px) scale(0.5)";
                opacity = 0;
                pointerEvents = "none";
              }

              const cuotaVal = Math.round(card.priceArs / 3);
              const transVal = Math.round(card.priceArs * 0.85);

              return (
                <div
                  key={card.id || idx}
                  onClick={() => {
                    if (!isActive) setActiveIndex(idx);
                  }}
                  className="absolute left-1/2 top-1/2 w-[290px] sm:w-[340px] md:w-[360px] h-[450px] sm:h-[490px] cursor-pointer select-none rounded-3xl overflow-hidden bg-white border border-neutral-200/90 transition-all duration-500 ease-out flex flex-col justify-between"
                  style={{
                    transform,
                    zIndex,
                    opacity,
                    pointerEvents,
                    boxShadow: shadow,
                    transformStyle: "preserve-3d",
                  }}
                >
                  {/* Foto del vehículo */}
                  <div className="relative h-[250px] sm:h-[280px] w-full overflow-hidden bg-neutral-100">
                    <img
                      src={card.vehicleImageUrl}
                      alt={card.title}
                      className="h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-105"
                      loading="lazy"
                    />

                    {/* Sutil sombra para badges */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                    {/* Badges superiores limpios */}
                    <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2">
                      <span className="rounded-full bg-white/95 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-neutral-800 border border-neutral-200/80 shadow-xs">
                        {card.vehicleType}
                      </span>
                      <span className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white shadow-xs">
                        {card.badge}
                      </span>
                    </div>

                    {/* Medida sobre la foto */}
                    <div className="absolute bottom-3 left-3.5">
                      <span className="rounded-md bg-black/75 backdrop-blur-md px-2.5 py-1 text-xs font-black text-white">
                        {card.tireBrand} {card.tireSize}
                      </span>
                    </div>
                  </div>

                  {/* Detalle inferior limpio en fondo blanco */}
                  <div className="p-4 bg-white flex-1 flex flex-col justify-between border-t border-neutral-100">
                    <div>
                      <h3 className="text-base font-black text-neutral-900 leading-tight">
                        {card.title}
                      </h3>
                      <p className="mt-1 text-xs text-neutral-500 line-clamp-1">
                        {card.subtitle}
                      </p>
                    </div>

                    {/* Precios y cuotas */}
                    <div className="mt-3 flex items-baseline justify-between border-t border-neutral-100 pt-2.5">
                      <div>
                        <span className="text-[10px] text-neutral-400 line-through block font-medium">
                          Lista: ${card.priceArs.toLocaleString("es-AR")}
                        </span>
                        <span className="text-lg font-black text-emerald-700 leading-none">
                          ${transVal.toLocaleString("es-AR")}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-neutral-500 block">
                          3 cuotas fijas de
                        </span>
                        <span className="text-xs font-black text-neutral-900">
                          ${cuotaVal.toLocaleString("es-AR")}
                        </span>
                      </div>
                    </div>

                    {/* Botón de acción */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectSize && card.searchParams) {
                          onSelectSize(
                            card.searchParams.w,
                            card.searchParams.h,
                            card.searchParams.r
                          );
                        } else {
                          document.getElementById("tienda-catalogo")?.scrollIntoView({ behavior: "smooth" });
                        }
                      }}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-xs hover:bg-primary/90 transition"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      <span>Ver Oferta</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Flechas de navegación limpias con fondo blanco */}
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Oferta anterior"
            className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 z-50 grid h-11 w-11 sm:h-12 sm:w-12 place-items-center rounded-full bg-white text-neutral-800 border border-neutral-200 shadow-lg hover:bg-neutral-50 active:scale-95 transition"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Oferta siguiente"
            className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 z-50 grid h-11 w-11 sm:h-12 sm:w-12 place-items-center rounded-full bg-white text-neutral-800 border border-neutral-200 shadow-lg hover:bg-neutral-50 active:scale-95 transition"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        {/* Indicadores de puntos (Dots) */}
        <div className="mt-8 sm:mt-10 flex items-center justify-center gap-2">
          {cards.map((_, dotIdx) => (
            <button
              key={dotIdx}
              onClick={() => setActiveIndex(dotIdx)}
              aria-label={`Ir a diapositiva ${dotIdx + 1}`}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                dotIdx === activeIndex
                  ? "w-8 bg-emerald-600"
                  : "w-2.5 bg-neutral-200 hover:bg-neutral-300"
              }`}
            />
          ))}
        </div>

        {/* Footer de beneficios limpio */}
        <div className="mt-8 mx-auto max-w-2xl flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>5 años de garantía oficial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CreditCard className="h-4 w-4 text-emerald-600" />
            <span>3 cuotas fijas sin interés</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span>Envíos bonificados a todo el país</span>
          </div>
        </div>
      </div>
    </section>
  );
}
