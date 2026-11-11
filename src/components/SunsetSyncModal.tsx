import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, Check, X, AlertTriangle, ArrowUpRight, ArrowDownRight, DownloadCloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchSunsetCatalog } from "@/lib/sunset-sync.functions";
import {
  matchXbriProductsToSunset,
  type LocalProductLike,
  type MatchedSunsetRow,
  type SunsetSyncConfig,
  type SunsetSyncItem,
} from "@/lib/sunset-sync.helpers";

const CONFIG_STORAGE_KEY = "lr_sunset_sync_config_v1";

const DEFAULT_CONFIG: SunsetSyncConfig = {
  rateUsd: 1650,
  addonAutos: 40,
  addonCamionetas: 50,
  addonCamiones: 60,
  grossUpForTransfer15: true,
};

function loadSavedConfig(): SunsetSyncConfig {
  try {
    if (typeof window === "undefined") return DEFAULT_CONFIG;
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      rateUsd: Number(parsed.rateUsd) > 0 ? Number(parsed.rateUsd) : DEFAULT_CONFIG.rateUsd,
      addonAutos: Number(parsed.addonAutos) >= 0 ? Number(parsed.addonAutos) : DEFAULT_CONFIG.addonAutos,
      addonCamionetas:
        Number(parsed.addonCamionetas) >= 0 ? Number(parsed.addonCamionetas) : DEFAULT_CONFIG.addonCamionetas,
      addonCamiones: Number(parsed.addonCamiones) >= 0 ? Number(parsed.addonCamiones) : DEFAULT_CONFIG.addonCamiones,
      grossUpForTransfer15:
        typeof parsed.grossUpForTransfer15 === "boolean"
          ? parsed.grossUpForTransfer15
          : DEFAULT_CONFIG.grossUpForTransfer15,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function fmtArs(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return "$ " + Math.round(n).toLocaleString("es-AR");
}

type Props = {
  open: boolean;
  onClose: () => void;
  products: LocalProductLike[];
  onUpdated: () => Promise<void> | void;
};

export function SunsetSyncModal({ open, onClose, products, onUpdated }: Props) {
  const callFetchSunset = useServerFn(fetchSunsetCatalog);
  const [config, setConfig] = useState<SunsetSyncConfig>(loadSavedConfig);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [sunsetItems, setSunsetItems] = useState<SunsetSyncItem[]>([]);
  const [includeSizeOnly, setIncludeSizeOnly] = useState(false);
  const [onlyChanged, setOnlyChanged] = useState(true);
  const [filterMode, setFilterMode] = useState<"updates" | "exact" | "size_only" | "none" | "all">("updates");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [applySummary, setApplySummary] = useState<{ updated: number; errors: number } | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch {}
  }, [config]);

  async function handleFetch() {
    setLoading(true);
    setFetchError(null);
    setApplySummary(null);
    try {
      const res = await callFetchSunset();
      setSunsetItems(res.items || []);
      setFetchedAt(res.fetchedAt || new Date().toISOString());
    } catch (e: any) {
      setFetchError(e?.message || "No se pudo consultar Sunset Paraguay (xbri.com.py)");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && sunsetItems.length === 0 && !loading && !fetchError) {
      void handleFetch();
    }
  }, [open]);

  const matchedRows = useMemo<MatchedSunsetRow[]>(() => {
    if (!sunsetItems.length) return [];
    return matchXbriProductsToSunset(products, sunsetItems, config);
  }, [products, sunsetItems, config]);

  // Auto-select eligible rows whenever matches or match preference changes
  useEffect(() => {
    const next = new Set<string>();
    for (const row of matchedRows) {
      if (!row.product.id || row.newListArs == null) continue;
      const eligibleMatch = row.matchType === "exact" || (includeSizeOnly && row.matchType === "size_only");
      if (!eligibleMatch) continue;
      if (!onlyChanged || Math.abs(row.diffArs) >= 100) {
        next.add(row.product.id);
      }
    }
    setSelectedIds(next);
  }, [matchedRows, includeSizeOnly, onlyChanged]);

  const stats = useMemo(() => {
    let exact = 0;
    let sizeOnly = 0;
    let none = 0;
    let pendingDiff = 0;
    let up = 0;
    let down = 0;
    for (const r of matchedRows) {
      if (r.matchType === "exact") exact++;
      else if (r.matchType === "size_only") sizeOnly++;
      else none++;
      const okMatch = r.matchType === "exact" || (includeSizeOnly && r.matchType === "size_only");
      if (okMatch && Math.abs(r.diffArs) >= 100) {
        pendingDiff++;
        if (r.diffArs > 0) up++;
        else if (r.diffArs < 0) down++;
      }
    }
    return { totalXbri: matchedRows.length, exact, sizeOnly, none, pendingDiff, up, down };
  }, [matchedRows, includeSizeOnly]);

  const visibleRows = useMemo(() => {
    return matchedRows.filter((r) => {
      if (filterMode === "exact") return r.matchType === "exact";
      if (filterMode === "size_only") return r.matchType === "size_only";
      if (filterMode === "none") return r.matchType === "none";
      if (filterMode === "updates") {
        const okMatch = r.matchType === "exact" || (includeSizeOnly && r.matchType === "size_only");
        return okMatch && Math.abs(r.diffArs) >= 100;
      }
      return true;
    });
  }, [matchedRows, filterMode, includeSizeOnly]);

  async function handleApplySelected() {
    const targets = matchedRows.filter(
      (r) => r.product.id && selectedIds.has(r.product.id) && r.newListArs != null && r.newListArs > 0,
    );
    if (!targets.length) return;

    const ok = window.confirm(
      `¿Actualizar ${targets.length} cubiertas XBRI en la web con dólar a $${config.rateUsd.toLocaleString("es-AR")}?\n\n` +
        `• Autos: +${config.addonAutos} USD\n` +
        `• Camionetas/SUV: +${config.addonCamionetas} USD\n` +
        `• Camiones/Agro: +${config.addonCamiones} USD\n` +
        `• ${
          config.grossUpForTransfer15
            ? "Guarda Precio de Lista (Neto ÷ 0,85) para que Transferencia 15% OFF dé exacto"
            : "Guarda Neto directo como precio base"
        }`,
    );
    if (!ok) return;

    setApplying(true);
    setProgress({ current: 0, total: targets.length });
    setApplySummary(null);

    const nowIso = new Date().toISOString();
    const BATCH_SIZE = 15;
    let done = 0;
    let errors = 0;

    try {
      for (let i = 0; i < targets.length; i += BATCH_SIZE) {
        const slice = targets.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          slice.map(async (row) => {
            const { error } = await supabase
              .from("products")
              .update({ price_ars: row.newListArs!, updated_at: nowIso })
              .eq("id", row.product.id!);
            return error;
          }),
        );
        for (const err of results) {
          if (err) errors++;
        }
        done += slice.length;
        setProgress({ current: done, total: targets.length });
      }

      await onUpdated();
      setApplySummary({ updated: targets.length - errors, errors });
    } finally {
      setApplying(false);
      setProgress(null);
    }
  }

  if (!open) return null;

  const exampleNeto = Math.round((102.5 + config.addonCamionetas) * config.rateUsd);
  const exampleLista = config.grossUpForTransfer15 ? Math.round(exampleNeto / 0.85) : exampleNeto;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl border">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4 bg-muted/40">
          <div>
            <h2 className="text-lg font-black text-secondary flex items-center gap-2">
              <DownloadCloud className="h-5 w-5 text-emerald-600" />
              Sincronizar XBRI con Sunset Paraguay (xbri.com.py)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Lee los precios en USD en vivo desde Paraguay, aplica tu recargo + cambio y actualiza la tienda web.
              {fetchedAt && ` Última lectura: ${new Date(fetchedAt).toLocaleTimeString("es-AR")}.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-secondary cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="border-b bg-card px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">
                Dólar Paraguay ($)
              </label>
              <input
                type="number"
                value={config.rateUsd}
                onChange={(e) => setConfig((c) => ({ ...c, rateUsd: Math.max(1, Number(e.target.value) || 0) }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">
                Autos (+USD)
              </label>
              <input
                type="number"
                value={config.addonAutos}
                onChange={(e) => setConfig((c) => ({ ...c, addonAutos: Math.max(0, Number(e.target.value) || 0) }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">
                Camionetas (+USD)
              </label>
              <input
                type="number"
                value={config.addonCamionetas}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, addonCamionetas: Math.max(0, Number(e.target.value) || 0) }))
                }
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">
                Camiones (+USD)
              </label>
              <input
                type="number"
                value={config.addonCamiones}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, addonCamiones: Math.max(0, Number(e.target.value) || 0) }))
                }
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-bold"
              />
            </div>
            <div>
              <button
                type="button"
                onClick={handleFetch}
                disabled={loading || applying}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs font-bold uppercase tracking-wider text-white hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Leyendo..." : "Leer Sunset"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={config.grossUpForTransfer15}
                  onChange={(e) => setConfig((c) => ({ ...c, grossUpForTransfer15: e.target.checked }))}
                  className="rounded"
                />
                Guardar Precio de Lista (÷ 0,85) para que el 15% OFF Transferencia quede exacto en Neto
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={includeSizeOnly}
                  onChange={(e) => setIncludeSizeOnly(e.target.checked)}
                  className="rounded"
                />
                Incluir fallback solo por medida (si falta el modelo)
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={onlyChanged}
                  onChange={(e) => setOnlyChanged(e.target.checked)}
                  className="rounded"
                />
                Solo si cambia ≥ $100
              </label>
            </div>
            <div className="text-[11px] text-muted-foreground font-medium">
              Ej. `31x10.50R15 H/T (102,5 USD)`: Neto{" "}
              <strong className="text-emerald-600">{fmtArs(exampleNeto)}</strong> · Lista Web{" "}
              <strong className="text-secondary">{fmtArs(exampleLista)}</strong>
            </div>
          </div>

          {/* Summary filters */}
          {sunsetItems.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {(
                [
                  { id: "updates", label: `Con cambios (${stats.pendingDiff}: ↑${stats.up} / ↓${stats.down})` },
                  { id: "exact", label: `Exactas Medida+Modelo (${stats.exact})` },
                  { id: "size_only", label: `Solo Medida (${stats.sizeOnly})` },
                  { id: "none", label: `Sin stock/precio Sunset (${stats.none})` },
                  { id: "all", label: `Todas XBRI (${stats.totalXbri})` },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterMode(f.id)}
                  className={`rounded-full px-3 py-1 text-xs font-bold border transition cursor-pointer ${
                    filterMode === f.id
                      ? "bg-primary text-white border-primary"
                      : "bg-muted/50 text-secondary border-border hover:bg-muted"
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <span className="ml-auto text-xs font-semibold text-muted-foreground">
                Sunset PY: <strong className="text-secondary">{sunsetItems.length}</strong> cubiertas con precio USD
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4">
          {fetchError && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{fetchError}</span>
            </div>
          )}

          {applySummary && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700">
              <Check className="h-4 w-4 shrink-0" />
              <span>
                ¡Sincronización terminada! Se actualizaron {applySummary.updated} productos XBRI
                {applySummary.errors > 0 ? ` (${applySummary.errors} con error)` : ""}.
              </span>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Descargando lista oficial en vivo desde Sunset Paraguay (`xbri.com.py`)...
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-muted text-[11px] font-bold uppercase text-muted-foreground">
                <tr>
                  <th className="p-2 w-8">
                    <input
                      type="checkbox"
                      checked={
                        visibleRows.some((r) => r.product.id && r.newListArs != null) &&
                        visibleRows
                          .filter((r) => r.product.id && r.newListArs != null)
                          .every((r) => selectedIds.has(r.product.id!))
                      }
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          for (const r of visibleRows) {
                            if (!r.product.id || r.newListArs == null) continue;
                            if (checked) next.add(r.product.id);
                            else next.delete(r.product.id);
                          }
                          return next;
                        });
                      }}
                    />
                  </th>
                  <th className="p-2">Tu Producto (Web)</th>
                  <th className="p-2">Match Sunset PY</th>
                  <th className="p-2 text-right">Sunset USD</th>
                  <th className="p-2 text-right">Transf. Hoy</th>
                  <th className="p-2 text-right">Transf. Nuevo</th>
                  <th className="p-2 text-right">Lista Web Nueva</th>
                  <th className="p-2 text-right">Dif.</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visibleRows.slice(0, 250).map((row) => {
                  const id = row.product.id || `${row.product.size}-${row.product.model}`;
                  const selectable = Boolean(row.product.id && row.newListArs != null);
                  const checked = Boolean(row.product.id && selectedIds.has(row.product.id));
                  return (
                    <tr key={id} className="hover:bg-muted/30">
                      <td className="p-2">
                        {selectable && (
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const on = e.target.checked;
                              setSelectedIds((prev) => {
                                const next = new Set(prev);
                                if (on) next.add(row.product.id!);
                                else next.delete(row.product.id!);
                                return next;
                              });
                            }}
                          />
                        )}
                      </td>
                      <td className="p-2">
                        <div className="font-bold text-secondary">
                          {row.product.size} · {row.product.model}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase">
                          Seg: {row.segment}
                        </div>
                      </td>
                      <td className="p-2">
                        {row.matchedItem ? (
                          <div>
                            <span
                              className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase mr-1 ${
                                row.matchType === "exact"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {row.matchType === "exact" ? "Exacto" : "Solo Medida"}
                            </span>
                            <span className="text-[11px] font-medium text-secondary">
                              {row.matchedItem.fullName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Sin precio USD en Sunset</span>
                        )}
                      </td>
                      <td className="p-2 text-right font-bold">
                        {row.matchedItem ? `USD ${row.matchedItem.usdPrice}` : "—"}
                      </td>
                      <td className="p-2 text-right text-muted-foreground">{fmtArs(row.currentTransferArs)}</td>
                      <td className="p-2 text-right font-bold text-emerald-700">
                        {fmtArs(row.newNetTransferArs)}
                      </td>
                      <td className="p-2 text-right font-bold text-secondary">{fmtArs(row.newListArs)}</td>
                      <td className="p-2 text-right font-bold">
                        {row.newListArs != null && Math.abs(row.diffArs) >= 100 ? (
                          <span
                            className={`inline-flex items-center gap-0.5 ${
                              row.diffArs > 0 ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {row.diffArs > 0 ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            {row.diffPct > 0 ? "+" : ""}
                            {row.diffPct.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No hay filas para mostrar en este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          {visibleRows.length > 250 && (
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Mostrando las primeras 250 filas de {visibleRows.length}. El botón abajo aplicará a los {selectedIds.size} seleccionados.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/40 px-5 py-3">
          <div className="text-xs text-muted-foreground">
            {applying && progress
              ? `Actualizando precios en Supabase: ${progress.current} / ${progress.total}...`
              : `${selectedIds.size} cubiertas XBRI seleccionadas para actualizar`}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={applying}
              className="rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider text-secondary hover:bg-muted cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleApplySelected}
              disabled={applying || loading || selectedIds.size === 0}
              className="flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md disabled:opacity-50 cursor-pointer"
            >
              <Check className="h-4 w-4" />
              {applying
                ? `Aplicando ${progress?.current || 0}/${progress?.total || 0}...`
                : `Actualizar precios (${selectedIds.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
