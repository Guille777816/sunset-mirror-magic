import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Limpia medidas de neumáticos eliminando sufijos como '10P', '10PR', etc.
 * Deja únicamente la medida estándar de 3 números (ej: 265/70R18).
 */
export function cleanTireSize(rawSize: string | null | undefined): string {
  if (!rawSize) return "";
  let s = rawSize.trim();
  s = s.replace(/\s*\b\d{1,2}\s*P(?:R)?\b/gi, "");
  s = s.replace(/\s*10P\b/gi, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}
