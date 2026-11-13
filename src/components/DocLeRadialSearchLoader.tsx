import React from "react";

interface Props {
  active: boolean;
  message?: string;
}

export function DocLeRadialSearchLoader({
  active,
  message = "El Doc está buscando tus cubiertas...",
}: Props) {
  if (!active) return null;

  return (
    <div
      aria-live="polite"
      className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative flex flex-col items-center rounded-3xl bg-white/95 px-8 py-7 shadow-2xl border border-slate-100 max-w-sm text-center">
        {/* Doc saltando animado que cae y rebota */}
        <div className="relative mb-3 flex h-32 w-32 items-center justify-center overflow-hidden rounded-full ring-4 ring-[#0099a8]/30 bg-slate-50 shadow-inner">
          <img
            src="/images/doc-leradial-jump.jpg"
            alt="Doc Le Radial saltando"
            className="h-full w-full object-cover animate-bounce"
            style={{ animationDuration: "0.85s" }}
          />
        </div>

        <h4 className="text-base font-black text-slate-800 tracking-tight">
          ¡Buscando en Le Radial!
        </h4>
        <p className="mt-1 text-xs font-semibold text-[#0099a8] animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
}
