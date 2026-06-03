import type { ParsedRequest, SourceType } from "@/lib/types";

const APIFY_BASE_URL = "https://api.apify.com/v2";

const STATE_CODE_LOOKUP: Record<string, string> = {
  alabama: "al",
  alaska: "ak",
  arizona: "az",
  arkansas: "ar",
  california: "ca",
  colorado: "co",
  connecticut: "ct",
  delaware: "de",
  florida: "fl",
  georgia: "ga",
  hawaii: "hi",
  idaho: "id",
  illinois: "il",
  indiana: "in",
  iowa: "ia",
  kansas: "ks",
  kentucky: "ky",
  louisiana: "la",
  maine: "me",
  maryland: "md",
  massachusetts: "ma",
  michigan: "mi",
  minnesota: "mn",
  mississippi: "ms",
  missouri: "mo",
  montana: "mt",
  nebraska: "ne",
  nevada: "nv",
  "new hampshire": "nh",
  "new jersey": "nj",
  "new mexico": "nm",
  "new york": "ny",
  "north carolina": "nc",
  "north dakota": "nd",
  ohio: "oh",
  oklahoma: "ok",
  oregon: "or",
  pennsylvania: "pa",
  "rhode island": "ri",
  "south carolina": "sc",
  "south dakota": "sd",
  tennessee: "tn",
  texas: "tx",
  utah: "ut",
  vermont: "vt",
  virginia: "va",
  washington: "wa",
  "west virginia": "wv",
  wisconsin: "wi",
  wyoming: "wy",
};

type ApifyRun = {
  id: string;
  status: string;
  defaultDatasetId?: string;
  statusMessage?: string;
};

type ApifyStoreActor = {
  id?: string;
  title?: string;
  name?: string;
  username?: string;
  description?: string;
  categories?: string[];
  stats?: {
    totalRuns?: number;
    totalUsers?: number;
    totalUsers30Days?: number;
  };
  currentPricingInfo?: {
    pricingModel?: string;
  };
};

export type ActorKey =
  | "google_maps_business"
  | "linkedin_company"
  | "linkedin_profile";

export type ActorConfig = {
  key: ActorKey;
  label: string;
  sourceType: SourceType;
  actorId: string;
  envName: string;
  pricingModel?: string;
  dynamic?: boolean;
  inputStrategy:
    | "googleMaps"
    | "linkedinBulk"
    | "linkedinProfileUrls";
};

export class ApifyRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public type?: string,
  ) {
    super(message);
  }
}

export function getApifyUserMessage(error: unknown) {
  if (!(error instanceof ApifyRequestError)) return null;

  if (error.status === 403 && error.type === "actor-is-not-rented") {
    return "The selected LinkedIn data route is paid and is not active on this account. Account credit alone does not activate every paid route; activate or rent this route, or configure a different LinkedIn route that is already available on your account.";
  }

  if (error.status === 400 && error.type === "no-free-linkedin-actor") {
    return "No free LinkedIn data route is available for this request. Configure a free LinkedIn route in the server environment, or provide direct LinkedIn URLs that match an available free route.";
  }

  if (error.status === 403 && error.type === "all-actor-candidates-unavailable") {
    return "All configured data routes for this source are unavailable on this account. Activate one of the configured routes or update the server configuration.";
  }

  if (error.status === 400 && error.type === "all-actor-candidates-unavailable") {
    return "No configured LinkedIn data route accepted this request shape. Provide LinkedIn profile/company URLs, or configure a LinkedIn route that supports keyword search.";
  }

  if (error.status === 403) {
    return "Access was denied for the selected data route. Check that the server credentials have permission for this source.";
  }

  if (error.status === 404) {
    return "The selected data route was not found. Check the route configuration in your environment file.";
  }

  return null;
}

function getApifyToken() {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new Error("APIFY_API_TOKEN is missing from the server environment.");
  }
  return token;
}

function normalizeActorId(actorId: string) {
  const value = actorId.trim();

  if (value === "apify/google-maps-scraper" || value === "apify~google-maps-scraper") {
    return "compass/crawler-google-places";
  }

  return value.replace("~", "/");
}

function configuredActors(envName: string, fallbackActors: string[]) {
  const configured = process.env[envName]
    ?.split(",")
    .map((actor) => actor.trim())
    .filter(Boolean);

  return Array.from(new Set([...(configured || []), ...fallbackActors])).map(normalizeActorId);
}

function isLinkedInProfileUrlActor(actorId: string) {
  const normalized = normalizeActorId(actorId).toLowerCase();
  return normalized.includes("alwaysprimedev/linkedin-profile-scraper");
}

