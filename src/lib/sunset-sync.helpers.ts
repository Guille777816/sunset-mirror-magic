export type SunsetSyncItem = {
  id: number | string;
  fullName: string;
  size: string | null;
  patternName: string | null;
  subcategory: string | null;
  usdPrice: number;
  inStock: boolean;
};

export type TireSegment = "autos" | "camionetas" | "camiones";

export type SunsetSyncConfig = {
  rateUsd: number;
  addonAutos: number;
  addonCamionetas: number;
  addonCamiones: number;
  grossUpForTransfer15: boolean;
};

export type LocalProductLike = {
  id?: string;
  brand: string;
  model: string;
  size: string;
  category?: string;
  categories?: string[];
  price_ars: number;
  stock?: number;
  is_active?: boolean;
};

export type MatchedSunsetRow = {
  product: LocalProductLike;
  matchType: "exact" | "size_only" | "none";
  matchedItem: SunsetSyncItem | null;
  segment: TireSegment;
  currentListArs: number;
  currentTransferArs: number;
  newNetTransferArs: number | null;
  newListArs: number | null;
  diffArs: number;
  diffPct: number;
};

export function normSunsetSizeKey(rawSize?: string | null, rawModel?: string | null): string {
  const txt = `${rawSize || ""} ${rawModel || ""}`.toUpperCase().trim();
  if (!txt) return "";

  // Flotation: 31x10.50R15, 31.00/10.50R15, 35.00/12.50R18LT
  const mFlt = txt.match(/(\d{2})(?:\.00)?[X/](\d{1,2}\.\d{2})R(\d{2})/);
  if (mFlt) {
    return `${mFlt[1]}X${mFlt[2]}R${mFlt[3]}`;
  }

  // Metric with optional decimal rim: 295/80R22.5, 205/55R16, 215/75R17.5
  const mMet = txt.match(/(\d{3}\/\d{2})R(\d{2}(?:\.\d+)?)/);
  if (mMet) {
    return `${mMet[1]}R${mMet[2]}`;
  }

  // Commercial R-type: 185R14C, 195R15C
  const mCom = txt.match(/(\d{3})R(\d{2})/);
  if (mCom) {
    return `${mCom[1]}R${mCom[2]}`;
  }

  // Decimal truck sizes: 7.00R16LT, 7.50R16, 10.00R20
  const mDec = txt.match(/(\d+\.\d{2})R(\d{2})/);
  if (mDec) {
    return `${mDec[1]}R${mDec[2]}`;
  }

  // Agro / Industrial dash sizes: 17.5-25, 14.9-24, 10-16.5, 650/65-30.5
  const mDash = txt.match(/(\d+(?:\/\d+)?(?:\.\d+)?-\d+(?:\.\d+)?)/);
  if (mDash) {
    return mDash[1];
  }

  return "";
}

export function normModelTokens(model?: string | null): string[] {
  const s = (model || "")
    .toUpperCase()
    .replace(/\b\d{2,3}(?:\.\d{2})?[X/]\d{1,2}(?:\.\d+)?R\d{2}(?:\.\d+)?(?:LT|C)?\b/g, " ")
    .replace(/\bLT\d{3}\/\d{2}R\d{2}\b/g, " ")
    .replace(/\b\d{1,2}PR\b/g, " ")
    .replace(/\b\d{2,3}(?:\/\d{2,3})?[A-Z]\b/g, " ")
    .replace(/\b(?:LT|LTR|XL|TL|TT|WL|R|C|SET)\b/g, " ")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
  return s ? s.split(/\s+/).filter(Boolean) : [];
}

function compactModel(model?: string | null): string {
  return normModelTokens(model).join("");
}

export function classifyTireSegment(
  subcategory?: string | null,
  localCategories?: string[] | null,
  localCategory?: string | null,
): TireSegment {
  const sc = (subcategory || "").toUpperCase().trim();
  if (sc === "PCR" || sc === "UHP") return "autos";
  if (sc === "SUV" || sc === "LTR") return "camionetas";
  if (sc === "TBR" || sc === "AGR" || sc === "AGRI - RADIAL" || sc === "IND" || sc === "OTR") {
    return "camiones";
  }

  const allLocal = [
    ...(Array.isArray(localCategories) ? localCategories : []),
    ...(localCategory ? [localCategory] : []),
  ].map((c) => String(c).toLowerCase().trim());

  if (allLocal.some((c) => c === "camiones" || c === "agricolas" || c === "industriales")) {
    return "camiones";
  }
  if (allLocal.some((c) => c === "camionetas" || c === "suv")) {
    return "camionetas";
  }
  return "autos";
}

