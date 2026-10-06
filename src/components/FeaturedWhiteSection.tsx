import React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ShoppingCart, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/lib/settings.functions";
import { useCurrency } from "@/lib/currency";
import { useCart } from "@/lib/cart";
import { BrandLogo } from "./BrandLogo";

interface Product {
  id: string;
  slug: string;
  brand: string;
  model: string;
  size: string;
  category: string;
  categories?: string[];
  price_ars: number;
  stock: number;
  image_url?: string | null;
  is_featured?: boolean;
  free_shipping?: boolean;
}

interface FeaturedWhiteSectionProps {
  products: Product[];
}

export function FeaturedWhiteSection({ products }: FeaturedWhiteSectionProps) {
  const { format } = useCurrency();
  const cart = useCart();

  const { data: settings } = useQuery<any>({
    queryKey: ["settings"],
    queryFn: () => getSettings().catch(() => null),
    staleTime: 60_000,
  });

  // Highlight featured items or top active products
  const featuredList = (products || []).filter((p) => p.is_featured);
  const displayList = featuredList.length > 0 ? featuredList.slice(0, 6) : (products || []).slice(0, 6);

  if (displayList.length === 0) return null;

  return (
    <section id="productos-destacados" className="w-full bg-white py-16 lg:py-24 border-t border-neutral-100 text-neutral-900">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-block rounded-full bg-red-100 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-[#E3151A]">
            Promociones y Ofertas
          </span>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-neutral-900 md:text-5xl">
            Productos Destacados
          </h2>
          <p className="mt-3 text-sm text-neutral-500">
            Neumáticos con máxima durabilidad, adherencia superior y precios directos para entrega inmediata.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {displayList.map((p) => {
            const isPickup = p.category === "camionetas" || p.category === "suv" || p.model?.toLowerCase().includes("brutus");
            const isTruck = p.category === "camiones" || p.category === "pesados" || p.model?.toLowerCase().includes("xcurve");

            const tireImg = p.image_url || (isPickup
              ? "/images/featured/brutus.webp" 
              : isTruck 
              ? "/images/featured/xcurve.webp" 
              : "/images/featured/fastway.webp");

            const customVehicleBg = settings?.category_images?.[`vehicle:${p.id}`] || (p.slug ? settings?.category_images?.[`vehicle:${p.slug}`] : null);
            const customVehicleLabel = settings?.category_images?.[`vehicle_label:${p.id}`] || (p.slug ? settings?.category_images?.[`vehicle_label:${p.slug}`] : null);

            const vehicleBg = customVehicleBg || (isPickup
              ? "/images/featured/brutus-bg.jpg"
              : isTruck
              ? "/images/featured/xcurve-bg.jpg"
              : "/images/featured/fastway-bg.jpg");

            const vehicleLabel = customVehicleLabel || (isPickup ? "Camionetas" : isTruck ? "Camión" : "Auto");

            const mainCategory = Array.isArray(p.categories) && p.categories.length > 0 
              ? p.categories[0] 
              : (p.category || "Neumático");

            return (
              <div
                key={p.id}
                className="group relative flex min-h-[460px] flex-col justify-between overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-50/70 p-6 transition-all duration-500 hover:border-neutral-900 hover:shadow-2xl"
              >
                {/* 1. Fondo del Vehículo (Oculto normalmente, aparece en hover con zoom sutil) */}
                <div className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-hidden">
                  <img
                    src={vehicleBg}
                    alt=""
                    aria-hidden="true"
                    className="h-full w-full object-cover opacity-0 transition-all duration-700 ease-out group-hover:scale-105 group-hover:opacity-100"
                  />
                  {/* Degradado para máxima legibilidad del texto en hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/35 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                </div>

                {/* 2. Top Badges */}
                <div className="relative z-10 flex items-center justify-between gap-2">
                  <span className="rounded-full border border-neutral-300 bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-800 shadow-sm backdrop-blur-sm transition-colors group-hover:border-white/40 group-hover:bg-black/50 group-hover:text-white">
                    Más elegido
                  </span>
                  {p.free_shipping && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-green-700 group-hover:bg-green-600/90 group-hover:text-white">
                      <Truck className="h-3 w-3" /> Envío gratis
                    </span>
                  )}
                </div>

                {/* 3. Neumático Aislado (Visible normalmente, se desvanece suavemente en hover) */}
                <Link
                  to="/producto/$slug"
                  params={{ slug: p.slug }}
                  className="relative z-10 my-4 block aspect-square w-full select-none"
                >
                  <img
                    src={tireImg}
                    alt={`${p.brand} ${p.model} ${p.size}`}
                    className="h-full w-full object-contain drop-shadow-xl transition-all duration-500 ease-out group-hover:scale-95 group-hover:opacity-0"
                    loading="lazy"
                    decoding="async"
                  />
                </Link>

                {/* 4. Información y Detalles */}
                <div className="relative z-10 transition-transform duration-300">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <div className="rounded-lg bg-neutral-200/90 px-2 py-0.5 group-hover:bg-white/90 transition-colors">
                      <BrandLogo brand={p.brand} className="h-4.5 w-auto max-w-[90px]" />
                    </div>
                    <span className="rounded-full bg-neutral-200/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-neutral-800 transition-colors group-hover:bg-white/20 group-hover:text-white">
                      {vehicleLabel}
                    </span>
                  </div>

                  {/* Rodado / Medida */}
                  <Link to="/producto/$slug" params={{ slug: p.slug }} className="block">
                    <h3 className="text-2xl font-black uppercase tracking-tight text-neutral-900 transition-colors group-hover:text-white md:text-3xl">
                      {p.size || p.model}
                    </h3>
                    <p className="mt-1 line-clamp-1 text-sm font-semibold text-neutral-600 transition-colors group-hover:text-neutral-300">
                      {p.brand} {p.model}
                    </p>
                  </Link>

                  {/* Precio */}
                  <div className="mt-4 flex items-baseline justify-between border-t border-neutral-200/60 pt-3 transition-colors group-hover:border-white/20">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 transition-colors group-hover:text-neutral-400">
                        Precio contado / online
                      </p>
                      <p className="text-2xl font-black text-neutral-900 transition-colors group-hover:text-white">
                        {format(Number(p.price_ars))}
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-emerald-600 transition-colors group-hover:text-emerald-300">
                        3 cuotas sin interés de {format(Math.round(Number(p.price_ars) / 3))}
                      </p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="mt-4 flex gap-2">
                    <Link
                      to="/producto/$slug"
                      params={{ slug: p.slug }}
                      className="flex-1 rounded-full border border-neutral-900 py-2.5 text-center text-xs font-black uppercase tracking-wider text-neutral-900 transition duration-300 hover:bg-neutral-900 hover:text-white group-hover:border-white group-hover:text-white group-hover:hover:bg-white group-hover:hover:text-black"
                    >
                      Saber más →
                    </Link>
                    <button
                      onClick={() => {
                        cart.add({
                          id: p.id,
                          brand: p.brand,
                          model: p.model,
                          size: p.size,
                          price_ars: Number(p.price_ars),
                          image_url: p.image_url,
                        });
                        cart.open();
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E3151A] text-white shadow-md transition hover:bg-[#c31116] hover:scale-105"
                      title="Agregar al carrito"
                      aria-label="Agregar al carrito"
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <a
            href="#buscador"
            className="inline-flex items-center gap-2 rounded-full border-2 border-neutral-900 px-8 py-3.5 text-xs font-black uppercase tracking-wider text-neutral-900 hover:bg-neutral-900 hover:text-white transition duration-200 shadow-sm"
          >
            Ver todos los modelos en catálogo <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
