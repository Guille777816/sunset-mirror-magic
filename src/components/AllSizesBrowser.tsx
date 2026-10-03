import React, { useMemo } from "react";

interface AllSizesBrowserProps {
  products: Array<{ size?: string | null }>;
  onSelectSize: (size: string) => void;
  selectedSize?: string | null;
}

// Common standard Mercosur tire sizes to complement database inventory
const STANDARD_SIZES: Record<string, string[]> = {
  "12": ["145/70 R12", "155/70 R12"],
  "13": ["165/65 R13", "165/70 R13", "165/80 R13", "175/70 R13", "175/75 R13", "185/70 R13"],
  "14": [
    "165/60 R14", "165/65 R14", "165/70 R14", "175/65 R14", "175/70 R14", "175/75 R14",
    "175/80 R14", "185 R14", "185/60 R14", "185/65 R14", "185/70 R14", "195 R14",
    "195/65 R14", "195/70 R14", "205/60 R14", "205/70 R14", "215/70 R14"
  ],
  "15": [
    "185/55 R15", "185/60 R15", "185/65 R15", "195/50 R15", "195/55 R15", "195/60 R15",
    "195/65 R15", "205/60 R15", "205/65 R15", "205/70 R15", "215/75 R15", "235/75 R15", "31X10.50 R15"
  ],
  "16": [
    "205/55 R16", "205/60 R16", "215/65 R16", "215/70 R16", "225/70 R16", "235/60 R16",
    "245/70 R16", "265/70 R16", "265/75 R16"
  ],
  "17": [
    "205/40 R17", "215/50 R17", "215/55 R17", "225/45 R17", "225/50 R17", "225/65 R17",
    "235/65 R17", "265/65 R17", "265/70 R17"
  ],
  "18": [
    "225/40 R18", "225/45 R18", "235/50 R18", "235/60 R18", "255/55 R18", "265/60 R18"
  ],
  "19": [
    "235/35 R19", "235/55 R19", "255/50 R19", "255/55 R19"
  ],
  "20": [
    "245/45 R20", "255/50 R20", "275/40 R20", "275/55 R20", "285/50 R20"
  ],
  "22.5": [
    "275/80 R22.5", "295/80 R22.5", "385/65 R22.5"
  ]
};

export function AllSizesBrowser({ products, onSelectSize, selectedSize }: AllSizesBrowserProps) {
  // Extract all sizes from products and merge with standard sizes
  const sizesByRim = useMemo(() => {
    const map = new Map<string, Set<string>>();

    // 1. Add standard sizes
    Object.entries(STANDARD_SIZES).forEach(([rim, sizes]) => {
      if (!map.has(rim)) map.set(rim, new Set<string>());
      sizes.forEach((s) => map.get(rim)!.add(s));
    });

    // 2. Add any size present in products
    (products || []).forEach((p) => {
      const s = (p.size || "").trim();
      if (!s) return;
      // Extract rim like R16, R17.5, R22.5
      const rimMatch = s.match(/R\s*([0-9]+(?:\.[0-9]+)?)/i);
      const rim = rimMatch ? rimMatch[1] : "Otras";
      if (!map.has(rim)) map.set(rim, new Set<string>());
      map.get(rim)!.add(s.replace(/([0-9]+)\/([0-9]+)R([0-9]+(?:\.[0-9]+)?)/i, "$1/$2 R$3"));
    });

    // Sort rims numerically
    const sortedRims = Array.from(map.keys()).sort((a, b) => {
      const numA = parseFloat(a) || 999;
      const numB = parseFloat(b) || 999;
      return numA - numB;
    });

    return sortedRims.map((rim) => ({
      rim,
      sizes: Array.from(map.get(rim)!).sort((a, b) => a.localeCompare(b)),
    }));
  }, [products]);

  const totalSizesCount = useMemo(() => {
    return sizesByRim.reduce((acc, curr) => acc + curr.sizes.length, 0);
  }, [sizesByRim]);

  return (
    <section id="todas-las-medidas" className="w-full bg-neutral-50/70 py-16 text-neutral-900 border-t border-neutral-200/70">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-10">
          <nav className="text-xs text-neutral-400 mb-2 flex items-center gap-1.5 font-medium">
            <span>Inicio</span>
            <span>›</span>
            <span>Neumáticos</span>
            <span>›</span>
            <span className="text-neutral-700">Todas las medidas</span>
          </nav>
          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-neutral-900">
            Todas las medidas
          </h2>
          <p className="mt-2 text-sm text-neutral-500 max-w-2xl">
            Tenemos más de {totalSizesCount} medidas disponibles. Elegí la tuya para ver las cubiertas de esa medida con entrega inmediata.
          </p>
        </div>

        {/* Grupos por Aro */}
        <div className="space-y-10">
          {sizesByRim.map(({ rim, sizes }) => (
            <div key={rim} className="space-y-4">
              <h3 className="text-lg font-black uppercase tracking-tight text-neutral-900 flex items-center gap-2">
                <span>Aro {rim}</span>
                <span className="text-xs font-semibold text-neutral-400">({sizes.length})</span>
              </h3>

              <div className="flex flex-wrap gap-2.5">
                {sizes.map((size) => {
                  const isSelected = selectedSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => onSelectSize(size)}
                      className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm ${
                        isSelected
                          ? "bg-neutral-900 text-white shadow-md scale-105"
                          : "bg-white text-neutral-700 border border-neutral-200 hover:border-neutral-900 hover:bg-neutral-900 hover:text-white hover:scale-[1.03]"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