export function computeSunsetArsPrices(
  usdPrice: number,
  segment: TireSegment,
  config: SunsetSyncConfig,
): { netTransferArs: number; listPriceArs: number } {
  const addon =
    segment === "autos"
      ? config.addonAutos
      : segment === "camionetas"
        ? config.addonCamionetas
        : config.addonCamiones;

  const netTransferArs = Math.round((usdPrice + addon) * config.rateUsd);
  const listPriceArs = config.grossUpForTransfer15
    ? Math.round(netTransferArs / 0.85)
    : netTransferArs;

  return { netTransferArs, listPriceArs };
}

export function matchXbriProductsToSunset(
  localProducts: LocalProductLike[],
  sunsetItems: SunsetSyncItem[],
  config: SunsetSyncConfig,
): MatchedSunsetRow[] {
  const xbriLocal = localProducts.filter((p) =>
    (p.brand || "").trim().toUpperCase().includes("XBRI"),
  );

  // Index priced Sunset items by normalized size key
  const bySize = new Map<string, SunsetSyncItem[]>();
  for (const item of sunsetItems) {
    if (!item.usdPrice || item.usdPrice <= 0) continue;
    const key = normSunsetSizeKey(item.size, item.fullName);
    if (!key) continue;
    const list = bySize.get(key) || [];
    list.push(item);
    bySize.set(key, list);
  }

  return xbriLocal.map((product) => {
    const sizeKey = normSunsetSizeKey(product.size, product.model);
    const candidates = sizeKey ? bySize.get(sizeKey) || [] : [];
    const currentListArs = Math.round(Number(product.price_ars) || 0);
    const currentTransferArs = Math.round(currentListArs * 0.85);
    const fallbackSeg = classifyTireSegment(null, product.categories, product.category);

    if (!candidates.length) {
      return {
        product,
        matchType: "none",
        matchedItem: null,
        segment: fallbackSeg,
        currentListArs,
        currentTransferArs,
        newNetTransferArs: null,
        newListArs: null,
        diffArs: 0,
        diffPct: 0,
      };
    }

    const localTokens = new Set(normModelTokens(product.model));
    const localCompact = compactModel(product.model);

    let bestItem: SunsetSyncItem | null = null;
    let bestScore = -1;

    for (const cand of candidates) {
      const candLabel = cand.patternName || cand.fullName;
      const candTokens = new Set(normModelTokens(candLabel));
      let score = 0;
      for (const tok of localTokens) {
        if (candTokens.has(tok)) score += 1;
      }
      const candCompact = compactModel(cand.patternName || "");
      const candFullCompact = compactModel(cand.fullName);
      if (
        (candCompact && localCompact && (localCompact.includes(candCompact) || candCompact.includes(localCompact))) ||
        (localCompact && candFullCompact.includes(localCompact))
      ) {
        score += 3;
      }

      if (score > bestScore) {
        bestScore = score;
        bestItem = cand;
      } else if (score === bestScore && bestItem) {
        // Tie-breaker: prefer in-stock, then lower USD price
        if (cand.inStock !== bestItem.inStock) {
          if (cand.inStock) bestItem = cand;
        } else if (cand.usdPrice < bestItem.usdPrice) {
          bestItem = cand;
        }
      }
    }

    const chosen = bestItem!;
    const matchType: "exact" | "size_only" = bestScore > 0 ? "exact" : "size_only";
    const segment = classifyTireSegment(chosen.subcategory, product.categories, product.category);
    const { netTransferArs, listPriceArs } = computeSunsetArsPrices(chosen.usdPrice, segment, config);
    const diffArs = listPriceArs - currentListArs;
    const diffPct = currentListArs > 0 ? (diffArs / currentListArs) * 100 : 0;

    return {
      product,
      matchType,
      matchedItem: chosen,
      segment,
      currentListArs,
      currentTransferArs,
      newNetTransferArs: netTransferArs,
      newListArs: listPriceArs,
      diffArs,
      diffPct,
    };
  });
}