function isSilentFlowBulkActor(actorId: string) {
  return normalizeActorId(actorId).toLowerCase().includes("silentflow/linkedin-profiles-companies-scraper");
}

function inputStrategyForKey(key: ActorKey): ActorConfig["inputStrategy"] {
  if (key === "linkedin_company" || key === "linkedin_profile") return "linkedinBulk";
  return "googleMaps";
}

function labelForKey(key: ActorKey) {
  if (key === "linkedin_company") return "LinkedIn company data";
  if (key === "linkedin_profile") return "LinkedIn profile data";
  return "Google Maps business data";
}

function sourceTypeForKey(key: ActorKey): SourceType {
  if (key === "linkedin_company" || key === "linkedin_profile") return "linkedin";
  return "google_maps";
}

function linkedInFreeOnly() {
  return process.env.APIFY_LINKEDIN_FREE_ONLY !== "false";
}

function isLinkedInKey(key: ActorKey) {
  return key === "linkedin_company" || key === "linkedin_profile";
}

export function getActorRegistry(): ActorConfig[] {
  const actorConfigs: Omit<ActorConfig, "actorId">[] = [
    {
      key: "google_maps_business",
      label: "Google Maps business data",
      sourceType: "google_maps",
      envName: "APIFY_GOOGLE_MAPS_ACTOR_ID",
      inputStrategy: "googleMaps",
    },
    {
      key: "linkedin_company",
      label: "LinkedIn company data",
      sourceType: "linkedin",
      envName: "APIFY_LINKEDIN_COMPANY_ACTOR_ID",
      inputStrategy: "linkedinBulk",
    },
    {
      key: "linkedin_profile",
      label: "LinkedIn profile data",
      sourceType: "linkedin",
      envName: "APIFY_LINKEDIN_PROFILE_ACTOR_ID",
      inputStrategy: "linkedinBulk",
    },
  ];

  const actorsByKey: Record<ActorKey, string[]> = {
    google_maps_business: configuredActors("APIFY_GOOGLE_MAPS_ACTOR_ID", [
      process.env.APIFY_DEFAULT_GOOGLE_MAPS_ACTOR_ID || "compass/crawler-google-places",
    ]),
    linkedin_company: configuredActors("APIFY_LINKEDIN_COMPANY_ACTOR_ID", [
      "silentflow/linkedin-profiles-companies-scraper",
      "codescraper/linkedin-company-scraper",
      "thescrappa/linkedin-company-scraper",
      "freshdata/linkedin-company-scraper",
      "logical_scrapers/linkedin-company-scraper",
      "emastra/linkedin-company-scraper",
    ]),
    linkedin_profile: configuredActors("APIFY_LINKEDIN_PROFILE_ACTOR_ID", [
      "silentflow/linkedin-profiles-companies-scraper",
      "alwaysprimedev/linkedin-profile-scraper",
    ]),
  };

  return actorConfigs.flatMap((config) =>
    actorsByKey[config.key].map((actorId) => ({
      ...config,
      actorId,
      inputStrategy: config.key === "linkedin_profile" && isLinkedInProfileUrlActor(actorId) ? "linkedinProfileUrls" : config.inputStrategy,
    })),
  );
}

export function selectActor(parsedRequest: ParsedRequest) {
  const registry = getActorRegistry();

  if (parsedRequest.actorKey) {
    const byKey = registry.find((actor) => actor.key === parsedRequest.actorKey);
    if (byKey) return byKey;
  }

  if (parsedRequest.sourceType === "linkedin") {
    const wantsProfile =
      parsedRequest.intent === "contact_search" ||
      parsedRequest.intent === "ceo_search" ||
      parsedRequest.fields.some((field) => /contact|profile|title|linkedinProfile/i.test(field));

    return registry.find((actor) => actor.key === (wantsProfile ? "linkedin_profile" : "linkedin_company")) || registry[0];
  }

  return (
    registry.find((actor) => actor.sourceType === parsedRequest.sourceType) ||
    registry.find((actor) => actor.key === "google_maps_business") ||
    registry[0]
  );
}

