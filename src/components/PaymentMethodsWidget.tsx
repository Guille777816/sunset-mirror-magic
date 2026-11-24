import React, { useState } from "react";
import { ShieldCheck, CreditCard, ChevronDown, ChevronUp, Sparkles, Building2, Smartphone } from "lucide-react";

interface PaymentMethodsWidgetProps {
  priceArs?: number;
  className?: string;
  compact?: boolean;
  showTransferBadge?: boolean;
}

const PAYMENT_METHODS = [
  { key: "visa", label: "Visa", src: "/images/payment-methods/visa.png" },
  { key: "mastercard", label: "Mastercard", src: "/images/payment-methods/mastercard.png" },
  { key: "american", label: "American Express", src: "/images/payment-methods/american.png" },
  { key: "mercadopago", label: "Mercado Pago", src: "/images/payment-methods/mercadopago.png" },
  { key: "modo", label: "MODO", src: "/images/payment-methods/modo.png" },
  { key: "naranja", label: "Naranja X", src: "/images/payment-methods/naranja.png" },
  { key: "cabal", label: "Cabal", src: "/images/payment-methods/cabal.png" },
  { key: "uala", label: "Ualá", src: "/images/payment-methods/uala.png" },
  { key: "gocuotas", label: "Go Cuotas", src: "/images/payment-methods/gocuotas.png" },
  { key: "rapipago", label: "Rapipago", src: "/images/payment-methods/rapipago.png" },
  { key: "pagofacil", label: "Pago Fácil", src: "/images/payment-methods/pagofacil.png" },
];

export function PaymentMethodsWidget({
  priceArs,
  className = "",
  compact = false,
  showTransferBadge = true,
}: PaymentMethodsWidgetProps) {
  const [showDetails, setShowDetails] = useState(false);

  const installmentVal = priceArs && priceArs > 0 ? Math.round(priceArs / 6) : null;
  const transferVal = priceArs && priceArs > 0 ? Math.round(priceArs * 0.85) : null;

  return (
    <div
      className={`rounded-2xl border border-neutral-200 bg-[#FAFAFA] transition-all duration-200 ${
        compact ? "p-3.5" : "p-4 sm:p-5"
      } ${className}`}
    >
      {/* Header con cuotas destacadas si hay precio */}
      {installmentVal && (
        <div className="mb-3.5 space-y-2.5 border-b border-neutral-200/70 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#009EE3]/15 text-[#009EE3] shrink-0">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 leading-tight">
                  Financiación en cuotas
                </p>
                <p className="text-sm sm:text-base font-black text-neutral-900 leading-snug">
                  <span className="text-[#009EE3]">6 cuotas fijas</span> sin interés de{" "}
                  <span className="text-[#0081b8]">${installmentVal.toLocaleString("es-AR")}</span>
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#009EE3]/10 px-3 py-1 text-xs font-bold text-[#0081b8] border border-[#009EE3]/20">
              <Sparkles className="h-3 w-3 text-[#009EE3]" />
              <span>Con todas las tarjetas</span>
            </div>
          </div>

          {showTransferBadge && transferVal && (
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200/80 px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-black uppercase text-white">
                  15% OFF
                </span>
                <span className="font-bold text-emerald-900">
                  Transferencia bancaria:
                </span>
              </div>
              <span className="text-sm font-black text-emerald-700">
                ${transferVal.toLocaleString("es-AR")}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Título cuando es compacto o no hay precio */}
      {!installmentVal && (
        <div className="mb-2.5 text-center sm:text-left">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-600">
            Medios de pago disponibles
          </p>
        </div>
      )}

      {/* Grid de tarjetas estilo Wigy */}
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
        {PAYMENT_METHODS.map((m) => (
          <div
            key={m.key}
            title={m.label}
            className="flex items-center justify-center rounded-lg border border-neutral-200/90 bg-white px-2 py-1 shadow-2xs hover:border-neutral-300 transition-colors w-[52px] h-[32px] sm:w-[58px] sm:h-[36px] overflow-hidden"
          >
            <img
              src={m.src}
              alt={m.label}
              loading="lazy"
              className="max-h-[20px] max-w-[92%] object-contain block select-none pointer-events-none"
            />
          </div>
        ))}
      </div>

      {/* Footer de seguridad y garantía de cuotas estilo Wigy */}
      <div className="mt-3.5 flex flex-wrap items-center justify-center sm:justify-between gap-2.5 border-t border-neutral-200/70 pt-3 text-xs text-neutral-600">
        <div className="flex items-center gap-1.5 font-medium">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-semibold text-neutral-700">Pago 100% seguro</span>
          <span className="text-neutral-400">·</span>
          <span className="text-neutral-500">Encriptación SSL</span>
        </div>

        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 transition"
        >
          <span>{showDetails ? "Ocultar promociones" : "Ver tarjetas y promociones"}</span>
          {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Desplegable informativo de medios y financiación */}
      {showDetails && (
        <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-3.5 text-xs text-neutral-600 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-start gap-2">
            <Building2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
            <p>
              <strong className="text-neutral-800">Tarjetas de crédito:</strong> 6 cuotas fijas sin interés con Visa, Mastercard, American Express, Cabal y Naranja X a través de Mercado Pago.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Smartphone className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
            <p>
              <strong className="text-neutral-800">Débito y prepagas:</strong> Visa Débito, Maestro, Mastercard Débito, Ualá, Mercado Pago y Lemon.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
            <p>
              <strong className="text-neutral-800">Transferencia Bancaria:</strong> 15% de descuento directo acreditando al Alias oficial <strong>LERADIAL</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
