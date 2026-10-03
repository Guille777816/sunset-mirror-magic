import React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ShoppingCart, Truck } from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { useCart } from "@/lib/cart";

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
            const tireImg = p.image_url || (p.category === "camionetas" || p.category === "suv" 
              ? "/images/featured/brutus.webp" 
              : p.category === "camiones" 
              ? "/images/featured/xcurve.webp" 
              : "/images/featured/fastway.webp");

            const mainCategory = Array.isArray(p.categories) && p.categories.length > 0 
              ? p.categories[0] 
              : (p.category || "Neumático");

            return (
              <div
                key={p.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-neutral-200/80 bg-neutral-50/50 p-6 transition-all duration-300 hover:border-neutral-900 hover:bg-white hover:shadow-2xl"
              >
                {/* Top badges */}
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-800 shadow-sm">
                    Más elegido
                  </span>
                  {p.free_shipping && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-green-700">
                      <Truck className="h-3 w-3" /> Envío gratis
                    </span>
                  )}
                </div>

                {/* Tire Image */}
                <Link
                  to="/producto/$slug"
                  params={{ slug: p.slug }}
                  className="my-6 block aspect-square w-full overflow-hidden p-4 select-none"
                >
                  <img
                    src={tireImg}
                    alt={`${p.brand} ${p.model} ${p.size}`}
                    className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-110 drop-shadow-lg"
                    loading="lazy"
                    decoding="async"
                  />
                </Link>

                {/* Info */}
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="rounded-full bg-neutral-200/70 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-neutral-700">
                      {p.brand}
                    </span>
                    <span className="rounded-full bg-neutral-200/70 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-neutral-700 capitalize">
                      {mainCategory}
                    </span>
                  </div>

                  {/* Size as headline */}
                  <Link to="/producto/$slug" params={{ slug: p.slug }} className="block">
                    <h3 className="text-2xl font-black uppercase tracking-tight text-neutral-900 group-hover:text-[#E3151A] transition-colors">
                      {p.size || p.model}
                    </h3>
                    <p className="mt-1 line-clamp-1 text-sm font-semibold text-neutral-600">
                      {p.brand} {p.model}
                    </p>
                  </Link>

                  {/* Price */}
                  <div className="mt-4 flex items-baseline justify-between pt-3 border-t border-neutral-200/60">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Precio contado / online</p>
                      <p className="text-2xl font-black text-neutral-900">
                        {format(Number(p.price_ars))}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 flex gap-2">
                    <Link
                      to="/producto/$slug"
                      params={{ slug: p.slug }}
                      className="flex-1 rounded-full border border-neutral-900 py-2.5 text-center text-xs font-black uppercase tracking-wider text-neutral-900 hover:bg-neutral-900 hover:text-white transition duration-200"
                    >
                      Saber más
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
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E3151A] text-white hover:bg-[#c31116] transition shadow-md"
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
