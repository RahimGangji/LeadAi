import type { ParsedRequest, SourceType } from "@/lib/types";
import { parsedRequestSchema } from "./schemas";

const CEREBRAS_CHAT_COMPLETIONS_URL = "https://api.cerebras.ai/v1/chat/completions";

const DEFAULT_FIELDS: Record<SourceType, string[]> = {
  google_maps: [
    "businessName",
    "phone",
    "email",
    "website",
    "address",
    "rating",
    "reviewsCount",
    "googleMapsUrl",
    "source",
  ],
  linkedin: [
    "companyName",
    "linkedinCompanyUrl",
    "contactName",
    "title",
    "linkedinProfileUrl",
    "website",
    "industry",
    "location",
    "email",
    "source",
  ],
};

function extractJson(content: string) {
  const trimmed = content.trim();

  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("The AI response did not include valid JSON.");
  }

  return JSON.parse(match[0]);
}

function extractUrls(prompt: string) {
  return Array.from(new Set(prompt.match(/https?:\/\/[^\s),]+/gi) || []));
}

function detectSourceType(value: unknown, prompt: string): SourceType {
  const text = `${typeof value === "string" ? value : ""} ${prompt}`.toLowerCase();
  if (/linkedin/.test(text)) return "linkedin";
  return "google_maps";
}

function normalizeIntent(value: unknown, sourceType: SourceType) {
  const intent = typeof value === "string" ? value.toLowerCase().replace(/[^a-z0-9]+/g, "_") : "";

  if (sourceType === "linkedin" && /contact|ceo|founder|profile|person|people/.test(intent)) return "contact_search";
  if (sourceType === "linkedin") return "company_search";

  if (
    [
      "local_business_search",
      "local_business",
      "business_search",
      "business_data",
      "google_maps_search",
      "google_maps_business_search",
      "maps_business_search",
      "place_search",
      "places_search",
    ].includes(intent)
  ) {
    return "local_business_search";
  }

  if (["company_search", "company_data", "companies_search", "saas_company_search"].includes(intent)) return "company_search";
  if (["contact_search", "contact_data", "lead_contact_search"].includes(intent)) return "contact_search";
  if (["ceo_search", "ceo_data", "executive_search", "founder_search"].includes(intent)) return "ceo_search";

  return "unknown";
}

function normalizeSource(sourceType: SourceType, value: unknown) {
  const explicit = typeof value === "string" && value.trim() ? value.trim() : "";
  if (sourceType === "google_maps") return "Google Maps";
  if (sourceType === "linkedin") return "LinkedIn";
  return explicit || "Google Maps";
}

function normalizeStringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeLocation(value: string | null) {
  if (!value) return null;
  return value.replace(/\s+/g, " ").trim();
}

function splitLocations(location: string) {
  return location
    .split(/\s+(?:and|or|&)\s+|;/i)
    .map((part) => normalizeLocation(part))
    .filter((part): part is string => Boolean(part));
}

function normalizeLocations(value: unknown, fallbackLocation: string | null) {
  const locations = normalizeStringArray(value).flatMap(splitLocations);
  if (locations.length > 0) return Array.from(new Set(locations));
  return fallbackLocation ? Array.from(new Set(splitLocations(fallbackLocation))) : [];
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
    : [];
}

function normalizeFieldName(field: string) {
  const key = field.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (["name", "businessname", "place", "placename"].includes(key)) return "businessName";
  if (["company", "companyname", "organization"].includes(key)) return "companyName";
  if (["person", "fullname", "contact", "contactname"].includes(key)) return "contactName";
  if (["email", "emai", "emailaddress", "emails"].includes(key)) return "email";
  if (["phone", "phonenumber", "phones"].includes(key)) return "phone";
  if (["site", "url", "web", "companywebsite"].includes(key)) return "website";
  if (["linkedin", "linkedinurl", "profileurl"].includes(key)) return "linkedinProfileUrl";
  return field;
}

function fieldsFromPrompt(prompt: string) {
  const lower = prompt.toLowerCase();
  const fields: string[] = [];

  if (/\bname\b|business name|company name/.test(lower)) fields.push("businessName");
  if (/address|location/.test(lower)) fields.push("address");
  if (/phone|number/.test(lower)) fields.push("phone");
  if (/\bemai(?:l)?\b/.test(lower)) fields.push("email");
  if (/website|site|url/.test(lower)) fields.push("website");
  if (/linkedin profile url|linkedin url|profile url/.test(lower)) fields.push("linkedinProfileUrl");
  if (/rating/.test(lower)) fields.push("rating");
  if (/review/.test(lower)) fields.push("reviewsCount");
  if (/industry/.test(lower)) fields.push("industry");
  if (/employee|company size|size/.test(lower)) fields.push("employeeCount");
  if (/title|ceo|founder|role/.test(lower)) fields.push("title");

  return Array.from(new Set(fields));
}