function getStoreSearchTerms(parsedRequest: ParsedRequest, key: ActorKey) {
  const subject = parsedRequest.businessType || parsedRequest.companyType || "";

  if (key === "google_maps_business") {
    return [
      [subject, "google maps scraper"].filter(Boolean).join(" "),
      "google maps scraper",
      "google places scraper",
    ];
  }

  if (key === "linkedin_company") {
    return [
      [subject, "linkedin company scraper"].filter(Boolean).join(" "),
      "linkedin company scraper",
      "linkedin companies scraper",
    ];
  }

  if (key === "linkedin_profile") {
    return ["linkedin profile scraper", "linkedin people scraper", "linkedin contacts scraper"];
  }

  return ["linkedin scraper"];
}

function storeActorId(actor: ApifyStoreActor) {
  if (actor.username && actor.name) return `${actor.username}/${actor.name}`;
  return actor.id || null;
}

function scoreStoreActor(actor: ApifyStoreActor, key: ActorKey) {
  const text = `${actor.title || ""} ${actor.name || ""} ${actor.username || ""} ${actor.description || ""}`.toLowerCase();
  let score = actor.stats?.totalUsers30Days || 0;
  score += Math.min(actor.stats?.totalUsers || 0, 10000) / 100;
  score += Math.min(actor.stats?.totalRuns || 0, 100000) / 10000;

  if (actor.currentPricingInfo?.pricingModel === "FREE") score += 250;

  if (key === "google_maps_business") {
    if (!/(google|maps|places?)/.test(text)) return -1;
    if (/google\s*maps|places?/.test(text)) score += 500;
  }

  if (key === "linkedin_company") {
    if (!/linkedin/.test(text) || !/(compan|organization|business)/.test(text)) return -1;
    score += 500;
  }

  if (key === "linkedin_profile") {
    if (!/linkedin/.test(text) || !/(profile|people|person|contact|lead)/.test(text)) return -1;
    score += 500;
  }

  return score;
}

async function discoverStoreActors(parsedRequest: ParsedRequest, key: ActorKey): Promise<ActorConfig[]> {
  if (process.env.APIFY_ENABLE_STORE_DISCOVERY === "false") return [];

  const searchTerms = getStoreSearchTerms(parsedRequest, key);
  const discovered = new Map<string, { actor: ApifyStoreActor; score: number }>();

  for (const search of searchTerms) {
    const params = new URLSearchParams({
      search,
      limit: "8",
      sortBy: "popularity",
      responseFormat: "agent",
    });

    const result = await apifyFetch<{ data?: { items?: ApifyStoreActor[] } }>(`/store?${params.toString()}`);
    for (const actor of result.data?.items || []) {
      const actorId = storeActorId(actor);
      if (!actorId) continue;

      const score = scoreStoreActor(actor, key);
      if (score < 0) continue;

      const current = discovered.get(actorId);
      if (!current || current.score < score) discovered.set(actorId, { actor, score });
    }
  }

  return Array.from(discovered.entries())
    .sort((left, right) => right[1].score - left[1].score)
    .slice(0, 8)
    .filter(([, { actor }]) => !linkedInFreeOnly() || !isLinkedInKey(key) || actor.currentPricingInfo?.pricingModel === "FREE")
    .map(([actorId, { actor }]) => ({
      key,
      label: actor.title || labelForKey(key),
      sourceType: sourceTypeForKey(key),
      actorId,
      envName: "APIFY_STORE_DISCOVERY",
      dynamic: true,
      pricingModel: actor.currentPricingInfo?.pricingModel,
      inputStrategy: inputStrategyForKey(key),
    }));
}

async function isFreeActor(actor: ActorConfig) {
  if (!linkedInFreeOnly() || !isLinkedInKey(actor.key)) return true;
  if (actor.pricingModel) return actor.pricingModel === "FREE";

  try {
    const actorUrlId = toActorUrlId(actor.actorId);
    const result = await apifyFetch<{ data?: ApifyStoreActor }>(`/acts/${actorUrlId}`);
    return result.data?.currentPricingInfo?.pricingModel === "FREE";
  } catch (error) {
    console.error("Unable to verify actor pricing; skipping LinkedIn route in free-only mode", {
      actorKey: actor.key,
      actorId: actor.actorId,
      error,
    });
    return false;
  }
}

