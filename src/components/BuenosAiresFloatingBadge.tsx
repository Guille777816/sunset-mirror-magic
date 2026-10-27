import React, { useState } from "react";
import { Truck, X, Sparkles, HandCoins } from "lucide-react";

interface Props {
  whatsappNumber?: string;
}

export function BuenosAiresFloatingBadge({ whatsappNumber = "5491123951455" }: Props) {
  const [closed, setClosed] = useState(false);
  const [minimized, setMinimized] = useState(false);

  if (closed) return null;

  const waText = encodeURIComponent(
    "¡Hola Le Radial! Vi la promo de Envíos en el Día en Buenos Aires y quiero consultar por compras mayoristas con pago contra entrega."
  );
  const waHref = `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${waText}`;

  if (minimized) {
    return (
      <aside aria-label="Aviso comercial" className="fixed bottom-24 right-4 z-40">
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-2xl ring-2 ring-white transition-all hover:scale-105"
        >
          <Truck className="h-4 w-4 animate-bounce text-yellow-300" />
          <span>¡Bs. As. Envíos en el Día!</span>
        </button>
      </aside>
    );
  }

  return (
    <aside aria-label="Promoción Buenos Aires" className="fixed bottom-24 right-4 z-40 max-w-[320px] sm:max-w-[360px] animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="relative group">
        {/* Botón para cerrar/minimizar */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMinimized(true);
          }}
          className="absolute -top-2.5 -right-2.5 z-50 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white shadow-md ring-2 ring-white transition hover:bg-red-600"
          title="Minimizar aviso"
          aria-label="Minimizar aviso"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Cartel Flotante Estilo Sticker Cyber / Impacto Automotriz */}
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="block transform -rotate-2 select-none rounded-2xl bg-gradient-to-br from-violet-700 via-purple-600 to-indigo-800 p-1.5 shadow-[0_12px_40px_rgba(109,40,217,0.45)] ring-4 ring-white/90 transition-all duration-300 hover:rotate-0 hover:scale-[1.03] hover:shadow-[0_16px_50px_rgba(109,40,217,0.65)]"
        >
          {/* Contenedor interior con borde fino y textura */}
          <div className="rounded-xl border border-white/25 bg-gradient-to-b from-white/10 to-transparent p-3.5 text-white backdrop-blur-sm">
            {/* Tag superior estilo Sticker */}
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-yellow-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-950 shadow-sm">
                <Sparkles className="h-3 w-3 text-slate-950" />
                ¡NUEVO EN BS. AS.!
              </span>
              <span className="text-[10px] font-bold text-violet-200 tracking-wider uppercase">
                Stock Inmediato
              </span>
            </div>

            {/* Titular Principal en tipografía Cyber Impact */}
            <div className="leading-tight mb-2">
              <div className="text-[19px] sm:text-[21px] font-black italic tracking-tighter uppercase text-white drop-shadow-md">
                ENVÍOS EN EL DÍA
              </div>
              <div className="text-[12px] sm:text-[13px] font-black tracking-tight uppercase text-yellow-300 drop-shadow">
                ⚡ CABA Y GRAN BUENOS AIRES
              </div>
            </div>

            {/* Cinta Mayorista con Pago Contra Entrega */}
            <div className="rounded-lg bg-black/40 p-2 border border-white/15">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase text-emerald-300">
                <HandCoins className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>COMPRAS MAYORISTAS</span>
              </div>
              <div className="text-[11px] font-bold text-white/95 mt-0.5">
                👉 Pago <span className="underline decoration-emerald-400 font-black">Contra Entrega</span> al recibir
              </div>
            </div>

            {/* Llamado a la acción rápido */}
            <div className="mt-2.5 flex items-center justify-between text-[11px] font-bold text-violet-100">
              <span className="flex items-center gap-1 text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                Atención Mayorista Inmediata
              </span>
              <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white group-hover:bg-yellow-400 group-hover:text-slate-950 transition-colors">
                Consultar ➔
              </span>
            </div>
          </div>
        </a>
      </div>
    </aside>
  );
}
