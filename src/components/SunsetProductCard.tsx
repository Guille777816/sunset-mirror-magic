import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, ShoppingCart, CheckCircle, Package } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useCurrency } from "@/lib/currency";
import { BrandLogo } from "./BrandLogo";

interface Product {
  id: string;
  slug: string;
  brand: string;
  model: string;
  size: string;
  category: string;
  price_ars: number;
  stock?: number;
  image_url?: string | null;
  is_featured?: boolean;
  free_shipping?: boolean;
}

interface SunsetProductCardProps {
  product: Product;
  eager?: boolean;
}

export function SunsetProductCard({ product: p, eager = false }: SunsetProductCardProps) {
  const cart = useCart();
  const { format, currency, rates } = useCurrency();
  const [isFavorite, setIsFavorite] = useState(false);

  // Fallback placeholder tire if image is missing
  const isPickup = p.category === "camionetas" || p.category === "suv" || p.model?.toLowerCase().includes("brutus");
  const isTruck = p.category === "camiones" || p.category === "pesados" || p.model?.toLowerCase().includes("xcurve");
  const fallbackImg = isPickup
    ? "/images/featured/brutus.webp"
    : isTruck
    ? "/images/featured/xcurve.webp"
    : "/images/featured/fastway.webp";

  const tireImg = p.image_url || fallbackImg;

  // Secondary price conversions for multi-currency preview
  const priceArs = Number(p.price_ars) || 0;
  const priceUsd = Math.round(priceArs / (rates.rate_usd || 1450));
  const priceBrl = Math.round(priceArs / (rates.rate_brl || 279));

  const handleAddToCart = () => {
    cart.add({
      id: p.id,
      brand: p.brand,
      model: p.model,
      size: p.size,
      price_ars: priceArs,
      image_url: p.image_url,
    });
    cart.open();
  };

  return (
    <div className="group relative flex flex-col md:flex-row items-center justify-between gap-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-neutral-300 hover:shadow-md">
      {/* 1. Imagen del neumático con botón de favoritos */}
      <div className="relative flex h-36 w-36 sm:h-44 sm:w-44 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-50/60 p-2">
        <button
          type="button"
          onClick={() => setIsFavorite(!isFavorite)}
          aria-label="Agregar a favoritos"
          className="absolute left-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-neutral-400 shadow-sm backdrop-blur-sm transition hover:text-red-500 hover:bg-white"
        >
          <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
        </button>

        <Link
          to="/producto/$slug"
          params={{ slug: p.slug }}
          className="flex h-full w-full items-center justify-center select-none"
        >
          <img
            src={tireImg}
            alt={`${p.brand} ${p.model} ${p.size}`}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            className="max-h-full max-w-full object-contain drop-shadow transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              const el = e.currentTarget;
              if (el.src !== fallbackImg) el.src = fallbackImg;
            }}
          />
        </Link>
      </div>

      {/* 2. Detalles centrales (Logotipo, Modelo, Medida, Stock) */}
      <div className="flex-1 text-center md:text-left space-y-2">
        {/* Logotipo de la marca */}
        <div className="flex justify-center md:justify-start items-center">
          <BrandLogo brand={p.brand} className="h-6 w-auto max-w-[120px]" />
        </div>

        {/* Modelo en tipografía gruesa e imponente */}
        <Link to="/producto/$slug" params={{ slug: p.slug }} className="block">
          <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neutral-900 transition hover:text-[#E3151A]">
            {p.model || p.size}
          </h3>
        </Link>

        {/* Medida completa */}
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-neutral-500">
          {p.size ? `${p.size} ${p.model}` : `${p.brand} ${p.model}`}
        </p>

        {/* Badge de stock */}
        <div className="pt-1 flex items-center justify-center md:justify-start gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            <Package className="h-3.5 w-3.5" /> En stock
          </span>
          {p.free_shipping && (
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200">
              Envío gratis
            </span>
          )}
        </div>
      </div>

      {/* 3. Columna derecha (Precio + Botones de Acción) */}
      <div className="flex w-full md:w-auto flex-col items-center md:items-end justify-center border-t border-neutral-100 pt-4 md:border-t-0 md:pt-0">
        {/* Precio en ARS */}
        <div className="text-center md:text-right">
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900">
            {format(priceArs)}
          </div>
          {currency === "ARS" && (
            <div className="mt-0.5 text-[11px] font-semibold text-neutral-400">
              (R$ {priceBrl.toLocaleString("es-AR", { maximumFractionDigits: 2 })} / U$ {priceUsd.toLocaleString("es-AR", { maximumFractionDigits: 2 })})
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="mt-4 flex w-full md:w-auto items-center gap-2">
          <Link
            to="/producto/$slug"
            params={{ slug: p.slug }}
            className="flex-1 md:flex-none rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-neutral-700 transition hover:bg-neutral-100"
          >
            Ver detalles
          </Link>
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#00A859] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-sm transition hover:bg-[#008f4c] hover:shadow"
          >
            <ShoppingCart className="h-4 w-4" /> Comprar
          </button>
        </div>
      </div>
    </div>
  );
}