function normalizeFields(value: unknown, sourceType: SourceType, prompt: string) {
  const aiFields = normalizeStringArray(value).map(normalizeFieldName);
  const promptFields = fieldsFromPrompt(prompt);
  const requestedFields = Array.from(new Set([...promptFields, ...aiFields]));
  const asksForDetails = /\b(details|data|information|info|profile|profiles)\b/i.test(prompt);
  const defaultFieldsUsed = requestedFields.length === 0 || asksForDetails;
  const fields = defaultFieldsUsed
    ? Array.from(new Set([...DEFAULT_FIELDS[sourceType], ...requestedFields]))
    : requestedFields;

  return {
    fields: Array.from(new Set(fields)),
    requestedFields,
    defaultFieldsUsed,
  };
}

function normalizeQuantity(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d]/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return 50;
}

function normalizeConfidence(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.min(1, Math.max(0, value));

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "high") return 0.9;
    if (normalized === "medium") return 0.6;
    if (normalized === "low") return 0.3;

    const parsed = Number(normalized.replace("%", ""));
    if (Number.isFinite(parsed)) {
      const score = parsed > 1 ? parsed / 100 : parsed;
      return Math.min(1, Math.max(0, score));
    }
  }

  return 0.7;
}

function buildSearchQuery(prompt: string, sourceType: SourceType, businessType: string | null, companyType: string | null, location: string | null) {
  if (sourceType === "google_maps") {
    return `${businessType || companyType || "businesses"}${location ? ` in ${location}` : ""}`.trim();
  }

  return [businessType || companyType, location].filter(Boolean).join(" in ") || prompt.replace(/https?:\/\/[^\s),]+/gi, "").trim();
}

function normalizeAiOutput(raw: unknown, prompt: string) {
  if (!raw || typeof raw !== "object") return raw;

  const output = raw as Record<string, unknown>;
  const sourceType = detectSourceType(output.sourceType || output.source, prompt);
  const quantity = normalizeQuantity(output.quantity);
  const fieldResult = normalizeFields(output.fields, sourceType, prompt);
  const businessType = normalizeStringOrNull(output.businessType);
  const companyType = normalizeStringOrNull(output.companyType);
  const location = normalizeLocation(normalizeStringOrNull(output.location));
  const locations = normalizeLocations(output.locations, location);
  const targetUrls = Array.from(new Set([...extractUrls(prompt), ...normalizeStringArray(output.targetUrls)]));
  const aiSearchQuery = normalizeStringOrNull(output.searchQuery);

  return {
    ...output,
    intent: normalizeIntent(output.intent, sourceType),
    sourceType,
    businessType,
    companyType,
    location,
    locations,
    quantity,
    source: normalizeSource(sourceType, output.source),
    fields: fieldResult.fields,
    requestedFields: fieldResult.requestedFields,
    defaultFieldsUsed: fieldResult.defaultFieldsUsed,
    outputFormat: "xlsx",
    searchQuery:
      sourceType === "google_maps"
        ? buildSearchQuery(prompt, sourceType, businessType, companyType, locations.length > 1 ? locations.join(" and ") : location)
        : aiSearchQuery || buildSearchQuery(prompt, sourceType, businessType, companyType, location),
    targetUrls,
    actorKey: normalizeStringOrNull(output.actorKey),
    requiresFollowUp: output.requiresFollowUp === true,
    missingFields: normalizeStringArray(output.missingFields),
    followUpQuestions: normalizeStringArray(output.followUpQuestions),
    confidence: normalizeConfidence(output.confidence),
  };
}

function fallbackParsedRequest(prompt: string): ParsedRequest {
  const sourceType = detectSourceType(null, prompt);
  const quantityMatch = prompt.match(/\b(\d{1,3})\b/);
  const quantity = quantityMatch ? Number(quantityMatch[1]) : 50;
  const urls = extractUrls(prompt);
  const cleaned = prompt
    .replace(/^(give|get|find|scrape|show|collect|extract)\s+(me\s+)?/i, "")
    .replace(/\b\d{1,3}\b/, "")
    .replace(/\bbased\s+in\b/gi, "in")
    .trim();
  const [rawSubject, rawLocation] = cleaned.split(/\s+(?:in|from|near|around)\s+/i);
  const businessType = rawSubject?.replace(/\b(data|businesses|companies|google maps|linkedin|web|internet)\b/gi, "").trim();
  const location = normalizeLocation(rawLocation?.replace(/\b(google maps|linkedin|with .*)\b/gi, "").trim() || null);
  const locations = normalizeLocations(null, location);
  const fieldResult = normalizeFields(null, sourceType, prompt);

  return {
    intent: normalizeIntent(null, sourceType),
    sourceType,
    businessType: businessType || null,
    companyType: null,
    location: location || null,
    locations,
    quantity,
    source: normalizeSource(sourceType, null),
    fields: fieldResult.fields,
    requestedFields: fieldResult.requestedFields,
    defaultFieldsUsed: fieldResult.defaultFieldsUsed,
    outputFormat: "xlsx",
    searchQuery: buildSearchQuery(prompt, sourceType, businessType || null, null, locations.length > 1 ? locations.join(" and ") : location || null),
    targetUrls: urls,
    actorKey: null,
    requiresFollowUp: false,
    missingFields: [],
    followUpQuestions: [],
    confidence: 0.55,
  };
}

