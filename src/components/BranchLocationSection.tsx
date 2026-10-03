import React, { useState } from "react";
import { MapPin, Clock, ExternalLink } from "lucide-react";

interface BranchLocationSectionProps {
  address?: string;
  hours?: string;
  phone?: string;
}

export function BranchLocationSection({
  address = "Bartolomé Mitre 480, C1036AAH, Ciudad Autónoma de Buenos Aires, Argentina",
  hours = "Lunes a Viernes de 8:00 a 17:00",
  phone = "+54 9 11 2395-1455",
}: BranchLocationSectionProps) {
  const [activeTab, setActiveTab] = useState<"foto" | "mapa">("foto");

  const mapsQuery = encodeURIComponent(address);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  return (
    <section id="sucursales" className="w-full bg-[#0a0c0f] py-20 text-white border-t border-neutral-900">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-10">
          <span className="rounded-full bg-white/10 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-neutral-300">
            Puntos de Atención
          </span>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white md:text-5xl">
            Casa Central & Sucursales
          </h2>
          <p className="mt-2 text-sm text-neutral-400">
            Atención comercial personalizada, despacho directo y entregas a todo el país.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8 items-center rounded-3xl border border-white/10 bg-neutral-900/60 p-6 md:p-8 backdrop-blur-sm">
          {/* Visual container (Photo or Map) */}
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-neutral-950 border border-white/10">
            {/* View switch buttons */}
            <div className="absolute right-4 top-4 z-20 flex gap-1 rounded-full bg-black/80 p-1 border border-white/20 backdrop-blur-md">
              <button
                onClick={() => setActiveTab("foto")}
                className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase transition ${
                  activeTab === "foto" ? "bg-white text-black" : "text-neutral-400 hover:text-white"
                }`}
              >
                Foto
              </button>
              <button
                onClick={() => setActiveTab("mapa")}
                className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase transition ${
                  activeTab === "mapa" ? "bg-white text-black" : "text-neutral-400 hover:text-white"
                }`}
              >
                Mapa
              </button>
            </div>

            {activeTab === "foto" ? (
              <div className="h-full w-full relative">
                <img
                  src="/hero-tire-action.jpg"
                  alt="Casa Central Le Radial"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    // Fallback to tire graphic
                    e.currentTarget.src = "/images/featured/brutus.webp";
                    e.currentTarget.className = "h-full w-full object-contain p-8";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                <div className="absolute bottom-4 left-4">
                  <span className="rounded-md bg-[#E3151A] px-2.5 py-1 text-[11px] font-black uppercase text-white">
                    Casa Central
                  </span>
                </div>
              </div>
            ) : (
              <iframe
                title="Mapa de ubicación"
                src={`https://maps.google.com/maps?q=${mapsQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                className="h-full w-full border-0"
                loading="lazy"
              ></iframe>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col justify-center space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#E3151A]">Sede Principal</p>
              <h3 className="mt-1 text-2xl font-black text-white md:text-3xl">Buenos Aires</h3>
              <p className="mt-2 text-sm text-neutral-300 leading-relaxed flex items-start gap-2">
                <MapPin className="h-4 w-4 text-[#E3151A] shrink-0 mt-0.5" />
                <span>{address}</span>
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10 text-sm">
              <div className="flex items-center gap-2 text-neutral-300">
                <Clock className="h-4 w-4 text-neutral-400 shrink-0" />
                <span>Horarios: <strong>{hours}</strong></span>
              </div>
              {phone && (
                <div className="text-neutral-400 text-xs">
                  Atención telefónica y cotizaciones: <strong className="text-white">{phone}</strong>
                </div>
              )}
            </div>

            <div className="pt-2">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-xs font-black uppercase tracking-wider text-black hover:bg-neutral-200 transition duration-200 shadow-md"
              >
                <MapPin className="h-3.5 w-3.5 text-[#E3151A]" />
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
