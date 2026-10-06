import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, ShoppingCart, CheckCircle, Package, Download, CreditCard } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/lib/settings.functions";
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
  catalog_url?: string | null;
}

interface SunsetProductCardProps {
  product: Product;
  eager?: boolean;
}

export function SunsetProductCard({ product: p, eager = false }: SunsetProductCardProps) {
  const cart = useCart();
  const { format, currency, rates } = useCurrency();
  const [isFavorite, setIsFavorite] = useState(false);

  const { data: settings } = useQuery<any>({
    queryKey: ["settings"],
    queryFn: () => getSettings().catch(() => null),
    staleTime: 60_000,
  });

  // Fallback placeholder tire if image is missing
  const isPickup = p.category === "camionetas" || p.category === "suv" || p.model?.toLowerCase().includes("brutus");
  const isTruck = p.category === "camiones" || p.category === "pesados" || p.model?.toLowerCase().includes("xcurve");
  const fallbackImg = isPickup
    ? "/images/featured/brutus.webp"
    : isTruck
    ? "/images/featured/xcurve.webp"
    : "/images/featured/fastway.webp";

  const customVehicleImg = settings?.category_images?.[`vehicle:${p.id}`] || (p.slug ? settings?.category_images?.[`vehicle:${p.slug}`] : null);
  const customVehicleLabel = settings?.category_images?.[`vehicle_label:${p.id}`] || (p.slug ? settings?.category_images?.[`vehicle_label:${p.slug}`] : null);

  const defaultVehicleImg = isPickup
    ? "/images/featured/brutus-bg.jpg"
    : isTruck
    ? "/images/featured/xcurve-bg.jpg"
    : "/images/featured/fastway-bg.jpg";

  const vehicleImg = customVehicleImg || defaultVehicleImg;
  const vehicleLabel = customVehicleLabel || (isPickup ? "Camioneta / SUV" : isTruck ? "Camión Pesado" : "Auto / Calle");

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
      {/* 1. Cuadro 3D de imagen con giro de 180° en hover */}
      <div className="relative h-36 w-36 sm:h-44 sm:w-44 flex-shrink-0 [perspective:1000px] group/flip">
        {/* Botón de favoritos siempre visible por encima */}
        <button
          type="button"
          onClick={() => setIsFavorite(!isFavorite)}
          aria-label="Agregar a favoritos"
          className="absolute left-2 top-2 z-20 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-neutral-400 shadow-sm backdrop-blur-sm transition hover:text-red-500 hover:bg-white"
        >
          <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
        </button>

        {/* Tarjeta 3D que gira 180 grados al pasar el mouse */}
        <Link
          to="/producto/$slug"
          params={{ slug: p.slug }}
          className="relative block h-full w-full rounded-2xl transition-transform duration-700 [transform-style:preserve-3d] group-hover/flip:[transform:rotateY(180deg)] select-none"
        >
          {/* Cara frontal: Neumático */}
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-neutral-50/80 p-3 [backface-visibility:hidden] border border-neutral-200/70 shadow-sm">
            <img
              src={tireImg}
              alt={`${p.brand} ${p.model} ${p.size}`}
              loading={eager ? "eager" : "lazy"}
              decoding="async"
              className="max-h-full max-w-full object-contain drop-shadow transition-transform duration-300 group-hover/flip:scale-105"
              onError={(e) => {
                const el = e.currentTarget;
                if (!el.src.endsWith(fallbackImg)) {
                  el.src = fallbackImg;
                }
              }}
            />
          </div>

          {/* Cara trasera (girada 180°): Vehículo correspondiente */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl border border-neutral-200/80 [transform:rotateY(180deg)] [backface-visibility:hidden] shadow-md bg-neutral-900">
            <img
              src={vehicleImg}
              alt={vehicleLabel}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 group-hover/flip:scale-110"
            />
            {/* Overlay con gradiente y etiqueta del vehículo */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-white bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-center border border-white/20 shadow-sm">
                {vehicleLabel}
              </span>
            </div>
          </div>
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
          {priceArs > 0 && (
            <div className="mt-1 flex flex-col items-center md:items-end">
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 shadow-xs">
                <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                <span><strong>3</strong> cuotas fijas de <strong>$ {Math.round(priceArs / 3).toLocaleString("es-AR")}</strong></span>
              </div>
              <p className="mt-1 text-[10px] font-semibold text-neutral-500">
                Visa · Naranja X · SuCrédito · Cabal · Amex · Débito · Pix
              </p>
            </div>
          )}
          {currency === "ARS" && (
            <div className="mt-1 text-[11px] font-semibold text-neutral-400">
              (R$ {priceBrl.toLocaleString("es-AR", { maximumFractionDigits: 2 })} / U$ {priceUsd.toLocaleString("es-AR", { maximumFractionDigits: 2 })})
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="mt-4 flex w-full md:w-auto flex-wrap items-center gap-2">
          {p.catalog_url ? (
            <a
              href={p.catalog_url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#059669] px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:scale-105 hover:from-[#16A34A] hover:to-[#047857]"
              title="Descargar catálogo en PDF"
            >
              <Download className="h-3.5 w-3.5" /> Catálogo
            </a>
          ) : (
            <Link
              to="/producto/$slug"
              params={{ slug: p.slug }}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#059669] px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:scale-105 hover:from-[#16A34A] hover:to-[#047857]"
              title="Ver catálogo"
            >
              <Download className="h-3.5 w-3.5" /> Catálogo
            </Link>
          )}
          <Link
            to="/producto/$slug"
            params={{ slug: p.slug }}
            className="flex-1 md:flex-none rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-neutral-700 transition hover:bg-neutral-100"
          >
            Ver detalles
          </Link>
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#00A859] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-sm transition hover:bg-[#008f4c] hover:shadow"
          >
            <ShoppingCart className="h-4 w-4" /> Comprar
          </button>
        </div>
      </div>
    </div>
  );
}
