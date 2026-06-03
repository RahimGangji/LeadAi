import { z } from "zod";

export const parseRequestBodySchema = z.object({
  prompt: z.string().trim().min(8, "Describe the source, target, and quantity.").max(1200),
});

export const parsedRequestSchema = z.object({
  intent: z
    .enum([
      "local_business_search",
      "company_search",
      "contact_search",
      "ceo_search",
      "unknown",
    ])
    .default("unknown"),
  sourceType: z.enum(["google_maps", "linkedin"]).default("google_maps"),
  businessType: z.string().trim().nullable().default(null),
  companyType: z.string().trim().nullable().default(null),
  location: z.string().trim().nullable().default(null),
  locations: z.array(z.string().trim()).default([]),
  quantity: z.coerce.number().int().min(1).max(500).default(50),
  source: z.string().trim().default("Auto"),
  fields: z.array(z.string().trim()).min(1).default([]),
  requestedFields: z.array(z.string().trim()).default([]),
  defaultFieldsUsed: z.boolean().default(true),
  outputFormat: z.literal("xlsx").default("xlsx"),
  searchQuery: z.string().trim().default(""),
  targetUrls: z.array(z.string().trim()).default([]),
  actorKey: z.string().trim().nullable().default(null),
  requiresFollowUp: z.boolean().default(false),
  missingFields: z.array(z.string().trim()).default([]),
  followUpQuestions: z.array(z.string().trim()).default([]),
  confidence: z.coerce.number().min(0).max(1).default(0.5),
});

export const createJobBodySchema = z.object({
  prompt: z.string().trim().min(8).max(1200),
  parsedRequest: parsedRequestSchema,
});
