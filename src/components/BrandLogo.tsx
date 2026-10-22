import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/lib/settings.functions";

interface BrandLogoProps {
  brand: string;
  className?: string;
  customLogoUrl?: string | null;
}

export const DEFAULT_BRAND_LOGO_MAP: Record<string, string> = {
  xbri: "/images/brands/xbri.webp",
  teraflex: "/images/brands/teraflex.svg",
  continental: "/images/brands/continental.svg",
  massimo: "/images/brands/massimo.svg",
  zelda: "/images/brands/zelda.svg",
  linglong: "/images/brands/linglong.svg",
  "ling long": "/images/brands/linglong.svg",
  firemax: "/images/brands/firemax.svg",
  sunset: "/images/brands/sunset.svg",
  "sunset tires": "/images/brands/sunset.svg",
  hankook: "/images/brands/hankook.svg",
  bridgestone: "/images/brands/bridgestone.svg",
  dunlop: "/images/brands/dunlop.svg",
  yokohama: "/images/brands/yokohama.svg",
  pirelli: "/images/brands/pirelli.svg",
  michelin: "/images/brands/michelin.svg",
  goodyear: "/images/brands/goodyear.svg",
  kumho: "/images/brands/kumho.svg",
  agate: "/images/brands/agate.svg",
  aplus: "/images/brands/aplus.svg",
  delinte: "/images/brands/delinte.svg",
  roadmarch: "/images/brands/roadmarch.svg",
  firestone: "/images/brands/firestone.svg",
};

export function BrandLogo({ brand, className = "h-6 w-auto max-w-[125px]", customLogoUrl }: BrandLogoProps) {
  const [hasError, setHasError] = useState(false);
  const normalized = (brand || "").trim().toLowerCase();

  // Try custom override from settings
  const { data: settings } = useQuery<any>({
    queryKey: ["settings"],
    queryFn: () => getSettings().catch(() => null),
    staleTime: 60_000,
  });

  const customFromSettings = settings?.category_images?.[`brand:${normalized}`];
  const validCustom = (customLogoUrl && customLogoUrl.trim() !== "")
    ? customLogoUrl
    : (customFromSettings && customFromSettings.trim() !== "")
    ? customFromSettings
    : null;

  const logoSrc = validCustom || DEFAULT_BRAND_LOGO_MAP[normalized];

  if (!logoSrc || hasError) {
    return (
      <div className="h-6 inline-flex items-center">
        <span className="inline-flex items-center text-sm font-black uppercase tracking-wider text-neutral-900 border-l-2 border-[#E3151A] pl-1.5 leading-none">
          {brand || "LE RADIAL"}
        </span>
      </div>
    );
  }

  return (
    <div className="h-6 inline-flex items-center">
      <img
        src={logoSrc}
        alt={brand}
        onError={() => setHasError(true)}
        className={`${className} max-h-6 w-auto max-w-[125px] object-contain transition-opacity duration-200`}
        loading="lazy"
      />
    </div>
  );
}
