import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/lib/settings.functions";

interface BrandLogoProps {
  brand: string;
  className?: string;
  customLogoUrl?: string | null;
}

export function normalizeBrandKey(rawBrand: string): string {
  const b = (rawBrand || "").trim().toLowerCase();
  if (b.includes("pirelli")) return "pirelli";
  if (b.includes("bridgestone") || b.includes("bridgstone")) return "bridgestone";
  if (b.includes("continental")) return "continental";
  if (b.includes("michelin")) return "michelin";
  if (b.includes("goodyear") || b.includes("good year")) return "goodyear";
  if (b.includes("firestone")) return "firestone";
  if (b.includes("hankook")) return "hankook";
  if (b.includes("dunlop")) return "dunlop";
  if (b.includes("yokohama")) return "yokohama";
  if (b.includes("kumho")) return "kumho";
  if (b.includes("toyo")) return "toyo";
  if (b.includes("cooper")) return "cooper";
  if (b.includes("durable")) return "durable";
  if (b.includes("duraturn")) return "duraturn";
  if (b.includes("linglong") || b.includes("ling long")) return "linglong";
  if (b.includes("sunset")) return "sunset";
  if (b.includes("xbri")) return "xbri";
  if (b.includes("westlake") || b.includes("west lake")) return "westlake";
  if (b.includes("triangle")) return "triangle";
  if (b.includes("wanli")) return "wanli";
  if (b.includes("windforce")) return "windforce";
  if (b.includes("firemax")) return "firemax";
  if (b.includes("teraflex")) return "teraflex";
  if (b.includes("fate")) return "fate";
  if (b.includes("maxxis")) return "maxxis";
  if (b.includes("nexen")) return "nexen";
  if (b.includes("falken")) return "falken";
  if (b.includes("bfgoodrich") || b.includes("bf goodrich")) return "bfgoodrich";
  if (b.includes("delinte")) return "delinte";
  if (b.includes("massimo")) return "massimo";
  if (b.includes("agate")) return "agate";
  if (b.includes("aplus")) return "aplus";
  if (b.includes("roadmarch")) return "roadmarch";
  if (b.includes("zelda")) return "zelda";
  if (b.includes("membat")) return "membat";
  if (b.includes("haida")) return "haida";
  return b;
}

export const DEFAULT_BRAND_LOGO_MAP: Record<string, string> = {
  xbri: "/images/brands/xbri.webp",
  teraflex: "/images/brands/teraflex.webp",
  continental: "/images/brands/continental.png",
  massimo: "/images/brands/massimo.webp",
  zelda: "/images/brands/zelda.webp",
  linglong: "/images/brands/linglong.webp",
  "ling long": "/images/brands/linglong.webp",
  firemax: "/images/brands/firemax.webp",
  sunset: "/images/brands/sunset.svg",
  "sunset tires": "/images/brands/sunset-tires.webp",
  hankook: "/images/brands/hankook.png",
  bridgestone: "/images/brands/bridgestone.png",
  bridgstone: "/images/brands/bridgestone.png",
  dunlop: "/images/brands/dunlop.webp",
  yokohama: "/images/brands/yokohama.png",
  pirelli: "/images/brands/pirelli.webp",
  "formula (pirelli)": "/images/brands/formula-pirelli-.webp",
  michelin: "/images/brands/michelin.webp",
  goodyear: "/images/brands/goodyear.webp",
  kumho: "/images/brands/kumho.webp",
  agate: "/images/brands/agate.webp",
  aplus: "/images/brands/aplus.webp",
  delinte: "/images/brands/delinte.webp",
  roadmarch: "/images/brands/roadmarch.webp",
  firestone: "/images/brands/firestone.webp",
  toyo: "/images/brands/toyo.webp",
  durable: "/images/brands/durable.webp",
  duraturn: "/images/brands/duraturn.svg",
  triangle: "/images/brands/triangle.svg",
  wanli: "/images/brands/wanli.svg",
  windforce: "/images/brands/windforce.svg",
  westlake: "/images/brands/westlake.svg",
  "west lake": "/images/brands/westlake.svg",
  fate: "/images/brands/fate.png",
  bfgoodrich: "/images/brands/bfgoodrich.png",
  "bf goodrich": "/images/brands/bfgoodrich.png",
  falken: "/images/brands/falken.png",
  maxxis: "/images/brands/maxxis.webp",
  nexen: "/images/brands/nexen.webp",
  cooper: "/images/brands/cooper.webp",
  "stt cooper": "/images/brands/cooper.webp",
  bkt: "/images/brands/bkt.webp",
  giti: "/images/brands/giti.webp",
  "gt radial": "/images/brands/gt-radial.webp",
  "gt-radial": "/images/brands/gt-radial.webp",
  lanvigator: "/images/brands/lanvigator.webp",
  doublestar: "/images/brands/doublestar.webp",
  autogreen: "/images/brands/autogreen.webp",
  membat: "/images/brands/membat.svg",
  haida: "/images/brands/haida.svg",
  goodway: "/images/brands/goodway.webp",
  "good way": "/images/brands/good-way.webp",
  goodride: "/images/brands/goodride.webp",
  goodtire: "/images/brands/goodtire.webp",
  "general tire": "/images/brands/general-tire.webp",
  general: "/images/brands/general-tire.webp",
  hifly: "/images/brands/hifly.webp",
  kelly: "/images/brands/kelly.webp",
  dayton: "/images/brands/dayton.webp",
  kapsen: "/images/brands/kapsen.webp",
  lykeen: "/images/brands/lykeen.webp",
  advance: "/images/brands/advance.webp",
  armour: "/images/brands/armour.webp",
  moura: "/images/brands/moura.webp",
  barum: "/images/brands/barum.webp",
  gri: "/images/brands/gri.webp",
  luhe: "/images/brands/luhe.webp",
  ovation: "/images/brands/ovation.webp",
  maxtrek: "/images/brands/maxtrek.webp",
  runtong: "/images/brands/runtong.webp",
  sentury: "/images/brands/sentury.webp",
  zextour: "/images/brands/zextour.webp",
  habilead: "/images/brands/habilead.webp",
  keystone: "/images/brands/keystone.webp",
  roadwing: "/images/brands/roadwing.webp",
};

export function BrandLogo({ brand, className = "h-6 w-auto max-w-[125px]", customLogoUrl }: BrandLogoProps) {
  const [hasError, setHasError] = useState(false);
  const rawNormalized = (brand || "").trim().toLowerCase();
  const normalized = normalizeBrandKey(rawNormalized);

  // Try custom override from settings
  const { data: settings } = useQuery<any>({
    queryKey: ["settings"],
    queryFn: () => getSettings().catch(() => null),
    staleTime: 60_000,
  });

  const customFromSettings =
    settings?.category_images?.[`brand:${rawNormalized}`] ||
    settings?.category_images?.[`brand:${normalized}`];

  const validCustom = (customLogoUrl && customLogoUrl.trim() !== "")
    ? customLogoUrl
    : (customFromSettings && customFromSettings.trim() !== "")
    ? customFromSettings
    : null;

  const logoSrc =
    validCustom ||
    DEFAULT_BRAND_LOGO_MAP[rawNormalized] ||
    DEFAULT_BRAND_LOGO_MAP[normalized];

  useEffect(() => {
    setHasError(false);
  }, [brand, logoSrc]);

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