function toActorUrlId(actorId: string) {
  return actorId.trim().replace(/\//g, "~");
}

function getSearchResultsNeeded(parsedRequest: ParsedRequest) {
  if (parsedRequest.sourceType === "google_maps") {
    const overfetchMultiplier = parsedRequest.quantity >= 250 ? 2.5 : 1.75;
    return Math.min(Math.ceil(parsedRequest.quantity * overfetchMultiplier), 1500);
  }

  return Math.min(parsedRequest.quantity, 500);
}

function startUrlsFromParsed(parsedRequest: ParsedRequest) {
  return parsedRequest.targetUrls.map((url) => ({ url }));
}

function compactQuery(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function splitLocations(location: string) {
  return location
    .split(/\s+(?:and|or|&)\s+|;/i)
    .map((part) => compactQuery(part))
    .filter(Boolean);
}

function isBroadLocation(location: string) {
  const normalized = location.toLowerCase().replace(/\./g, "").trim();
  const usStateNames = new Set([
    "alabama",
    "alaska",
    "arizona",
    "arkansas",
    "california",
    "colorado",
    "connecticut",
    "delaware",
    "florida",
    "georgia",
    "hawaii",
    "idaho",
    "illinois",
    "indiana",
    "iowa",
    "kansas",
    "kentucky",
    "louisiana",
    "maine",
    "maryland",
    "massachusetts",
    "michigan",
    "minnesota",
    "mississippi",
    "missouri",
    "montana",
    "nebraska",
    "nevada",
    "new hampshire",
    "new jersey",
    "new mexico",
    "new york",
    "north carolina",
    "north dakota",
    "ohio",
    "oklahoma",
    "oregon",
    "pennsylvania",
    "rhode island",
    "south carolina",
    "south dakota",
    "tennessee",
    "texas",
    "utah",
    "vermont",
    "virginia",
    "washington",
    "west virginia",
    "wisconsin",
    "wyoming",
  ]);
  const usStateCodes = new Set(Object.values(STATE_CODE_LOOKUP));
  const countryTerms = /\b(usa|united states|united states of america|canada|uk|united kingdom|england|australia|india|pakistan|uae|united arab emirates|germany|france|spain|italy|mexico|brazil)\b/;

  return usStateNames.has(normalized) || usStateCodes.has(normalized) || countryTerms.test(normalized);
}

function googleMapsAreaSearches(subject: string, location: string) {
  const commonAreas = [
    "downtown",
    "north",
    "south",
    "east",
    "west",
    "central",
    "uptown",
    "midtown",
    "near airport",
  ];

  return commonAreas.map((area) => compactQuery(`${subject} in ${area} ${location}`));
}

function googleMapsSearchQueries(parsedRequest: ParsedRequest) {
  const subject = compactQuery(parsedRequest.businessType || parsedRequest.companyType || "businesses");
  const locations = parsedRequest.locations.length > 0 ? parsedRequest.locations : parsedRequest.location ? splitLocations(parsedRequest.location) : [];

  if (locations.length === 0) return [compactQuery(parsedRequest.searchQuery)];

  const queries = locations.flatMap((location) => {
    const baseQuery = compactQuery(`${subject} in ${location}`);
    if (parsedRequest.quantity <= 100 || isBroadLocation(location)) return [baseQuery];

    return [
      baseQuery,
      compactQuery(`${subject} near ${location}`),
      ...googleMapsAreaSearches(subject, location),
    ];
  });

  return Array.from(new Set(queries)).slice(0, parsedRequest.quantity >= 500 ? 28 : parsedRequest.quantity >= 250 ? 18 : 8);
}

export function buildActorInput(actor: ActorConfig, parsedRequest: ParsedRequest) {
  const maxResults = getSearchResultsNeeded(parsedRequest);

  if (actor.inputStrategy === "googleMaps") {
    const searchQueries = googleMapsSearchQueries(parsedRequest);
    const maxPerSearch = Math.max(parsedRequest.quantity >= 500 ? 75 : 50, Math.ceil(maxResults / searchQueries.length));

    return {
      searchStringsArray: searchQueries,
      searchStrings: searchQueries,
      searchTerms: searchQueries,
      query: parsedRequest.searchQuery,
      search: parsedRequest.searchQuery,
      maxCrawledPlacesPerSearch: maxPerSearch,
      maxItems: maxResults,
      maxResults,
      language: "en",
      includeReviews: false,
    };
  }

  if (actor.inputStrategy === "linkedinBulk") {
    const keywords = parsedRequest.targetUrls.length ? parsedRequest.targetUrls : [parsedRequest.searchQuery];
    const hasUrls = parsedRequest.targetUrls.length > 0;
    const location = parsedRequest.locations.length > 0 ? parsedRequest.locations : parsedRequest.location ? [parsedRequest.location] : [];

    if (isSilentFlowBulkActor(actor.actorId)) {
      return {
        action: actor.key === "linkedin_profile" ? "get-profiles" : "get-companies",
        keywords,
        isUrl: hasUrls,
        isName: false,
        limit: Math.min(maxResults, 100),
        fetchDetails: true,
        location,
        proxy: {
          useApifyProxy: true,
          apifyProxyGroups: ["RESIDENTIAL"],
        },
      };
    }

    return {
      action: actor.key === "linkedin_profile" ? "get-profiles" : "get-companies",
      keywords,
      isUrl: hasUrls,
      limit: Math.min(maxResults, 100),
      maxResults: Math.min(maxResults, 100),
      count: Math.min(maxResults, 100),
      query: parsedRequest.searchQuery,
      search: parsedRequest.searchQuery,
      ...(hasUrls ? { companyUrls: parsedRequest.targetUrls, urls: startUrlsFromParsed(parsedRequest) } : {}),
      location,
      fetchDetails: true,
    };
  }

  if (actor.inputStrategy === "linkedinProfileUrls") {
    return {
      profileUrls: parsedRequest.targetUrls,
      urls: startUrlsFromParsed(parsedRequest),
      maxResults: Math.min(maxResults, 100),
    };
  }

  throw new Error(`Unsupported actor input strategy: ${actor.inputStrategy}`);
}

async function apifyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${APIFY_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getApifyToken()}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let type: string | undefined;

    try {
      const parsed = JSON.parse(text);
      type = parsed?.error?.type;
    } catch {
      type = undefined;
    }

    throw new ApifyRequestError(`Apify request failed: ${response.status} ${text.slice(0, 240)}`, response.status, type);
  }

  return response.json() as Promise<T>;
}

