import { z } from "zod";

export const CATEGORY_VALUES = [
  "autos",
  "camionetas",
  "suv",
  "camiones",
  "agricolas",
  "industriales",
] as const;

export const categoryEnum = z.enum(CATEGORY_VALUES);

export const productSchema = z
  .object({
    id: z.string().uuid().optional(),
    brand: z.string().min(1).max(80),
    model: z.string().min(1).max(120),
    size: z.string().min(1).max(80),
    categories: z.array(categoryEnum).min(1).max(5),
    price_ars: z.number().min(0),
    stock: z.number().int().min(0),
    image_url: z.string().url().max(500).nullable().optional(),
    description: z.string().max(2000).nullable().optional(),
    is_active: z.boolean(),
    is_featured: z.boolean(),
    free_shipping: z.boolean().default(false),
  })
  .transform((p) => ({
    ...p,
    categories: Array.from(new Set(p.categories)),
    category: p.categories[0]!,
  }));

export const productIdSchema = z.object({ id: z.string().uuid() });
