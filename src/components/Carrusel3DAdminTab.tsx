import React, { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Upload, Trash2, Plus, Sparkles, Check, AlertCircle, Image as ImageIcon, ExternalLink, RefreshCw } from "lucide-react";
import { updateSettings } from "@/lib/settings.functions";
import { optimizeAndReadImage } from "@/lib/image-utils";
import { OfertaCard, DEFAULT_OFERTAS, parseCarruselCards } from "./Carrusel3DOfertas";

interface Carrusel3DAdminTabProps {
  settings: any;
  onRefresh: () => void;
}

export function Carrusel3DAdminTab({ settings, onRefresh }: Carrusel3DAdminTabProps) {
  const saveSettingsFn = useServerFn(updateSettings);
  const [cards, setCards] = useState<OfertaCard[]>(() =>
    parseCarruselCards(settings?.category_images)
  );
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const updateCard = (index: number, patch: Partial<OfertaCard>) => {
    setCards((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const handleFileUpload = async (index: number, file: File) => {
    setUploadingIdx(index);
    setMsg(null);
    try {
      // Optimiza la foto del vehículo a 960px y calidad ligera
      const dataUrl = await optimizeAndReadImage(file, 960, 0.84);
      updateCard(index, { vehicleImageUrl: dataUrl });
      setMsg({ type: "ok", text: `Foto cargada exitosamente para la tarjeta ${index + 1} ✓` });
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Error al procesar la foto" });
    } finally {
      setUploadingIdx(null);
    }
  };

  const addCard = () => {
    const newId = `oferta-${Date.now()}`;
    const newCard: OfertaCard = {
      id: newId,
      vehicleType: "Pickups & 4x4",
      title: "Nueva Oferta con Vehículo",
      subtitle: "Neumático de alto rendimiento garantizado",
      tireBrand: "XBRI",
      tireModel: "Brutus",
      tireSize: "265/70R16",
      priceArs: 220000,
      vehicleImageUrl: "/images/banners/es_desktop_brutus.jpg",
      badge: "OFERTA DESTACADA",
      searchParams: { w: "265", h: "70", r: "16" },
    };
    setCards((prev) => [...prev, newCard]);
  };

  const removeCard = (index: number) => {
    if (cards.length <= 1) {
      alert("Debe haber al menos 1 tarjeta en el carrusel 3D.");
      return;
    }
    if (confirm("¿Seguro que deseas eliminar esta tarjeta del carrusel 3D?")) {
      setCards((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const resetToDefaults = () => {
    if (confirm("¿Restablecer las tarjetas a las ofertas originales de fábrica?")) {
      setCards(DEFAULT_OFERTAS);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMsg(null);
    try {
      const upImages = { ...(settings.category_images || {}) };
      upImages.carrusel_3d_cards = JSON.stringify(cards);

      await saveSettingsFn({
        data: {
          ...settings,
          category_images: upImages,
        },
      });

      onRefresh();
      setMsg({ type: "ok", text: "¡Carrusel 3D actualizado y guardado correctamente! ✓" });
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Error al guardar el carrusel 3D" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header explicativo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>Gestor de Carrusel 3D</span>
          </div>
          <h2 className="mt-2 text-2xl font-black text-neutral-900">
            Carrusel 3D de Ofertas con Vehículos
          </h2>
          <p className="mt-1 text-sm text-neutral-500 max-w-2xl">
            Cargá fotos de vehículos (Hilux, Ranger, autos de paseo, camiones, SUVs), configurá la medida del neumático y los precios de oferta que se muestran en el carrusel 3D de la portada.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetToDefaults}
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition"
          >
            Restablecer fábrica
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            <span>{saving ? "Guardando..." : "Guardar Carrusel 3D"}</span>
          </button>
        </div>
      </div>

      {/* Carteles de alerta */}
      {msg && (
        <div
          className={`rounded-xl p-4 text-sm font-medium flex items-center gap-2 ${
            msg.type === "ok"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {msg.type === "ok" ? <Check className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Lista de tarjetas del carrusel */}
      <div className="grid gap-6 md:grid-cols-2">
        {cards.map((c, idx) => (
          <div
            key={c.id || idx}
            className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4"
          >
            {/* Cabecera de la tarjeta */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-400">
                Tarjeta #{idx + 1}
              </span>
              <button
                type="button"
                onClick={() => removeCard(idx)}
                className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition"
                title="Eliminar tarjeta"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Foto del vehículo con cargador */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="relative h-32 w-32 sm:h-36 sm:w-36 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0">
                <img
                  src={c.vehicleImageUrl}
                  alt={c.title}
                  className="h-full w-full object-cover"
                />
                {uploadingIdx === idx && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold">
                    Subiendo...
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 w-full">
                <label className="block text-xs font-bold text-neutral-700">
                  Foto del Vehículo:
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-neutral-800 transition shadow-xs">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Subir foto desde PC</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(idx, file);
                      }}
                      disabled={uploadingIdx === idx}
                    />
                  </label>
                </div>
                <div className="mt-1">
                  <input
                    type="text"
                    value={c.vehicleImageUrl}
                    onChange={(e) => updateCard(idx, { vehicleImageUrl: e.target.value })}
                    placeholder="o pegar URL de imagen..."
                    className="w-full rounded-lg border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600 bg-neutral-50"
                  />
                </div>
              </div>
            </div>

            {/* Campos de texto y precios */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-neutral-700 block mb-1">
                  Tipo de Vehículo (badge sup.):
                </label>
                <input
                  type="text"
                  value={c.vehicleType}
                  onChange={(e) => updateCard(idx, { vehicleType: e.target.value })}
                  placeholder="Ej: Pickups 4x4 & All-Terrain"
                  className="w-full rounded-lg border border-neutral-200 p-2 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">
                  Badge de Oferta (verde):
                </label>
                <input
                  type="text"
                  value={c.badge}
                  onChange={(e) => updateCard(idx, { badge: e.target.value })}
                  placeholder="Ej: 3 CUOTAS SIN INTERÉS"
                  className="w-full rounded-lg border border-neutral-200 p-2 font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-neutral-700 block mb-1">
                  Título de la Oferta:
                </label>
                <input
                  type="text"
                  value={c.title}
                  onChange={(e) => updateCard(idx, { title: e.target.value })}
                  placeholder="Ej: Hilux & Ranger — XBRI Brutus T/A"
                  className="w-full rounded-lg border border-neutral-200 p-2 font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-neutral-700 block mb-1">
                  Subtítulo / Bajada:
                </label>
                <input
                  type="text"
                  value={c.subtitle}
                  onChange={(e) => updateCard(idx, { subtitle: e.target.value })}
                  placeholder="Ej: Tracción todoterreno en ripio y barro..."
                  className="w-full rounded-lg border border-neutral-200 p-2 text-neutral-600"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">
                  Marca Neumático:
                </label>
                <input
                  type="text"
                  value={c.tireBrand}
                  onChange={(e) => updateCard(idx, { tireBrand: e.target.value })}
                  placeholder="Ej: XBRI"
                  className="w-full rounded-lg border border-neutral-200 p-2 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">
                  Medida (Ancho/Perfil/Rodado):
                </label>
                <input
                  type="text"
                  value={c.tireSize}
                  onChange={(e) => {
                    const sz = e.target.value;
                    const m = sz.match(/(\d{3})\/(\d{2})R?(\d{2})/i);
                    updateCard(idx, {
                      tireSize: sz,
                      searchParams: m
                        ? { w: m[1], h: m[2], r: m[3] }
                        : c.searchParams,
                    });
                  }}
                  placeholder="Ej: 265/70R16"
                  className="w-full rounded-lg border border-neutral-200 p-2 font-black text-emerald-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-neutral-700 block mb-1">
                  Precio de Lista (ARS):
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-neutral-400">$</span>
                  <input
                    type="number"
                    value={c.priceArs}
                    onChange={(e) => updateCard(idx, { priceArs: Number(e.target.value) || 0 })}
                    placeholder="245000"
                    className="w-full rounded-lg border border-neutral-200 p-2 font-black text-neutral-900"
                  />
                  <span className="text-[11px] text-neutral-400 whitespace-nowrap">
                    15% OFF: ${Math.round(c.priceArs * 0.85).toLocaleString("es-AR")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Botones inferiores */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-neutral-200">
        <button
          type="button"
          onClick={addCard}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-bold text-neutral-800 shadow-xs hover:bg-neutral-50 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Agregar otra tarjeta de vehículo</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition"
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          <span>{saving ? "Guardando..." : "Guardar Carrusel 3D"}</span>
        </button>
      </div>
    </div>
  );
}
