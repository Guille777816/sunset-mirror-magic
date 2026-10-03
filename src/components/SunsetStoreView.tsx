import React, { useState, useMemo, useEffect } from "react";
import { Search, RotateCcw, Trash2, Filter, ChevronDown, SlidersHorizontal } from "lucide-react";
import { SunsetProductCard } from "./SunsetProductCard";
import { useCurrency } from "@/lib/currency";

interface Product {
  id: string;
  slug: string;
  brand: string;
  model: string;
  size: string;
  category: string;
  categories?: string[];
  price_ars: number;
  stock?: number;
  image_url?: string | null;
  is_featured?: boolean;
  free_shipping?: boolean;
}

interface SunsetStoreViewProps {
  products: Product[];
  selectedCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
  selectedMeasure?: { width?: string; aspect?: string; rim?: string } | null;
  onClearMeasure?: () => void;
  onBackToHome?: () => void;
}

const CATEGORY_NAMES: Record<string, string> = {
  autos: "Autos",
  camionetas: "Camionetas",
  suv: "SUV",
  camiones: "Camiones",
  agricolas: "Agrícolas",
  industriales: "Industriales",
};

export function SunsetStoreView({
  products,
  selectedCategory,
  onSelectCategory,
  selectedMeasure,
  onClearMeasure,
  onBackToHome,
}: SunsetStoreViewProps) {
  const { format } = useCurrency();

  // Filter states
  const [filterWidth, setFilterWidth] = useState(selectedMeasure?.width || "");
  const [filterAspect, setFilterAspect] = useState(selectedMeasure?.aspect || "");
  const [filterRim, setFilterRim] = useState(selectedMeasure?.rim || "");
  const [filterBrand, setFilterBrand] = useState<string>("");
  const [brandSearchText, setBrandSearchText] = useState<string>("");
  const [textSearch, setTextSearch] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<number>(0);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Sync when selectedMeasure prop changes
  useEffect(() => {
    if (selectedMeasure) {
      if (selectedMeasure.width !== undefined) setFilterWidth(selectedMeasure.width);
      if (selectedMeasure.aspect !== undefined) setFilterAspect(selectedMeasure.aspect);
      if (selectedMeasure.rim !== undefined) setFilterRim(selectedMeasure.rim);
    }
  }, [selectedMeasure]);

  // Extract unique widths, aspects, rims, and brands from products
  const { availableWidths, availableAspects, availableRims, availableBrands, minCatalogPrice, maxCatalogPrice } = useMemo(() => {
    const widths = new Set<string>();
    const aspects = new Set<string>();
    const rims = new Set<string>();
    const brands = new Set<string>();
    let minP = Infinity;
    let maxP = 0;

    products.forEach((p) => {
      const price = Number(p.price_ars) || 0;
      if (price > 0 && price < minP) minP = price;
      if (price > maxP) maxP = price;

      if (p.brand) brands.add(p.brand.trim());

      const s = (p.size || "").trim();
      // Match 185/70R13, 265/70 R16, 295/80R22.5
      const m = s.match(/([0-9]{3})\s*(?:\/|\s*-\s*)([0-9]{2})\s*R\s*([0-9]{2}(?:\.[0-9])?)/i);
      if (m) {
        widths.add(m[1]);
        aspects.add(m[2]);
        rims.add(m[3]);
      }
    });

    return {
      availableWidths: Array.from(widths).sort((a, b) => parseInt(a) - parseInt(b)),
      availableAspects: Array.from(aspects).sort((a, b) => parseInt(a) - parseInt(b)),
      availableRims: Array.from(rims).sort((a, b) => parseFloat(a) - parseFloat(b)),
      availableBrands: Array.from(brands).sort(),
      minCatalogPrice: minP === Infinity ? 0 : minP,
      maxCatalogPrice: maxP === 0 ? 500000 : maxP,
    };
  }, [products]);

  // Count products by category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { total: products.length };
    products.forEach((p) => {
      const cat = (p.category || "").toLowerCase();
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Filtered products logic
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Category
      if (selectedCategory && selectedCategory !== "todas") {
        const cat = (p.category || "").toLowerCase();
        const cats = Array.isArray(p.categories) ? p.categories.map((c) => c.toLowerCase()) : [];
        if (cat !== selectedCategory && !cats.includes(selectedCategory)) {
          return false;
        }
      }

      // 2. Measure filters
      const sizeStr = (p.size || "").toLowerCase();
      if (filterWidth && !sizeStr.includes(filterWidth.toLowerCase())) return false;
      if (filterAspect && !sizeStr.includes(filterAspect.toLowerCase())) return false;
      if (filterRim) {
        const rimNorm = filterRim.replace(/^r/i, "");
        if (!sizeStr.includes(`r${rimNorm}`) && !sizeStr.includes(`r ${rimNorm}`) && !sizeStr.includes(rimNorm)) {
          return false;
        }
      }

      // 3. Brand
      if (filterBrand && p.brand.toLowerCase() !== filterBrand.toLowerCase()) {
        return false;
      }

      // 4. Text search
      if (textSearch.trim()) {
        const q = textSearch.toLowerCase();
        const hay = `${p.brand} ${p.model} ${p.size} ${p.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      // 5. Max price
      if (maxPrice > 0 && Number(p.price_ars) > maxPrice) {
        return false;
      }

      return true;
    });
  }, [products, selectedCategory, filterWidth, filterAspect, filterRim, filterBrand, textSearch, maxPrice]);

  const hasActiveFilters = Boolean(
    selectedCategory || filterWidth || filterAspect || filterRim || filterBrand || textSearch || maxPrice > 0
  );

  const clearAllFilters = () => {
    setFilterWidth("");
    setFilterAspect("");
    setFilterRim("");
    setFilterBrand("");
    setTextSearch("");
    setMaxPrice(0);
    onSelectCategory(null);
    if (onClearMeasure) onClearMeasure();
  };

  const clearMeasureOnly = () => {
    setFilterWidth("");
    setFilterAspect("");
    setFilterRim("");
    if (onClearMeasure) onClearMeasure();
  };

  // Header Title
  const pageTitle = useMemo(() => {
    if (filterWidth && filterAspect && filterRim) {
      return `Cubiertas medida ${filterWidth}/${filterAspect}R${filterRim}`;
    }
    if (filterRim) {
      return `Cubiertas Aro ${filterRim}`;
    }
    if (selectedCategory && CATEGORY_NAMES[selectedCategory]) {
      return `Cubiertas para ${CATEGORY_NAMES[selectedCategory]} en Argentina`;
    }
    if (filterBrand) {
      return `Neumáticos ${filterBrand} en Argentina`;
    }
    return "Cubiertas en Argentina";
  }, [filterWidth, filterAspect, filterRim, selectedCategory, filterBrand]);

  return (
    <div id="tienda-catalogo" className="w-full bg-[#f8f9fa] py-8 sm:py-12 border-t border-neutral-200">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Cabecera estilo Sunset / XBRI */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <nav className="text-xs text-neutral-400 flex items-center gap-1.5 font-medium">
              <button onClick={onBackToHome} className="hover:text-neutral-700 transition">
                Inicio
              </button>
              <span>›</span>
              <span className="text-neutral-700">Cubiertas en Argentina</span>
              {selectedCategory && (
                <>
                  <span>›</span>
                  <span className="text-neutral-900 font-semibold capitalize">
                    {CATEGORY_NAMES[selectedCategory] || selectedCategory}
                  </span>
                </>
              )}
            </nav>
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="text-xs font-bold text-neutral-600 hover:text-neutral-900 transition flex items-center gap-1"
              >
                ← Volver a la portada
              </button>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-neutral-900">
            {pageTitle}
          </h1>
          <p className="mt-2 text-sm text-neutral-500 max-w-3xl leading-relaxed">
            {filterWidth && filterAspect && filterRim
              ? `Tenemos ${filteredProducts.length} cubierta${filteredProducts.length !== 1 ? "s" : ""} disponible${filteredProducts.length !== 1 ? "s" : ""} en la medida ${filterWidth}/${filterAspect}R${filterRim}. Desde ${filteredProducts.length > 0 ? format(Number(filteredProducts[0].price_ars)) : ""} con IVA incluido. Envío y despacho a toda la Argentina.`
              : `En Le Radial somos especialistas en cubiertas y neumáticos para auto, camioneta, camión y maquinaria en Argentina. Entrega inmediata y despacho a todo el país.`}
          </p>
        </div>

        {/* Botón filtros en móvil */}
        <div className="mb-6 flex md:hidden items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white border border-neutral-300 py-3 text-sm font-bold text-neutral-800 shadow-sm"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {showMobileFilters ? "Ocultar filtros" : "Filtros y Medidas"}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Layout en 2 Columnas */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* ────────────────── COLUMNA IZQUIERDA: SIDEBAR DE FILTROS ────────────────── */}
          <aside className={`md:col-span-4 lg:col-span-3 space-y-6 ${showMobileFilters ? "block" : "hidden md:block"}`}>
            {/* 1. Medidas (Ancho / Perfil / Aro) */}
            <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="text-sm font-black uppercase tracking-wide text-neutral-900">
                  Buscá tu cubierta por medida
                </h3>
              </div>

              {/* Ancho */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5 block">
                  Ancho
                </label>
                <div className="relative">
                  <select
                    value={filterWidth}
                    onChange={(e) => setFilterWidth(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-neutral-200 bg-neutral-50/50 py-2.5 px-3.5 text-xs font-semibold text-neutral-800 focus:border-neutral-900 focus:bg-white focus:outline-none transition"
                  >
                    <option value="">Todos los anchos</option>
                    {availableWidths.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                </div>
              </div>

              {/* Perfil */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5 block">
                  Perfil
                </label>
                <div className="relative">
                  <select
                    value={filterAspect}
                    onChange={(e) => setFilterAspect(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-neutral-200 bg-neutral-50/50 py-2.5 px-3.5 text-xs font-semibold text-neutral-800 focus:border-neutral-900 focus:bg-white focus:outline-none transition"
                  >
                    <option value="">Todos los perfiles</option>
                    {availableAspects.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                </div>
              </div>

              {/* Aro */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5 block">
                  Aro
                </label>
                <div className="relative">
                  <select
                    value={filterRim}
                    onChange={(e) => setFilterRim(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-neutral-200 bg-neutral-50/50 py-2.5 px-3.5 text-xs font-semibold text-neutral-800 focus:border-neutral-900 focus:bg-white focus:outline-none transition"
                  >
                    <option value="">Todos los aros</option>
                    {availableRims.map((r) => (
                      <option key={r} value={r}>
                        Aro {r}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                </div>
              </div>

              {(filterWidth || filterAspect || filterRim) && (
                <button
                  type="button"
                  onClick={clearMeasureOnly}
                  className="mt-2 text-xs font-bold uppercase tracking-wider text-[#E3151A] hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> Limpiar medida
                </button>
              )}
            </div>

            {/* 2. Categorías */}
            <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wide text-neutral-900 border-b border-neutral-100 pb-3">
                Categorías
              </h3>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => onSelectCategory(null)}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${
                    !selectedCategory
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  <span>Todas</span>
                  <span className="text-[11px] opacity-70">({categoryCounts.total || 0})</span>
                </button>
                {Object.entries(CATEGORY_NAMES).map(([slug, name]) => {
                  const isSelected = selectedCategory === slug;
                  const count = categoryCounts[slug] || 0;
                  return (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => onSelectCategory(isSelected ? null : slug)}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${
                        isSelected
                          ? "bg-neutral-900 text-white"
                          : "text-neutral-600 hover:bg-neutral-100"
                      }`}
                    >
                      <span>{name}</span>
                      <span className="text-[11px] opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Marcas */}
            {availableBrands.length > 0 && (
              <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <h3 className="text-sm font-black uppercase tracking-wide text-neutral-900">
                    Marca
                  </h3>
                  {filterBrand && (
                    <button
                      type="button"
                      onClick={() => setFilterBrand("")}
                      className="text-[11px] font-bold text-red-600 hover:underline"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {availableBrands.length > 8 && (
                  <input
                    type="text"
                    placeholder="Filtrar marcas..."
                    value={brandSearchText}
                    onChange={(e) => setBrandSearchText(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 px-2.5 py-1 text-xs focus:border-neutral-900 focus:outline-none"
                  />
                )}

                <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => setFilterBrand("")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase transition ${
                      !filterBrand ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    Todas
                  </button>
                  {availableBrands
                    .filter((b) => !brandSearchText || b.toLowerCase().includes(brandSearchText.toLowerCase().trim()))
                    .map((b) => {
                      const isSelected = filterBrand.toLowerCase() === b.toLowerCase();
                      return (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setFilterBrand(isSelected ? "" : b)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase transition ${
                            isSelected ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                          }`}
                        >
                          {b}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </aside>

          {/* ────────────────── COLUMNA DERECHA: RESULTADOS Y LISTADO ────────────────── */}
          <main className="md:col-span-8 lg:col-span-9 space-y-4">
            {/* Barra superior de resultados y filtro activo */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200/80 bg-white px-5 py-3.5 shadow-sm">
              <span className="text-xs sm:text-sm font-semibold text-neutral-600">
                Mostrando 1-{filteredProducts.length} de {filteredProducts.length} resultados
              </span>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3.5 py-1.5 text-xs font-bold text-neutral-700 transition hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Limpiar filtros
                </button>
              )}
            </div>

            {/* Listado de Tarjetas estilo Sunset */}
            {filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center shadow-sm space-y-4">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-neutral-100 text-neutral-400">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900">
                  No se encontraron neumáticos con los filtros seleccionados
                </h3>
                <p className="text-sm text-neutral-500 max-w-md mx-auto">
                  Probá limpiar o cambiar la medida, categoría o marca para ver más resultados.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="rounded-full bg-neutral-900 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-neutral-800"
                  >
                    Ver todo el catálogo
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProducts.map((p, idx) => (
                  <SunsetProductCard key={p.id} product={p} eager={idx < 3} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
