import React, { useState, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Props {
  whatsappNumber?: string;
}

export function DocLeRadialFloatingWidget({ whatsappNumber = "5491123951455" }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { data: settings } = useQuery<any>({ queryKey: ["settings"] });

  useEffect(() => {
    // Mostrar tooltip después de 2.5s
    const timer = setTimeout(() => {
      setShowTooltip(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const effectiveNumber = settings?.whatsapp || whatsappNumber || "5491123951455";
  const cleanNumber = effectiveNumber.replace(/\D/g, "");
  const waText = encodeURIComponent(
    "¡Hola Doc Le Radial! Estaba viendo la web y quería consultar el precio y stock para una medida de cubiertas."
  );
  const waHref = `https://wa.me/${cleanNumber}?text=${waText}`;

  return (
    <aside
      aria-label="Atención con el Doc Le Radial"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-3 select-none"
    >
      {/* Tooltip / Cartel estilo cómic tipo Sunset/XBRI */}
      {showTooltip && !dismissed && (
        <div className="relative animate-in fade-in slide-in-from-right-4 duration-300">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 shadow-[0_10px_25px_rgba(0,0,0,0.18)] border border-slate-100 transition-all hover:bg-slate-50 hover:scale-[1.02] group"
          >
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0099a8]">
                Atención Online
              </span>
              <span className="text-xs font-black text-slate-800 leading-tight">
                ¿Dudas con tu medida? Hablá con el Doc 👋
              </span>
            </div>
          </a>

          {/* Botón cerrar tooltip para que no moleste */}
          <button
            onClick={() => setDismissed(true)}
            className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-white shadow hover:bg-slate-900 transition"
            title="Cerrar mensaje"
            aria-label="Cerrar mensaje"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Botón Circular con el Doc Le Radial */}
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar al Doc Le Radial por WhatsApp"
        className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-white p-1 shadow-[0_10px_30px_rgba(0,153,168,0.35)] ring-4 ring-[#0099a8]/30 transition-all duration-300 hover:scale-110 hover:shadow-[0_15px_35px_rgba(0,153,168,0.5)] focus:outline-none"
      >
        {/* Foto redonda del Doc */}
        <div className="h-full w-full overflow-hidden rounded-full bg-slate-50 border-2 border-[#0099a8]">
          <img
            src="/images/doc-leradial-thumb.jpg"
            alt="Doc Le Radial"
            className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-110"
          />
        </div>

        {/* Pequeña insignia de WhatsApp en la esquina */}
        <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#25D366] text-white shadow-md ring-2 ring-white">
          <MessageCircle className="h-3.5 w-3.5 fill-current" />
        </span>
      </a>
    </aside>
  );
}
