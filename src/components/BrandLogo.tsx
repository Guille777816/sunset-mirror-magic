import React, { useState } from "react";

interface BrandLogoProps {
  brand: string;
  className?: string;
}

const BRAND_LOGO_MAP: Record<string, string> = {
  xbri: "/images/brands/xbri.svg",
  linglong: "/images/brands/linglong.svg",
  "ling long": "/images/brands/linglong.svg",
  firemax: "/images/brands/firemax.svg",
  sunset: "/images/brands/sunset.svg",
  "sunset tires": "/images/brands/sunset.svg",
  pirelli: "/images/brands/pirelli.svg",
  michelin: "/images/brands/michelin.svg",
  goodyear: "/images/brands/goodyear.svg",
};

export function BrandLogo({ brand, className = "h-5 w-auto max-w-[120px]" }: BrandLogoProps) {
  const [hasError, setHasError] = useState(false);
  const normalized = (brand || "").trim().toLowerCase();
  const logoSrc = BRAND_LOGO_MAP[normalized];

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
