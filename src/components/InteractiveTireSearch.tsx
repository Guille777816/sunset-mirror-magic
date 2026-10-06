import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, ChevronDown, ChevronUp, X } from "lucide-react";

interface InteractiveTireSearchProps {
  products: Array<{ size?: string | null; category?: string | null; categories?: string[] | null }>;
  onSearch: (measure: { width?: string; aspect?: string; rim?: string }) => void;
  className?: string;
}

export function InteractiveTireSearch({ products, onSearch, className = "" }: InteractiveTireSearchProps) {
  const [selectedWidth, setSelectedWidth] = useState<string>("");
  const [selectedAspect, setSelectedAspect] = useState<string>("");
  const [selectedRim, setSelectedRim] = useState<string>("");

  // Which dropdown is open: "width" | "aspect" | "rim" | null
  const [openStep, setOpenStep] = useState<"width" | "aspect" | "rim" | null>(null);

  // Search filter query inside the currently open dropdown tray
  const [trayFilterQuery, setTrayFilterQuery] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);

  // Estado del "relojito" automático que rota entre Ancho (175) -> Alto (70) -> Aro (14)
  const [activeGuideIndex, setActiveGuideIndex] = useState<number>(1); // 0: Ancho, 1: Alto, 2: Aro
  const isInteracting = openStep !== null;

  useEffect(() => {
    if (isInteracting) return;
    const interval = setInterval(() => {
      setActiveGuideIndex((prev) => (prev + 1) % 3);
    }, 2800);
    return () => clearInterval(interval);
  }, [isInteracting]);

  // Si el usuario abre un paso manualmente, sincronizamos el dibujo
  useEffect(() => {
    if (openStep === "width") setActiveGuideIndex(0);
    else if (openStep === "aspect") setActiveGuideIndex(1);
    else if (openStep === "rim") setActiveGuideIndex(2);
  }, [openStep]);

  // Cerrar al clickear afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenStep(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Parsear medidas de productos
  const parsedTires = useMemo(() => {
    const list: Array<{ w: string; h: string; r: string; isCommercial: boolean }> = [];
    products.forEach((p) => {
      const s = (p.size || "").trim();
      if (!s) return;

      const m1 = s.match(/([0-9]{3})\s*(?:\/|-)\s*([0-9]{2}(?:\.[0-9])?)\s*(?:R|Z?R|-)?\s*([0-9]{2}(?:\.[0-9])?)/i);
      if (m1) {
        const wNum = parseInt(m1[1]);
        const rNum = parseFloat(m1[3]);
        const isCommercial = wNum >= 285 || rNum >= 19.5;
        list.push({ w: m1[1], h: m1[2], r: m1[3], isCommercial });
        return;
      }

      const m2 = s.match(/([0-9]{2}(?:\.[0-9]{2})?)\s*(?:X|\/)\s*([0-9]{1,2}\.[0-9]{2})\s*(?:R|-)?\s*([0-9]{2})/i);
      if (m2) {
        list.push({ w: m2[1], h: m2[2], r: m2[3], isCommercial: false });
        return;
      }

      const m3 = s.match(/([0-9]{1,2}(?:\.[0-9]{2})?)\s*R\s*([0-9]{2}(?:\.[0-9])?)/i);
      if (m3) {
        list.push({ w: m3[1], h: "STD", r: m3[2], isCommercial: true });
        return;
      }
    });
    return list;
  }, [products]);

  // Anchos disponibles
  const { passengerWidths, commercialWidths } = useMemo(() => {
    const pass = new Set<string>();
    const comm = new Set<string>();
    parsedTires.forEach((t) => {
      if (t.isCommercial) comm.add(t.w);
      else pass.add(t.w);
    });
    const sortFn = (a: string, b: string) => parseFloat(a) - parseFloat(b);
    return {
      passengerWidths: Array.from(pass).sort(sortFn),
      commercialWidths: Array.from(comm).sort(sortFn),
    };
  }, [parsedTires]);

  // Perfiles disponibles
  const availableAspects = useMemo(() => {
    const aspects = new Set<string>();
    parsedTires.forEach((t) => {
      if (!selectedWidth || t.w === selectedWidth) {
        if (t.h !== "STD") aspects.add(t.h);
      }
    });
    return Array.from(aspects).sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [parsedTires, selectedWidth]);

  // Aros disponibles
  const availableRims = useMemo(() => {
    const rims = new Set<string>();
    parsedTires.forEach((t) => {
      const matchW = !selectedWidth || t.w === selectedWidth;
      const matchH = !selectedAspect || t.h === selectedAspect;
      if (matchW && matchH) rims.add(t.r);
    });
    return Array.from(rims).sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [parsedTires, selectedWidth, selectedAspect]);

  // Manejo de selección secuencial automática
  const handleSelectWidth = (w: string) => {
    setSelectedWidth(w);
    setSelectedAspect("");
    setSelectedRim("");
    setTrayFilterQuery("");
    setTimeout(() => {
      setOpenStep("aspect");
    }, 120);
  };

  const handleSelectAspect = (h: string) => {
    setSelectedAspect(h);
    setSelectedRim("");
    setTrayFilterQuery("");
    setTimeout(() => {
      setOpenStep("rim");
    }, 120);
  };

  const handleSelectRim = (r: string) => {
    setSelectedRim(r);
    setOpenStep(null);
    setTrayFilterQuery("");
    onSearch({
      width: selectedWidth || undefined,
      aspect: selectedAspect || undefined,
      rim: r || undefined,
    });
  };

  const clearWidth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedWidth("");
    setSelectedAspect("");
    setSelectedRim("");
    setOpenStep("width");
  };

  const clearAspect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAspect("");
    setSelectedRim("");
    setOpenStep("aspect");
  };

  const clearRim = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRim("");
    setOpenStep("rim");
  };

  const handleManualSearch = () => {
    setOpenStep(null);
    onSearch({
      width: selectedWidth || undefined,
      aspect: selectedAspect || undefined,
      rim: selectedRim || undefined,
    });
  };

  // Configuración de los 3 pasos de la infografía dinámica estilo reloj de XBRI
  const guideSteps = [
    {
      key: "width",
      val: selectedWidth || "175",
      label: "ANCHO",
      lineY: 62,
      targetX: 200,
      targetY: 62,
    },
    {
      key: "aspect",
      val: selectedAspect || "70",
      label: "ALTO",
      lineY: 82,
      targetX: 236,
      targetY: 82,
    },
    {
      key: "rim",
      val: selectedRim || "14",
      label: "ARO",
      lineY: 104,
      targetX: 270,
      targetY: 104,
    },
  ];

  const currentGuide = guideSteps[activeGuideIndex];

  return (
    <div ref={containerRef} className={`relative w-full max-w-5xl mx-auto z-30 px-2 sm:px-4 ${className}`}>
      {/* Marco principal Glassmorphism idéntico a XBRI */}
      <div className="relative overflow-hidden rounded-[32px] sm:rounded-[38px] border border-white/20 bg-black/15 backdrop-blur-[6px] p-6 sm:p-10 md:p-12 shadow-[0_30px_70px_rgba(0,0,0,0.35)] transition-all">
        {/* Título idéntico a XBRI */}
        <h2 className="mb-8 text-center text-2xl sm:text-3xl md:text-[38px] font-black uppercase tracking-[0.06em] text-white drop-shadow-md">
          BUSCAR EL NEUMÁTICO IDEAL
        </h2>

        {/* Fila de Selectores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[1fr_1fr_1fr_180px] gap-3.5 items-end">
          {/* 1. ANCHO */}
          <div className="relative">
            <span className="block text-[11px] font-bold uppercase tracking-[1.2px] text-white/90 mb-1.5 ml-2.5">
              ANCHO
            </span>
            <button
              type="button"
              onClick={() => {
                setTrayFilterQuery("");
                setOpenStep(openStep === "width" ? null : "width");
              }}
              className={`w-full flex items-center justify-between rounded-full bg-white px-5 py-3 text-sm font-semibold text-neutral-900 shadow-md transition hover:bg-neutral-50 ${
                openStep === "width" ? "ring-2 ring-white" : ""
              }`}
            >
              <span className="truncate">{selectedWidth || "Seleccionar"}</span>
              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                {selectedWidth && (
                  <span
                    onClick={clearWidth}
                    className="p-0.5 rounded-full hover:bg-neutral-200 text-neutral-400 hover:text-neutral-900"
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
                {openStep === "width" ? (
                  <ChevronUp className="h-4 w-4 text-neutral-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-neutral-400" />
                )}
              </div>
            </button>
          </div>

          {/* 2. ALTURA */}
          <div className="relative">
            <span className="block text-[11px] font-bold uppercase tracking-[1.2px] text-white/90 mb-1.5 ml-2.5">
              ALTURA
            </span>
            <button
              type="button"
              onClick={() => {
                setTrayFilterQuery("");
                setOpenStep(openStep === "aspect" ? null : "aspect");
              }}
              className={`w-full flex items-center justify-between rounded-full bg-white px-5 py-3 text-sm font-semibold text-neutral-900 shadow-md transition hover:bg-neutral-50 ${
                openStep === "aspect" ? "ring-2 ring-white" : ""
              }`}
            >
              <span className="truncate">{selectedAspect || "Seleccionar"}</span>
              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                {selectedAspect && (
                  <span
                    onClick={clearAspect}
                    className="p-0.5 rounded-full hover:bg-neutral-200 text-neutral-400 hover:text-neutral-900"
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
                {openStep === "aspect" ? (
                  <ChevronUp className="h-4 w-4 text-neutral-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-neutral-400" />
                )}
              </div>
            </button>
          </div>

          {/* 3. ARO */}
          <div className="relative">
            <span className="block text-[11px] font-bold uppercase tracking-[1.2px] text-white/90 mb-1.5 ml-2.5">
              ARO
            </span>
            <button
              type="button"
              onClick={() => {
                setTrayFilterQuery("");
                setOpenStep(openStep === "rim" ? null : "rim");
              }}
              className={`w-full flex items-center justify-between rounded-full bg-white px-5 py-3 text-sm font-semibold text-neutral-900 shadow-md transition hover:bg-neutral-50 ${
                openStep === "rim" ? "ring-2 ring-white" : ""
              }`}
            >
              <span className="truncate">{selectedRim ? `Aro ${selectedRim}` : "Seleccionar"}</span>
              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                {selectedRim && (
                  <span
                    onClick={clearRim}
                    className="p-0.5 rounded-full hover:bg-neutral-200 text-neutral-400 hover:text-neutral-900"
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
                {openStep === "rim" ? (
                  <ChevronUp className="h-4 w-4 text-neutral-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-neutral-400" />
                )}
              </div>
            </button>
          </div>

          {/* 4. BOTÓN BUSCAR */}
          <div>
            <button
              type="button"
              onClick={handleManualSearch}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-white py-3 px-6 text-sm font-black uppercase tracking-wider text-neutral-900 shadow-lg hover:bg-neutral-100 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <Search className="h-4 w-4 text-neutral-700" />
              BUSCAR
            </button>
          </div>
        </div>

        {/* ────────────────── INFOGRAFÍA DINÁMICA IDÉNTICA A XBRI CON RELOJ AUTOMÁTICO ────────────────── */}
        <div className="mt-12 pt-6 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-white/10 relative">
          {/* Ilustración de neumático idéntica a XBRI */}
          <div className="flex items-center gap-4 w-full md:w-auto relative">
            <svg viewBox="0 0 340 180" className="w-72 sm:w-84 md:w-96 h-auto shrink-0 select-none overflow-visible" fill="none">
              <defs>
                {/* Arco exacto que recorre el flanco del neumático */}
                <path id="tireTextArc" d="M 50 170 A 135 135 0 0 1 290 170" fill="none" />
              </defs>

              {/* Banda de rodamiento externa con ranuras */}
              <path
                d="M 15 170 A 170 170 0 0 1 325 170"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.9"
              />
              <path
                d="M 28 170 A 155 155 0 0 1 312 170"
                stroke="white"
                strokeWidth="2"
                strokeDasharray="4 6"
                opacity="0.5"
              />
              {/* Flanco exterior donde va escrita la medida */}
              <path
                d="M 42 170 A 142 142 0 0 1 298 170"
                stroke="white"
                strokeWidth="2"
                opacity="0.85"
              />

              {/* Texto en el flanco con el resaltado dinámico en ROJO */}
              <text fontSize="14" fontWeight="900" letterSpacing="2">
                <textPath href="#tireTextArc" startOffset="18%">
                  <tspan
                    fill={activeGuideIndex === 0 ? "#E3151A" : "white"}
                    className="transition-colors duration-500 font-black"
                  >
                    175
                  </tspan>
                  <tspan fill="white">/</tspan>
                  <tspan
                    fill={activeGuideIndex === 1 ? "#E3151A" : "white"}
                    className="transition-colors duration-500 font-black"
                  >
                    70
                  </tspan>
                  <tspan fill="white">R</tspan>
                  <tspan
                    fill={activeGuideIndex === 2 ? "#E3151A" : "white"}
                    className="transition-colors duration-500 font-black"
                  >
                    14
                  </tspan>
                  <tspan fill="white" opacity="0.8" fontSize="12" letterSpacing="1">
                    {" "}84T FASTWAY
                  </tspan>
                </textPath>
              </text>

              {/* Borde inferior del flanco */}
              <path
                d="M 62 170 A 120 120 0 0 1 278 170"
                stroke="white"
                strokeWidth="1.5"
                opacity="0.75"
              />
              {/* Aro de la llanta */}
              <path
                d="M 75 170 A 108 108 0 0 1 265 170"
                stroke="white"
                strokeWidth="2.5"
                opacity="0.95"
              />

              {/* Línea horizontal continua blanca que va desde la cubierta hacia el número (idéntica a XBRI) */}
              <line
                x1={currentGuide.targetX}
                y1={currentGuide.lineY}
                x2="380"
                y2={currentGuide.lineY}
                stroke="white"
                strokeWidth="2"
                className="transition-all duration-700 ease-in-out"
              />
            </svg>
          </div>

          {/* Bloque dinámico de la derecha: Título + Número Gigante único (relojito) */}
          <div className="flex flex-col items-center sm:items-end justify-center w-full md:w-auto text-center sm:text-right pr-2 sm:pr-8">
            <span className="text-[11px] font-bold uppercase tracking-[1.4px] text-white/70 block mb-2">
              COMO CONOCER LA MEDIDA DE SUS CUBIERTAS
            </span>

            {/* Número que va cambiando automáticamente con animación */}
            <div
              key={activeGuideIndex}
              className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col items-center sm:items-end"
            >
              <div className="text-6xl sm:text-7xl md:text-8xl font-black text-white tracking-tight leading-none">
                {currentGuide.val}
              </div>
              <div className="text-xs sm:text-sm font-black uppercase tracking-[2px] text-white/80 mt-2">
                {currentGuide.label}
              </div>
            </div>

            {/* Indicadores de bolitas/steps debajo del número */}
            <div className="flex items-center gap-2 mt-4">
              {[0, 1, 2].map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveGuideIndex(idx)}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    activeGuideIndex === idx ? "w-8 bg-[#E3151A]" : "w-2 bg-white/30 hover:bg-white/60"
                  }`}
                  aria-label={`Paso ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ────────────────── BANDEJA FLOTANTE INFERIOR ESTILO XBRI ────────────────── */}
        {openStep && (
          <div className="mt-6 rounded-2xl bg-white p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-neutral-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Input de filtro predictivo dentro de la bandeja */}
            <div className="relative mb-4">
              <input
                type="text"
                autoFocus
                placeholder={
                  openStep === "width"
                    ? "Buscar Ancho (ej. 215, 265, 175)..."
                    : openStep === "aspect"
                    ? "Buscar Altura (ej. 65, 70, 55)..."
                    : "Buscar Aro (ej. 16, 17, 18)..."
                }
                value={trayFilterQuery}
                onChange={(e) => setTrayFilterQuery(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50/80 px-4 py-2.5 text-xs font-semibold text-neutral-800 placeholder-neutral-400 focus:border-[#E3151A] focus:bg-white focus:outline-none transition"
              />
              <Search className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            </div>

            {/* OPCIONES DE ANCHO */}
            {openStep === "width" && (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">
                    PASAJERO / SUV / PICKUP
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {passengerWidths
                      .filter((w) => !trayFilterQuery || w.includes(trayFilterQuery))
                      .map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => handleSelectWidth(w)}
                          className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                            selectedWidth === w
                              ? "bg-neutral-900 text-white"
                              : "bg-neutral-100 text-neutral-800 hover:bg-[#E3151A] hover:text-white"
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                  </div>
                </div>

                {commercialWidths.length > 0 && (
                  <div className="pt-2 border-t border-neutral-100">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">
                      CAMIONES / PESADOS / AGRÍCOLAS
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {commercialWidths
                        .filter((w) => !trayFilterQuery || w.includes(trayFilterQuery))
                        .map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => handleSelectWidth(w)}
                            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                              selectedWidth === w
                                ? "bg-neutral-900 text-white"
                                : "bg-neutral-100 text-neutral-800 hover:bg-[#E3151A] hover:text-white"
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* OPCIONES DE ALTURA */}
            {openStep === "aspect" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    {selectedWidth ? `ALTURAS DISPONIBLES PARA ANCHO ${selectedWidth}` : "TODAS LAS ALTURAS"}
                  </h4>
                  {selectedWidth && (
                    <button
                      type="button"
                      onClick={() => setOpenStep("width")}
                      className="text-[11px] font-bold text-[#E3151A] hover:underline"
                    >
                      ← Cambiar ancho
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 max-h-[240px] overflow-y-auto pr-1">
                  {availableAspects
                    .filter((h) => !trayFilterQuery || h.includes(trayFilterQuery))
                    .map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => handleSelectAspect(h)}
                        className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                          selectedAspect === h
                            ? "bg-neutral-900 text-white"
                            : "bg-neutral-100 text-neutral-800 hover:bg-[#E3151A] hover:text-white"
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  {availableAspects.length === 0 && (
                    <p className="text-xs text-neutral-500 py-3">No hay perfiles específicos para este ancho.</p>
                  )}
                </div>
              </div>
            )}

            {/* OPCIONES DE ARO */}
            {openStep === "rim" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    {selectedWidth && selectedAspect
                      ? `AROS DISPONIBLES PARA ${selectedWidth}/${selectedAspect}`
                      : "AROS DISPONIBLES"}
                  </h4>
                  <div className="flex items-center gap-2">
                    {selectedAspect && (
                      <button
                        type="button"
                        onClick={() => setOpenStep("aspect")}
                        className="text-[11px] font-bold text-[#E3151A] hover:underline"
                      >
                        ← Cambiar altura
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 max-h-[240px] overflow-y-auto pr-1">
                  {availableRims
                    .filter((r) => !trayFilterQuery || r.includes(trayFilterQuery))
                    .map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleSelectRim(r)}
                        className={`rounded-lg px-4 py-2 text-xs font-black transition ${
                          selectedRim === r
                            ? "bg-neutral-900 text-white"
                            : "bg-neutral-100 text-neutral-800 hover:bg-[#E3151A] hover:text-white"
                        }`}
                      >
                        Aro {r}
                      </button>
                    ))}
                  {availableRims.length === 0 && (
                    <p className="text-xs text-neutral-500 py-3">No se encontraron aros para esta combinación.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
