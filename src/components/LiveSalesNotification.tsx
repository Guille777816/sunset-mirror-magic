import React, { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle, X } from "lucide-react";

interface SaleNotification {
  customer: string;
  city: string;
  qty: number;
  brand: string;
  model: string;
  size: string;
  slug: string;
  image_url: string;
  timeAgo: string;
}

const SALES_POOL: Omit<SaleNotification, "timeAgo" | "qty">[] = [
  {
    customer: "Lucas",
    city: "Rosario, SF",
    brand: "MICHELIN",
    model: "Primacy 5",
    size: "205/55 R16",
    slug: "michelin-primacy-5-205-55-r16-94v-xl",
    image_url: "https://cdn.shopify.com/s/files/1/0780/9535/1865/files/neumatico-michelin-primacy-4_f0122e20-3023-455b-8874-cefcdd7bf9b4.jpg?v=1790925375",
  },
  {
    customer: "Martín",
    city: "Córdoba Capital",
    brand: "XBRI",
    model: "Fastway A2",
    size: "185/65 R14",
    slug: "xbri-185-65r14-86h-fastway-a2",
    image_url: "/images/featured/fastway.webp",
  },
  {
    customer: "Esteban",
    city: "Tandil, Bs. As.",
    brand: "XBRI",
    model: "Brutus T/A",
    size: "265/65 R17",
    slug: "xbri-xbri-lt265-65r17-120-117s-brutus-t-a",
    image_url: "/images/featured/brutus.webp",
  },
  {
    customer: "Gonzalo",
    city: "Mendoza Capital",
    brand: "GOODYEAR",
    model: "EfficientGrip",
    size: "195/65 R15",
    slug: "goodyear-efficientgrip-195-65-r15-91h",
    image_url: "https://cdn.shopify.com/s/files/1/0780/9535/1865/files/neumatico-goodyear-efficientgrip-performance_e3ea0185-520e-4dd1-8769-cf56a93cb3aa.jpg?v=1790925370",
  },
  {
    customer: "Federico",
    city: "Mar del Plata",
    brand: "HANKOOK",
    model: "Kinergy ST",
    size: "175/65 R14",
    slug: "hankook-hankook-kinergy-st-175-65-r14-82t",
    image_url: "https://cdn.shopify.com/s/files/1/0780/9535/1865/files/neumatico-hankook-kinergy-st-h735_c0b991da-10eb-4b2a-a9a3-958863fbe567.jpg?v=1790925376",
  },
  {
    customer: "Joaquín",
    city: "Neuquén",
    brand: "CONTINENTAL",
    model: "ExtremeContact",
    size: "225/45 R17",
    slug: "continental-allseasoncontact-2-225-45r19-96v",
    image_url: "/images/products/continental-local-continental-extremecontact-sport-02-225-45-r18-91y.webp",
  },
  {
    customer: "Marcos",
    city: "Pergamino, Bs. As.",
    brand: "BKT",
    model: "TR-273 R-2 Arrocera",
    size: "23.1 – 26",
    slug: "bkt-23-1-26-12pr-bkt-r-3-tr390-e-tl",
    image_url: "https://www.gyscubiertas.com.py/userfiles/images/productos/600/bkt-tr-273-r.jpg",
  },
  {
    customer: "Mariano",
    city: "Posadas, Misiones",
    brand: "PIRELLI",
    model: "Formula Energy",
    size: "175/70 R14",
    slug: "posadas-175-70r14-88t-xl-chrono",
    image_url: "/images/products/posadas-175-70r14-84t-f-engy.webp",
  },
  {
    customer: "Alejandro",
    city: "Bahía Blanca",
    brand: "BRIDGESTONE",
    model: "Dueler AT Revo 2",
    size: "205/60 R16",
    slug: "nasser-bridgestone-dueler-at-revo-2-205-60r16-92t",
    image_url: "https://cdn.shopify.com/s/files/1/0780/9535/1865/files/neumatico-bridgestone-dueler-a-t-revo-2_c0a520a1-7788-4e56-9b57-65775f0a0008.jpg?v=1790925372",
  },
  {
    customer: "Nicolás",
    city: "Río Cuarto, Cba",
    brand: "FIRESTONE",
    model: "Destination A/T",
    size: "235/75 R15",
    slug: "nasser-firestone-destination-a-t-2-235-75r16-106s",
    image_url: "https://cdn.shopify.com/s/files/1/0780/9535/1865/files/neumatico-firestone-destination-a-t_adfe8952-4fe3-488b-a25e-aa782e21b714.jpg?v=1790925372",
  },
];

