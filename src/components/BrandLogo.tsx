import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface BrandLogoProps {
  brand: string;
  className?: string;
  customLogoUrl?: string | null;
}

export const DEFAULT_BRAND_LOGO_MAP: Record<string, string> = {
  xbri: "/images/brands/xbri.webp",
  linglong: "/images/brands/linglong.webp",
  "ling long": "/images/brands/linglong.webp",
  firemax: "/images/brands/firemax.webp",
  sunset: "/images/brands/sunset.webp",
  "sunset tires": "/images/brands/sunset.webp",
  pirelli: "/images/brands/pirelli.svg",
  michelin: "/images/brands/michelin.svg",
  goodyear: "/images/brands/goodyear.svg",
};

export function BrandLogo({ brand, className = "h-5 w-auto max-w-[120px]", customLogoUrl }: BrandLogoProps) {
  const [hasError, setHasError] = useState(false);
  const normalized = (brand || "").trim().toLowerCase();

  // Try custom override from settings
  const { data: settings } = useQuery<any>({
    queryKey: ["settings"],
    staleTime: 60_000,
  });

  const customFromSettings = settings?.category_images?.[`brand:${normalized}`];
  const logoSrc = customLogoUrl || customFromSettings || DEFAULT_BRAND_LOGO_MAP[normalized];

  if (!logoSrc || hasError) {
    return (
      <span className="inline-flex items-center rounded bg-neutral-100 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-neutral-800 border border-neutral-200">
        {brand || "LE RADIAL"}
      </span>
    );
  }

  return (
    <img
      src={logoSrc}
      alt={brand}
      onError={() => setHasError(true)}
      className={`${className} object-contain transition-opacity duration-200`}
      loading="lazy"
    />
  );
}
