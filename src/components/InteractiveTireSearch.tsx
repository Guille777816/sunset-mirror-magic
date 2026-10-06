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

  // Close dropdown if clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenStep(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Parse all product sizes
  const parsedTires = useMemo(() => {
    const list: Array<{ w: string; h: string; r: string; isCommercial: boolean }> = [];
    products.forEach((p) => {
      const s = (p.size || "").trim();
      if (!s) return;

      // 1. Standard: 215/65R16, 215/65 R16, 215/65-16, 295/80R22.5
      const m1 = s.match(/([0-9]{3})\s*(?:\/|-)\s*([0-9]{2}(?:\.[0-9])?)\s*(?:R|Z?R|-)?\s*([0-9]{2}(?:\.[0-9])?)/i);
      if (m1) {
        const wNum = parseInt(m1[1]);
        const rNum = parseFloat(m1[3]);
        const isCommercial = wNum >= 285 || rNum >= 19.5;
        list.push({ w: m1[1], h: m1[2], r: m1[3], isCommercial });
        return;
      }

      // 2. Flotation: 31X10.50R15
      const m2 = s.match(/([0-9]{2}(?:\.[0-9]{2})?)\s*(?:X|\/)\s*([0-9]{1,2}\.[0-9]{2})\s*(?:R|-)?\s*([0-9]{2})/i);
      if (m2) {
        list.push({ w: m2[1], h: m2[2], r: m2[3], isCommercial: false });
        return;
      }

      // 3. Direct truck/agro: 11R22.5, 7.50R16
      const m3 = s.match(/([0-9]{1,2}(?:\.[0-9]{2})?)\s*R\s*([0-9]{2}(?:\.[0-9])?)/i);
      if (m3) {
        list.push({ w: m3[1], h: "STD", r: m3[2], isCommercial: true });
        return;
      }
    });
    return list;
  }, [products]);

  // Widths available
  const { passengerWidths, commercialWidths } = useMemo(() => {
    const pass = new Set<string>();
    const comm = new Set<string>();

    parsedTires.forEach((t) => {
      if (t.isCommercial) {
        comm.add(t.w);
      } else {
        pass.add(t.w);
      }
    });

    const sortFn = (a: string, b: string) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      return numA - numB;
    };

    return {
      passengerWidths: Array.from(pass).sort(sortFn),
      commercialWidths: Array.from(comm).sort(sortFn),
    };
  }, [parsedTires]);

  // Aspects available (filtered by selectedWidth if any)
  const availableAspects = useMemo(() => {
    const aspects = new Set<string>();
    parsedTires.forEach((t) => {
      if (!selectedWidth || t.w === selectedWidth) {
        if (t.h !== "STD") aspects.add(t.h);
      }
    });
    return Array.from(aspects).sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [parsedTires, selectedWidth]);

  // Rims available (filtered by selectedWidth and selectedAspect)
  const availableRims = useMemo(() => {
    const rims = new Set<string>();
    parsedTires.forEach((t) => {
      const matchW = !selectedWidth || t.w === selectedWidth;
      const matchH = !selectedAspect || t.h === selectedAspect;
      if (matchW && matchH) {
        rims.add(t.r);
      }
    });
    return Array.from(rims).sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [parsedTires, selectedWidth, selectedAspect]);

  // Handle select width
  const handleSelectWidth = (w: string) => {
    setSelectedWidth(w);
    setSelectedAspect("");
    setSelectedRim("");
    setTrayFilterQuery("");

    // Auto-advance to aspect
    setTimeout(() => {
      setOpenStep("aspect");
    }, 120);
  };

  // Handle select aspect
  const handleSelectAspect = (h: string) => {
    setSelectedAspect(h);
    setSelectedRim("");
    setTrayFilterQuery("");

    // Auto-advance to rim
    setTimeout(() => {
      setOpenStep("rim");
    }, 120);
  };

  // Handle select rim -> Trigger auto-search!
  const handleSelectRim = (r: string) => {
    setSelectedRim(r);
    setOpenStep(null);
    setTrayFilterQuery("");

    // Automatically execute search and take user to catalog
    onSearch({
      width: selectedWidth || undefined,
      aspect: selectedAspect || undefined,
      rim: r || undefined,
    });
  };

  // Clear single steps
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

  // Manual search trigger
  const handleManualSearch = () => {
    setOpenStep(null);
    onSearch({
      width: selectedWidth || undefined,
      aspect: selectedAspect || undefined,
      rim: selectedRim || undefined,
    });
  };

  return (
    <div ref={containerRef} className={`relative w-full max-w-4xl mx-auto z-30 ${className}`}>
      {/* Marco principal Glassmorphism estilo XBRI */}
      <div className="rounded-[28px] border border-white/25 bg-black/40 backdrop-blur-md p-6 sm:p-9 shadow-2xl transition-all">
        <h2 className="mb-7 text-center text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-wider text-white drop-shadow-lg">
          BUSCAR EL NEUMÁTICO IDEAL
        </h2>

        {/* Barra de 3 selectores + Botón Buscar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 items-end">
          {/* 1. ANCHO */}
          <div className="relative">
            <span className="block text-[11px] font-black uppercase tracking-wider text-neutral-300 mb-1.5 ml-2">
              ANCHO
            </span>
            <button
              type="button"
              onClick={() => {
                setTrayFilterQuery("");
                setOpenStep(openStep === "width" ? null : "width");
              }}
              className={`w-full flex items-center justify-between rounded-full bg-white px-5 py-3 text-sm font-bold text-neutral-900 shadow-md transition hover:bg-neutral-50 ${
                openStep === "width" ? "ring-2 ring-[#E3151A]" : ""
              }`}
            >
              <span className="truncate">{selectedWidth || "Seleccionar"}</span>
              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                {selectedWidth && (
                  <span
                    onClick={clearWidth}
                    className="p-0.5 rounded-full hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900"
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
                {openStep === "width" ? (
                  <ChevronUp className="h-4 w-4 text-neutral-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-neutral-500" />
                )}
              </div>
            </button>
          </div>

          {/* 2. ALTURA / PERFIL */}
          <div className="relative">
            <span className="block text-[11px] font-black uppercase tracking-wider text-neutral-300 mb-1.5 ml-2">
              ALTURA
            </span>
            <button
              type="button"
              onClick={() => {
                setTrayFilterQuery("");
                setOpenStep(openStep === "aspect" ? null : "aspect");
              }}
              className={`w-full flex items-center justify-between rounded-full bg-white px-5 py-3 text-sm font-bold text-neutral-900 shadow-md transition hover:bg-neutral-50 ${
                openStep === "aspect" ? "ring-2 ring-[#E3151A]" : ""
              }`}
            >
              <span className="truncate">{selectedAspect || "Seleccionar"}</span>
              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                {selectedAspect && (
                  <span
                    onClick={clearAspect}
                    className="p-0.5 rounded-full hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900"
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
                {openStep === "aspect" ? (
                  <ChevronUp className="h-4 w-4 text-neutral-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-neutral-500" />
                )}
              </div>
            </button>
          </div>

          {/* 3. ARO */}
          <div className="relative">
            <span className="block text-[11px] font-black uppercase tracking-wider text-neutral-300 mb-1.5 ml-2">
              ARO
            </span>
            <button
              type="button"
              onClick={() => {
                setTrayFilterQuery("");
                setOpenStep(openStep === "rim" ? null : "rim");
              }}
              className={`w-full flex items-center justify-between rounded-full bg-white px-5 py-3 text-sm font-bold text-neutral-900 shadow-md transition hover:bg-neutral-50 ${
                openStep === "rim" ? "ring-2 ring-[#E3151A]" : ""
              }`}
            >
              <span className="truncate">{selectedRim ? `Aro ${selectedRim}` : "Seleccionar"}</span>
              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                {selectedRim && (
                  <span
                    onClick={clearRim}
                    className="p-0.5 rounded-full hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900"
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
                {openStep === "rim" ? (
                  <ChevronUp className="h-4 w-4 text-neutral-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-neutral-500" />
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
              <Search className="h-4 w-4" />
              BUSCAR
            </button>
          </div>
        </div>

        {/* ────────────────── INFOGRAFÍA GUÍA: CÓMO CONOCER LA MEDIDA ────────────────── */}
        <div className="mt-8 pt-6 border-t border-white/15 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Neumático gráfico minimalista */}
          <div className="flex items-center gap-4">
            <div className="relative w-28 h-16 overflow-hidden flex items-end">
              <div className="w-28 h-28 rounded-full border-4 border-dashed border-white/40 border-t-white flex items-center justify-center text-[10px] font-black text-white/90">
                175/70R14
              </div>
            </div>
            <div className="text-left">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block">
                GUÍA RÁPIDA
              </span>
              <span className="text-xs sm:text-sm font-bold text-white/90">
                CÓMO CONOCER LA MEDIDA DE SUS CUBIERTAS
              </span>
            </div>
          </div>

          {/* Indicadores numéricos 175 - 70 - 14 */}
          <div className="flex items-center gap-6 sm:gap-10">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">175</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">ANCHO</div>
            </div>
            <div className="text-2xl font-light text-white/30">/</div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">70</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">ALTO</div>
            </div>
            <div className="text-2xl font-light text-white/30">R</div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">14</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">ARO</div>
            </div>
          </div>
        </div>

        {/* ────────────────── BANDEJA FLOTANTE INFERIOR ESTILO XBRI ────────────────── */}
        {openStep && (
          <div className="mt-5 rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-neutral-100 animate-in fade-in zoom-in-95 duration-150">
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
                {/* Pasajero / SUV / Pickup */}
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

                {/* Camiones / Agrícolas */}
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
