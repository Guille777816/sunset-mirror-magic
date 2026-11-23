import React from "react";
import { Truck, ExternalLink } from "lucide-react";

interface ProductShippingCalculatorProps {
  size?: string | null;
  selectedQty?: number;
}

export function getTireShippingSpecs(sizeStr: string = "", qty: number = 1) {
  let widthMm = 195;
  let aspect = 65;
  let rimInch = 15;

  const clean = sizeStr || "";
  const m = clean.match(/(\d{2,3})\/(\d{2})\s*(?:Z?R)?\s*(\d{2})/i);
  if (m) {
    widthMm = parseInt(m[1], 10);
    aspect = parseInt(m[2], 10);
    rimInch = parseInt(m[3], 10);
  } else {
    const mInch = clean.match(/(\d{2})\s*x\s*(\d{1,2}(?:\.\d+)?)\s*R?\s*(\d{2})/i);
    if (mInch) {
      widthMm = Math.round(parseFloat(mInch[2]) * 25.4);
      aspect = 70;
      rimInch = parseInt(mInch[3], 10);
    }
  }

  // Ancho en cm de 1 cubierta
  const unitAnchoCm = Math.round(widthMm / 10);
  // Altura de perfil en mm
  const perfilMm = (widthMm * aspect) / 100;
  // Diámetro exterior total en cm
  const diametroCm = Math.round((rimInch * 2.54) + (2 * perfilMm / 10));

  // Peso unitario estimado en kg
  let unitPesoKg = 8.5;
  if (rimInch <= 13) unitPesoKg = 7.0;
  else if (rimInch === 14) unitPesoKg = 7.8;
  else if (rimInch === 15) unitPesoKg = widthMm >= 215 ? 10.5 : 8.8;
  else if (rimInch === 16) unitPesoKg = widthMm >= 235 ? 13.5 : 10.5;
  else if (rimInch === 17) unitPesoKg = widthMm >= 245 ? 15.5 : 11.8;
  else if (rimInch === 18) unitPesoKg = widthMm >= 255 ? 16.5 : 12.8;
  else if (rimInch >= 19) unitPesoKg = 14.5;

  return {
    altoCm: diametroCm,
    anchoCm: unitAnchoCm,
    largoCm: diametroCm,
    pesoKg: Math.round(unitPesoKg * 10) / 10,
  };
}

export function ProductShippingCalculator({ size, selectedQty = 1 }: ProductShippingCalculatorProps) {
  const specs = getTireShippingSpecs(size || "", selectedQty);

  const couriers = [
    {
      name: "Correo Argentino",
      url: "https://www.correoargentino.com.ar/servicios/paqueteria/paqueteria-e-commerce",
      logo: "/images/shipping/correo-argentino.png",
      borderColor: "hover:border-amber-400",
    },
    {
      name: "Vía Cargo",
      url: "https://www.viacargo.com.ar/",
      logo: "/images/shipping/via-cargo.png",
      borderColor: "hover:border-red-400",
    },
    {
      name: "Andreani",
      url: "https://www.andreani.com/",
      logo: "/images/shipping/andreani.png",
      borderColor: "hover:border-red-500",
    },
    {
      name: "Crucero Express",
      url: "https://www.cruceroexpress.com.ar/",
      logo: "/images/shipping/crucero-express.jpg",
      borderColor: "hover:border-blue-500",
    },
  ];

  return (
    <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-xs">
      <div className="flex items-center gap-2 mb-3">
        <Truck className="h-5 w-5 text-secondary" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-secondary">
          Medidas y Peso para cotizar tu envío
        </h3>
      </div>

      {/* Cuadro de Medidas del Producto */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
        <div className="rounded-xl bg-neutral-50 border border-neutral-200/80 p-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
            Altura
          </span>
          <span className="text-lg font-black text-secondary">
            {specs.altoCm} cm
          </span>
        </div>

        <div className="rounded-xl bg-neutral-50 border border-neutral-200/80 p-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
            Ancho
          </span>
          <span className="text-lg font-black text-secondary">
            {specs.anchoCm} cm
          </span>
        </div>

        <div className="rounded-xl bg-neutral-50 border border-neutral-200/80 p-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
            Largo / Profundo
          </span>
          <span className="text-lg font-black text-secondary">
            {specs.largoCm} cm
          </span>
        </div>

        <div className="rounded-xl bg-neutral-50 border border-neutral-200/80 p-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
            Peso
          </span>
          <span className="text-lg font-black text-secondary">
            {specs.pesoKg} kg
          </span>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-neutral-400 text-center sm:text-left">
        * Medidas aproximadas por unidad para ingresar en el cotizador del transporte.
      </p>

      {/* Logos de los Transportes (uno al lado del otro abajo de las medidas) */}
      <div className="mt-4 pt-3.5 border-t border-neutral-100">
        <p className="text-xs font-bold text-neutral-700 mb-2.5 text-center sm:text-left">
          Cotizá online ingresando estos datos en tu transporte de confianza:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {couriers.map((c) => (
            <a
              key={c.name}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center h-16 rounded-xl border border-neutral-200 bg-white p-2.5 shadow-2xs transition-all hover:scale-[1.02] hover:shadow-sm ${c.borderColor} group`}
              title={`Cotizar en ${c.name}`}
            >
              <img
                src={c.logo}
                alt={c.name}
                className="max-h-10 max-w-full object-contain transition-transform group-hover:scale-105"
              />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