export async function startActorRun(parsedRequest: ParsedRequest) {
  const preferredActor = selectActor(parsedRequest);
  const configuredCandidates = getActorRegistry().filter((actor) => actor.key === preferredActor.key);
  const storeCandidates =
    preferredActor.key === "linkedin_profile" && parsedRequest.targetUrls.length === 0
      ? []
      : await discoverStoreActors(parsedRequest, preferredActor.key);
  const unverifiedCandidates = [...configuredCandidates, ...storeCandidates].filter(
    (actor, index, list) => list.findIndex((candidate) => candidate.actorId === actor.actorId) === index,
  );
  const candidates: ActorConfig[] = [];

  for (const actor of unverifiedCandidates) {
    if (await isFreeActor(actor)) candidates.push(actor);
  }

  if (linkedInFreeOnly() && isLinkedInKey(preferredActor.key) && candidates.length === 0) {
    throw new ApifyRequestError("No free LinkedIn actor is configured or discoverable for this request.", 400, "no-free-linkedin-actor");
  }

  let lastError: unknown;
  const failedCandidates: string[] = [];

  for (const actor of candidates) {
    if (actor.inputStrategy === "linkedinProfileUrls" && parsedRequest.targetUrls.length === 0) continue;

    try {
      const input = buildActorInput(actor, parsedRequest);
      const actorUrlId = toActorUrlId(actor.actorId);
      const data = await apifyFetch<{ data: ApifyRun }>(`/acts/${actorUrlId}/runs`, {
        method: "POST",
        body: JSON.stringify(input),
      });

      return {
        actor,
        runId: data.data.id,
        datasetId: data.data.defaultDatasetId || null,
        status: data.data.status,
      };
    } catch (error) {
      lastError = error;
      failedCandidates.push(actor.actorId);

      const isRetryableInvalidInput = error instanceof ApifyRequestError && error.status === 400 && error.type === "invalid-input";

      if (!(error instanceof ApifyRequestError) || (![403, 404].includes(error.status) && !isRetryableInvalidInput)) {
        throw error;
      }

      console.error("Apify actor candidate failed; trying next compatible actor", {
        actorKey: actor.key,
        actorId: actor.actorId,
        dynamic: actor.dynamic === true,
        status: error.status,
        type: error.type,
      });
    }
  }

  if (
    lastError instanceof ApifyRequestError &&
    [400, 403, 404].includes(lastError.status) &&
    failedCandidates.length > 1
  ) {
    throw new ApifyRequestError(
      `All Apify actor candidates failed: ${failedCandidates.join(", ")}`,
      lastError.status,
      "all-actor-candidates-unavailable",
    );
  }

  throw lastError instanceof Error ? lastError : new Error("No compatible Apify actor could be started.");
}

export async function getRun(runId: string) {
  const data = await apifyFetch<{ data: ApifyRun }>(`/actor-runs/${runId}`);
  return data.data;
}

export async function getRunDatasetItems(runId: string) {
  return apifyFetch<unknown[]>(`/actor-runs/${runId}/dataset/items?clean=true`);
}
