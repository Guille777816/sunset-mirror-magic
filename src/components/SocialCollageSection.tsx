import React from "react";
import { Instagram, Facebook } from "lucide-react";

interface SocialCollageSectionProps {
  instagramUrl?: string;
  facebookUrl?: string;
}

export function SocialCollageSection({
  instagramUrl = "https://www.instagram.com/leradialsrl",
  facebookUrl = "https://www.facebook.com/leradialsrl",
}: SocialCollageSectionProps) {
  // Collage image tiles representing tire lifestyle and auto center
  const tiles = [
    { src: "/images/featured/brutus.webp", alt: "Off road tire", tag: "Brutus A/T" },
    { src: "/images/featured/fastway.webp", alt: "Touring tire", tag: "Fastway" },
    { src: "/images/featured/xcurve.webp", alt: "Truck tire", tag: "Carga Pesada" },
    { src: "/images/tire-guide/Frame1.webp", alt: "Tire 360", tag: "Diseño 2026" },
  ];

  return (
    <section className="relative overflow-hidden bg-black py-20 text-white border-t border-neutral-900">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-neutral-950 to-black opacity-95"></div>

      {/* Decorative blurred background shapes */}
      <div className="absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-[#E3151A]/10 blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 right-1/4 h-96 w-96 rounded-full bg-[#1877f2]/10 blur-3xl pointer-events-none"></div>

      <div className="relative z-10 container mx-auto px-4 max-w-5xl text-center">
        {/* Subtle decorative row of tires */}
        <div className="flex justify-center items-center gap-6 mb-8 opacity-40 hover:opacity-70 transition-opacity">
          {tiles.map((t, idx) => (
            <div key={idx} className="h-20 w-20 md:h-28 md:w-28 rounded-2xl bg-neutral-900/60 p-2 border border-white/10 flex items-center justify-center">
              <img src={t.src} alt={t.alt} className="h-full w-full object-contain" loading="lazy" />
            </div>
          ))}
        </div>

        <h2 className="text-3xl font-black uppercase tracking-tight text-white md:text-5xl lg:text-6xl">
          Seguinos en nuestras redes sociales
        </h2>
        <p className="mt-4 text-sm md:text-base text-neutral-400 max-w-xl mx-auto">
          Conocé lanzamientos de nuevos modelos, consejos de mantenimiento para tu rodado y promociones exclusivas.
        </p>

        {/* Buttons */}
        <div className="mt-8 flex flex-wrap justify-center items-center gap-4">
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] px-8 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-xl shadow-red-950/30 transition-all duration-200 hover:scale-105 hover:shadow-2xl"
          >
            <Instagram className="h-4 w-4" />
            <span>Instagram</span>
          </a>

          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 rounded-full bg-[#1877f2] px-8 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-xl shadow-blue-950/30 transition-all duration-200 hover:scale-105 hover:bg-[#166fe5] hover:shadow-2xl"
          >
            <Facebook className="h-4 w-4" />
            <span>Facebook</span>
          </a>
        </div>
      </div>
    </section>
  );
}