function withFollowUpDefaults(parsed: ParsedRequest): ParsedRequest {
  const missingFields = new Set(parsed.missingFields);

  if (parsed.sourceType === "google_maps" && !parsed.businessType && !parsed.companyType) missingFields.add("businessType");
  if (parsed.sourceType === "google_maps" && !parsed.location && parsed.locations.length === 0) missingFields.add("location");

  const requiresFollowUp = parsed.requiresFollowUp || missingFields.size > 0 || parsed.intent === "unknown";
  const followUpQuestions = parsed.followUpQuestions.length
    ? parsed.followUpQuestions
    : ["Please include enough detail for Google Maps or LinkedIn: target, location or LinkedIn URL, and number of records."];

  return {
    ...parsed,
    requiresFollowUp,
    missingFields: Array.from(missingFields),
    followUpQuestions: requiresFollowUp ? followUpQuestions : [],
    outputFormat: "xlsx",
  };
}

function withSupportedSourceScope(parsed: ParsedRequest, prompt: string): ParsedRequest {
  const unsupportedSourceRequested = /\b(facebook|fb\.com|instagram|yelp|yellow\s*pages)\b/i.test(prompt)
    || /\b(generic\s+web|web\s+scrap(?:e|er|ing)|website\s+scrap(?:e|er|ing)|scrape\s+(?:a\s+)?website|from\s+(?:a\s+)?website)\b/i.test(prompt);

  if (!unsupportedSourceRequested) return parsed;

  return {
    ...parsed,
    requiresFollowUp: true,
    missingFields: Array.from(new Set([...parsed.missingFields, "sourceType"])),
    followUpQuestions: ["This tool is limited to LinkedIn and Google Maps. Please rewrite the request for one of those sources."],
  };
}

export async function parsePromptWithCerebras(prompt: string): Promise<ParsedRequest> {
  const apiKey = process.env.CEREBRAS_API_KEY || process.env.ZAI_API_KEY;

  if (!apiKey) {
    throw new Error("CEREBRAS_API_KEY or ZAI_API_KEY is missing from the server environment.");
  }

  const model = process.env.CEREBRAS_MODEL || process.env.ZAI_GLM_MODEL || "zai-glm-4.7";

  const response = await fetch(CEREBRAS_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.05,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You convert scraping and lead-data requests into strict JSON.",
            "Return only one JSON object. No markdown.",
            'Allowed intent values: "local_business_search", "company_search", "contact_search", "ceo_search", "unknown".',
            'Allowed sourceType values: "google_maps", "linkedin".',
            "Reject Facebook, generic website scraping, and other sources by setting requiresFollowUp true and asking for a Google Maps or LinkedIn request.",
            "Extract sourceType, businessType, companyType, location, locations, quantity, fields, searchQuery, and targetUrls.",
            'For multiple Google Maps locations, set locations to an array and set location to those places joined by " and ".',
            "Normalize obvious spelling, spacing, and capitalization mistakes in location names using general geographic knowledge.",
            "Do not extract or use page numbers or result offsets.",
            "If the user asks for specific fields, include only those field keys. If no fields are specified, return an empty fields array so the backend can choose defaults.",
            "Use email in fields when the user asks for email or email address, but do not claim email availability.",
            "If the request is too vague, set requiresFollowUp true with concise followUpQuestions.",
          ].join(" "),
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cerebras request failed: ${response.status} ${text.slice(0, 240)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error("Cerebras returned an unexpected response shape.");
  }

  const parsedResult = parsedRequestSchema.safeParse(normalizeAiOutput(extractJson(content), prompt));
  const parsed = parsedResult.success ? parsedResult.data : fallbackParsedRequest(prompt);

  if (!parsedResult.success) {
    console.error("AI output needed fallback parsing", parsedResult.error);
  }

  return withSupportedSourceScope(withFollowUpDefaults(parsed), prompt);
}
