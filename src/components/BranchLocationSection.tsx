import React, { useState, useEffect } from "react";
import { MapPin, Clock, ExternalLink, Phone, Navigation } from "lucide-react";
import type { Branch } from "@/lib/settings.functions";

interface BranchLocationSectionProps {
  branches?: Branch[];
  address?: string;
  hours?: string;
  phone?: string;
  image?: string;
}

export function BranchLocationSection({
  branches,
  address = "Bartolomé Mitre 480, C1036AAH, Ciudad Autónoma de Buenos Aires, Argentina",
  hours = "Lunes a Viernes de 8:00 a 17:00",
  phone = "+54 9 11 2395-1455",
  image = "/images/sucursal-mitre.jpg",
}: BranchLocationSectionProps) {
  const fallbackBranches: Branch[] = [
    {
      id: "casa-central",
      name: "Buenos Aires",
      label: "Casa Central · Autocentro",
      address: address || "Bartolomé Mitre 480, C1036AAH, Ciudad Autónoma de Buenos Aires, Argentina",
      hours: hours || "Lunes a Viernes de 8:00 a 17:00",
      phone: phone || "+54 9 11 2395-1455",
      image_url: image || "/images/sucursal-mitre.jpg",
      is_main: true,
    },
  ];

  const list = branches && branches.length > 0 ? branches : fallbackBranches;
  const [selectedId, setSelectedId] = useState<string>(list[0]?.id || "casa-central");
  const [activeTab, setActiveTab] = useState<"foto" | "mapa">("foto");

  useEffect(() => {
    if (!list.some((b) => b.id === selectedId)) {
      setSelectedId(list[0]?.id || "casa-central");
    }
  }, [list, selectedId]);

  const activeBranch = list.find((b) => b.id === selectedId) || list[0] || fallbackBranches[0];

  const mapsQuery = encodeURIComponent(activeBranch.address);
  const defaultMapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  const targetMapsUrl = activeBranch.maps_url?.trim() ? activeBranch.maps_url : defaultMapsUrl;

  return (
    <section id="sucursales" className="w-full bg-[#0a0c0f] py-20 text-white border-t border-neutral-900 scroll-mt-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Cabecera de sección */}
        <div className="mb-10">
          <span className="rounded-full bg-white/10 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-neutral-300">
            Puntos de Atención
          </span>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white md:text-5xl">
            Casa Central & Sucursales
          </h2>
          <p className="mt-2 text-sm text-neutral-400 max-w-2xl">
            Atención comercial personalizada, despacho directo y entregas a todo el país. Visitá nuestras sedes o coordiná tu retiro directo.
          </p>
        </div>

        {/* Selector de Sucursales estilo Sunset.com.py (visible cuando hay más de 1 sucursal) */}
        {list.length > 1 && (
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {list.map((b) => {
              const isSelected = b.id === activeBranch.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(b.id);
                    setActiveTab("foto");
                  }}
                  className={`group relative flex flex-col items-start p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "bg-white text-black border-white shadow-xl shadow-white/10 scale-[1.01]"
                      : "bg-neutral-900/80 text-white border-white/10 hover:border-white/30 hover:bg-neutral-800/80"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        isSelected
                          ? "bg-[#E3151A] text-white"
                          : b.is_main
                          ? "bg-white/15 text-white"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {b.label || (b.is_main ? "Casa Central" : "Sucursal")}
                    </span>
                    {isSelected && (
                      <span className="flex h-2 w-2 rounded-full bg-[#E3151A]" />
                    )}
                  </div>
                  <span className="text-base font-black tracking-tight">{b.name}</span>
                  <span
                    className={`text-xs mt-1 line-clamp-1 ${
                      isSelected ? "text-neutral-700" : "text-neutral-400"
                    }`}
                  >
                    {b.address}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Showcase de la Sucursal Activa */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 items-center rounded-3xl border border-white/10 bg-neutral-900/60 p-6 md:p-8 backdrop-blur-sm shadow-2xl">
          {/* Contenedor Visual (Foto o Mapa) */}
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-neutral-950 border border-white/10">
            {/* Botones de alternancia Foto / Mapa */}
            <div className="absolute right-4 top-4 z-20 flex gap-1 rounded-full bg-black/80 p-1 border border-white/20 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setActiveTab("foto")}
                className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase transition cursor-pointer ${
                  activeTab === "foto" ? "bg-white text-black" : "text-neutral-400 hover:text-white"
                }`}
              >
                Foto
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("mapa")}
                className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase transition cursor-pointer ${
                  activeTab === "mapa" ? "bg-white text-black" : "text-neutral-400 hover:text-white"
                }`}
              >
                Mapa
              </button>
            </div>

            {activeTab === "foto" ? (
              <div className="h-full w-full relative">
                <img
                  key={activeBranch.id}
                  src={activeBranch.image_url || "/images/sucursal-mitre.jpg"}
                  alt={`Sucursal ${activeBranch.name}`}
                  className="h-full w-full object-cover transition-opacity duration-300"
                  onError={(e) => {
                    e.currentTarget.src = "/images/sucursal-mitre.jpg";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                  <span className="rounded-md bg-[#E3151A] px-2.5 py-1 text-[11px] font-black uppercase text-white tracking-wide shadow-md">
                    {activeBranch.label || (activeBranch.is_main ? "Casa Central" : "Sucursal")}
                  </span>
                  <span className="rounded-md bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-white border border-white/15">
                    {activeBranch.name}
                  </span>
                </div>
              </div>
            ) : (
              <iframe
                key={`map-${activeBranch.id}`}
                title={`Mapa de ubicación ${activeBranch.name}`}
                src={`https://maps.google.com/maps?q=${mapsQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                className="h-full w-full border-0"
                loading="lazy"
              />
            )}
          </div>

          {/* Detalles de la Sucursal */}
          <div className="flex flex-col justify-center space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#E3151A]">
                {activeBranch.label || (activeBranch.is_main ? "Sede Principal" : "Sucursal Oficial")}
              </p>
              <h3 className="mt-1 text-2xl font-black text-white md:text-3xl">
                {activeBranch.name}
              </h3>
              <p className="mt-2 text-sm text-neutral-300 leading-relaxed flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-[#E3151A] shrink-0 mt-1" />
                <span>{activeBranch.address}</span>
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10 text-sm">
              <div className="flex items-start gap-2.5 text-neutral-300">
                <Clock className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-neutral-400 uppercase tracking-wider block">Horarios de atención</span>
                  <span className="font-semibold text-white whitespace-pre-line">{activeBranch.hours}</span>
                </div>
              </div>
              {activeBranch.phone && (
                <div className="flex items-start gap-2.5 text-neutral-300 pt-1">
                  <Phone className="h-4 w-4 text-[#E3151A] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-neutral-400 uppercase tracking-wider block">Contacto y cotizaciones</span>
                    <strong className="text-white">{activeBranch.phone}</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <a
                href={targetMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-xs font-black uppercase tracking-wider text-black hover:bg-neutral-200 transition duration-200 shadow-md hover:scale-[1.02] active:scale-[0.98]"
              >
                <Navigation className="h-3.5 w-3.5 text-[#E3151A]" />
                <span>Abrir en Google Maps</span>
                <ExternalLink className="h-3 w-3 text-neutral-500" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
