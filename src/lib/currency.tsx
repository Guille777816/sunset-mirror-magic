import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Currency = "ARS" | "USD" | "BRL" | "PYG";

export type Rates = {
  rate_usd: number; // 1 USD = X ARS
  rate_brl: number; // 1 BRL = X ARS
  rate_pyg: number; // 1 ARS = X PYG (guaraníes por peso)
};

type Ctx = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rates: Rates;
  setRates: (r: Rates) => void;
  format: (ars: number) => string;
};

const DEFAULT_RATES: Rates = { rate_usd: 1450, rate_brl: 279, rate_pyg: 5.5 };
const CurrencyCtx = createContext<Ctx | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("ARS");
  const [rates, setRates] = useState<Rates>(DEFAULT_RATES);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("leradial:currency") as Currency | null;
      if (stored && ["ARS", "USD", "BRL", "PYG"].includes(stored)) setCurrencyState(stored);
    } catch {}
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    try { localStorage.setItem("leradial:currency", c); } catch {}
  };

  const format = (ars: number) => {
    const n = Number(ars) || 0;
    switch (currency) {
      case "USD":
        return "US$ " + (n / (rates.rate_usd || 1)).toLocaleString("es-AR", { maximumFractionDigits: 0 });
      case "BRL":
        return "R$ " + (n / (rates.rate_brl || 1)).toLocaleString("es-AR", { maximumFractionDigits: 0 });
      case "PYG":
        return "₲ " + (n * (rates.rate_pyg || 1)).toLocaleString("es-AR", { maximumFractionDigits: 0 });
      case "ARS":
      default:
        return "$ " + n.toLocaleString("es-AR");
    }
  };

  return (
    <CurrencyCtx.Provider value={{ currency, setCurrency, rates, setRates, format }}>
      {children}
    </CurrencyCtx.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyCtx);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}

export const CURRENCIES: { code: Currency; label: string; flag: string }[] = [
  { code: "ARS", label: "Peso ARS", flag: "🇦🇷" },
  { code: "USD", label: "Dólar", flag: "🇺🇸" },
  { code: "BRL", label: "Real", flag: "🇧🇷" },
  { code: "PYG", label: "Guaraní", flag: "🇵🇾" },
];