const TIME_AGO_OPTIONS = [
  "Hace 2 minutos",
  "Hace 4 minutos",
  "Hace 7 minutos",
  "Hace 11 minutos",
  "Hace 16 minutos",
  "Hace 23 minutos",
];

export function LiveSalesNotification() {
  const [current, setCurrent] = useState<SaleNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;

    let displayTimeout: NodeJS.Timeout;
    let nextTimeout: NodeJS.Timeout;
    let poolIndex = Math.floor(Math.random() * SALES_POOL.length);

    const showNext = () => {
      const base = SALES_POOL[poolIndex % SALES_POOL.length];
      poolIndex++;

      const qtyOptions = [2, 4, 4, 2, 4];
      const qty = qtyOptions[Math.floor(Math.random() * qtyOptions.length)];
      const timeAgo = TIME_AGO_OPTIONS[Math.floor(Math.random() * TIME_AGO_OPTIONS.length)];

      setCurrent({
        ...base,
        qty,
        timeAgo,
      });

      setIsVisible(true);

      // Permanece visible 5.5 segundos
      displayTimeout = setTimeout(() => {
        setIsVisible(false);

        // Espera 13 segundos antes de mostrar el siguiente
        nextTimeout = setTimeout(() => {
          showNext();
        }, 13000);
      }, 5500);
    };

    // Primera aparición a los 5 segundos de entrar al sitio
    const initialTimer = setTimeout(() => {
      showNext();
    }, 5000);

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(displayTimeout);
      clearTimeout(nextTimeout);
    };
  }, [dismissed]);

  if (dismissed || !current) return null;

  return (
    <div
      className={`fixed bottom-5 left-5 z-40 transition-all duration-500 ease-out select-none ${
        isVisible
          ? "opacity-100 translate-x-0 pointer-events-auto"
          : "opacity-0 -translate-x-6 pointer-events-none"
      }`}
      style={{ maxWidth: "calc(100vw - 96px)" }}
    >
      <div className="relative flex items-center gap-3.5 rounded-2xl bg-white border border-neutral-200/90 p-3 sm:p-3.5 shadow-[0_12px_30px_-6px_rgba(0,0,0,0.14),0_4px_10px_-2px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.18)] transition-shadow duration-300 w-full max-w-[360px]">
        {/* Botón cerrar sutil */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
            setDismissed(true);
          }}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-neutral-200 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 shadow-xs flex items-center justify-center transition-colors"
          title="Cerrar notificación"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Thumbnail del neumático */}
        <Link
          to={`/producto/${current.slug}`}
          className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl bg-neutral-50 border border-neutral-100 p-1 flex items-center justify-center shrink-0 overflow-hidden hover:opacity-90 transition-opacity"
        >
          <img
            src={current.image_url}
            alt={`${current.brand} ${current.model}`}
            loading="lazy"
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/images/featured/fastway.webp";
            }}
          />
        </Link>

        {/* Contenido textual */}
        <Link
          to={`/producto/${current.slug}`}
          className="flex-1 min-w-0 flex flex-col justify-center text-left no-underline"
        >
          <div className="text-[12px] sm:text-[13px] font-semibold text-neutral-800 leading-tight truncate">
            {current.customer} de <span className="text-neutral-900 font-bold">{current.city}</span> compró {current.qty} u.
          </div>

          <div className="text-[13px] sm:text-[14px] font-black text-neutral-900 leading-snug truncate mt-0.5">
            {current.brand} {current.model}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 mt-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">{current.size}</span>
            <span className="text-neutral-300">•</span>
            <span className="text-neutral-400 font-normal">{current.timeAgo}</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
