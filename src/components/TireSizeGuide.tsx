import React, { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";

const FRAMES = [
  "/images/tire-guide/Frame1.webp",
  "/images/tire-guide/Frame2.webp",
  "/images/tire-guide/Frame3.webp",
  "/images/tire-guide/Frame4.webp",
];

export function TireSizeGuide() {
  const [activeFrame, setActiveFrame] = useState(0);
  const [selectedPart, setSelectedPart] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-rotate frames when not hovering a specific part
  useEffect(() => {
    if (selectedPart !== null) return;
    const interval = setInterval(() => {
      setActiveFrame((prev) => (prev + 1) % FRAMES.length);
    }, 700);
    return () => clearInterval(interval);
  }, [selectedPart]);

  return (
    <section id="tire-size-guide" className="w-full bg-white py-16 lg:py-24 text-neutral-900 border-t border-neutral-100">
      <div className="container mx-auto px-4 max-w-5xl">
        <h2 className="text-center text-2xl font-black uppercase tracking-tight text-neutral-900 md:text-4xl">
          Cómo leer la medida de su neumático
        </h2>
        <p className="mt-2 text-center text-sm font-medium text-neutral-500">
          Entienda cada parámetro del flanco para elegir el rodado exacto para su vehículo
        </p>

        <div className="mt-10 lg:mt-14 flex flex-col items-center">
          {/* Rotating Tire with Interactive Hotspots */}
          <div 
            className="relative mx-auto aspect-square w-full max-w-[360px] md:max-w-[420px] select-none"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Tire Frame Image */}
            <div className="h-full w-full flex items-center justify-center p-4">
              <img
                src={FRAMES[activeFrame]}
                alt="Neumático con especificaciones de medida"
                className="h-full w-full object-contain drop-shadow-2xl transition-all duration-300"
                loading="lazy"
                decoding="async"
              />
            </div>

            {/* Hotspot Markers (ANCHO, ALTO, ARO) with red pulsing dots */}
            {/* ANCHO: Left side of tread */}
            <div
              className={`absolute cursor-pointer transition-all duration-300 ${
                selectedPart === 1 ? "scale-110 z-20" : "scale-100 z-10"
              }`}
              style={{ left: "22%", top: "18%" }}
              onMouseEnter={() => setSelectedPart(1)}
              onMouseLeave={() => setSelectedPart(null)}
              onClick={() => setSelectedPart(selectedPart === 1 ? null : 1)}
            >
              <div className="relative flex items-center gap-1.5">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E3151A] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E3151A]"></span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider shadow-md transition-colors ${
                  selectedPart === 1 ? "bg-[#E3151A] text-white" : "bg-white text-neutral-900 border border-neutral-200"
                }`}>
                  Ancho
                </span>
              </div>
            </div>

            {/* ALTO: Right top flank */}
            <div
              className={`absolute cursor-pointer transition-all duration-300 ${
                selectedPart === 2 ? "scale-110 z-20" : "scale-100 z-10"
              }`}
              style={{ right: "12%", top: "18%" }}
              onMouseEnter={() => setSelectedPart(2)}
              onMouseLeave={() => setSelectedPart(null)}
              onClick={() => setSelectedPart(selectedPart === 2 ? null : 2)}
            >
              <div className="relative flex items-center gap-1.5">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E3151A] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E3151A]"></span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider shadow-md transition-colors ${
                  selectedPart === 2 ? "bg-[#E3151A] text-white" : "bg-white text-neutral-900 border border-neutral-200"
                }`}>
                  Alto
                </span>
              </div>
            </div>

            {/* ARO: Rim / Inner center bottom */}
            <div
              className={`absolute cursor-pointer transition-all duration-300 ${
                selectedPart === 3 ? "scale-110 z-20" : "scale-100 z-10"
              }`}
              style={{ left: "46%", top: "72%" }}
              onMouseEnter={() => setSelectedPart(3)}
              onMouseLeave={() => setSelectedPart(null)}
              onClick={() => setSelectedPart(selectedPart === 3 ? null : 3)}
            >
              <div className="relative flex items-center gap-1.5">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E3151A] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E3151A]"></span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider shadow-md transition-colors ${
                  selectedPart === 3 ? "bg-[#E3151A] text-white" : "bg-white text-neutral-900 border border-neutral-200"
                }`}>
                  Aro
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Cards (265 / 70 / 16) */}
          <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Ancho */}
            <div
              className={`relative flex flex-col items-center gap-2 rounded-2xl p-5 text-center transition-all cursor-pointer border ${
                selectedPart === 1
                  ? "border-[#E3151A] bg-red-50/50 shadow-md scale-105"
                  : "border-neutral-200 bg-neutral-50 hover:border-neutral-400 hover:bg-white"
              }`}
              onMouseEnter={() => setSelectedPart(1)}
              onMouseLeave={() => setSelectedPart(null)}
              onClick={() => setSelectedPart(selectedPart === 1 ? null : 1)}
            >
              <div className="relative flex w-full items-center justify-center">
                <span className="text-3xl font-black text-neutral-900 lg:text-4xl">265</span>
                <span className="absolute right-0 top-1/2 -translate-y-1/2 hidden text-2xl font-bold text-neutral-300 sm:block">/</span>
              </div>
              <p className="text-xs font-black uppercase tracking-wider text-neutral-900">Ancho</p>
              <p className="text-xs text-neutral-500">Ancho de la sección de la cubierta en milímetros (mm).</p>
            </div>

            {/* Alto */}
            <div
              className={`relative flex flex-col items-center gap-2 rounded-2xl p-5 text-center transition-all cursor-pointer border ${
                selectedPart === 2
                  ? "border-[#E3151A] bg-red-50/50 shadow-md scale-105"
                  : "border-neutral-200 bg-neutral-50 hover:border-neutral-400 hover:bg-white"
              }`}
              onMouseEnter={() => setSelectedPart(2)}
              onMouseLeave={() => setSelectedPart(null)}
              onClick={() => setSelectedPart(selectedPart === 2 ? null : 2)}
            >
              <div className="relative flex w-full items-center justify-center">
                <span className="text-3xl font-black text-neutral-900 lg:text-4xl">70</span>
                <span className="absolute right-0 top-1/2 -translate-y-1/2 hidden text-2xl font-bold text-neutral-300 sm:block">/</span>
              </div>
              <p className="text-xs font-black uppercase tracking-wider text-neutral-900">Alto (Perfil)</p>
              <p className="text-xs text-neutral-500">Relación porcentual entre la altura del flanco y el ancho.</p>
            </div>

            {/* Aro */}
            <div
              className={`relative flex flex-col items-center gap-2 rounded-2xl p-5 text-center transition-all cursor-pointer border ${
                selectedPart === 3
                  ? "border-[#E3151A] bg-red-50/50 shadow-md scale-105"
                  : "border-neutral-200 bg-neutral-50 hover:border-neutral-400 hover:bg-white"
              }`}
              onMouseEnter={() => setSelectedPart(3)}
              onMouseLeave={() => setSelectedPart(null)}
              onClick={() => setSelectedPart(selectedPart === 3 ? null : 3)}
            >
              <div className="relative flex w-full items-center justify-center">
                <span className="text-3xl font-black text-neutral-900 lg:text-4xl">16</span>
              </div>
              <p className="text-xs font-black uppercase tracking-wider text-neutral-900">Aro (Rodado)</p>
              <p className="text-xs text-neutral-500">Diámetro interno de la llanta medido en pulgadas (R16).</p>
            </div>
          </div>

          {/* Quick link to search */}
          <div className="mt-8">
            <a
              href="#buscador"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E3151A] hover:underline"
            >
              Ver cubiertas disponibles por medida <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
