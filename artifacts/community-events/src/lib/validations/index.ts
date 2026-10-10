import { z } from "zod";

export const CATEGORIES = ["MUSIC", "WORKSHOP", "FOOD", "SPORTS", "KIDS"] as const;
export const THEMES = ["warm-atelier", "midnight-indigo", "botanical"] as const;
export const STICKERS = ["vinyl", "coldbrew", "spark", "flower", "ticket"] as const;
export const categorySchema = z.enum(CATEGORIES);
export const normalizeCity = (value: string) => value.trim().replace(/\s+/g, " ");
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(10).max(72)
  .refine(value => new TextEncoder().encode(value).length <= 72, "Password must be at most 72 UTF-8 bytes");
export const credentialsSchema = z.object({ email: emailSchema, password: passwordSchema }).strict();
const unique = (values: string[]) => new Set(values).size === values.length;
export const favouritesSchema = z.object({
  categories: z.array(categorySchema).max(5).refine(unique, "Categories must be unique"),
}).strict();
export const cardDesignSchema = z.object({
  theme: z.enum(THEMES),
  stickers: z.array(z.enum(STICKERS)).max(3).refine(unique, "Stickers must be unique"),
}).strict();
export const idSchema = z.string().uuid();
export const querySchema = z.object({
  category: categorySchema.optional(),
  city: z.string().max(80).transform(normalizeCity).optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(30).default(9),
}).strict();
export const httpImageSchema = z.string().max(2048).url().refine(value => {
  const url = new URL(value);
  return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
}, "Use a public HTTP or HTTPS URL without credentials");
export const eventInputSchema = z.object({
  title: z.string().trim().min(3).max(120),
  category: categorySchema,
  city: z.string().transform(normalizeCity).pipe(z.string().min(2).max(80)),
  startsAt: z.string().datetime({ offset: true }),
  price: z.string().regex(/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/, "Use a nonnegative rupee amount with at most two decimal places"),
  description: z.string().trim().min(10).max(4000),
  imageUrl: httpImageSchema.nullable().optional(),
  isActive: z.boolean().default(true),
}).strict();
export const eventUpdateSchema = eventInputSchema.partial().extend({
  updatedAt: z.string().datetime({ offset: true }).optional(),
}).refine(value => Object.keys(value).some(key => key !== "updatedAt"), "Include at least one changed field");
