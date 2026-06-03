import type { DataRecord, ParsedRequest, SourceType } from "@/lib/types";

function cleanString(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => `${item}`.trim()).filter(Boolean).join(", ");
  return typeof value === "string" ? value.trim() : value === null || value === undefined ? undefined : `${value}`.trim();
}

function normalizeUrl(value: unknown) {
  const url = cleanString(value);
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  if (/^(www\.|[a-z0-9-]+\.[a-z]{2,})/i.test(url)) return `https://${url}`;
  return url;
}

function normalizePhone(value: unknown) {
  const phone = cleanString(value);
  if (!phone) return undefined;
  return phone.replace(/\s+/g, " ");
}

function normalizeEmail(value: unknown) {
  const email = cleanString(value);
  if (!email) return undefined;

  const matches = email.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
  return matches ? Array.from(new Set(matches.map((item) => item.toLowerCase()))).join(", ") : undefined;
}

function numberLike(value: unknown) {
  if (typeof value === "number") return value;
  const text = cleanString(value);
  if (!text) return undefined;
  const parsed = Number(text.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : text;
}

function firstValue(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && `${value}`.trim() !== "") return value;
  }
  return undefined;
}

function domainFromUrl(url?: string | number | boolean | null) {
  if (!url || typeof url !== "string") return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

function normalizedText(value: unknown) {
  return cleanString(value)?.toLowerCase().replace(/\s+/g, " ").trim() || "";
}

const STATE_NAME_TO_CODE: Record<string, string> = {
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

const COUNTRY_ALIASES: Record<string, string> = {
  usa: "united states",
  us: "united states",
  "u.s.": "united states",
  "u.s.a.": "united states",
  "united states of america": "united states",
  uk: "united kingdom",
  uae: "united arab emirates",
};

const COUNTRY_NAMES = new Set([
  "australia",
  "brazil",
  "canada",
  "france",
  "germany",
  "india",
  "italy",
  "mexico",
  "pakistan",
  "spain",
  "united arab emirates",
  "united kingdom",
  "united states",
]);

function normalizeState(value: unknown) {
  const text = normalizedText(value).replace(/\./g, "");
  if (!text) return "";
  if (STATE_NAME_TO_CODE[text]) return STATE_NAME_TO_CODE[text];
  return text.length === 2 ? text : "";
}

function normalizeCountry(value: unknown) {
  const text = normalizedText(value);
  if (!text) return "";
  const aliased = COUNTRY_ALIASES[text] || text;
  return COUNTRY_NAMES.has(aliased) ? aliased : "";
}

function splitLocations(location: string) {
  return location
    .split(/\s+(?:and|or|&)\s+|;/i)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function cityKey(value: unknown) {
  return normalizedText(value).replace(/[^a-z0-9]/g, "");
}

function editDistanceAtMostOne(left: string, right: string) {
  if (Math.abs(left.length - right.length) > 1) return false;

  let edits = 0;
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;

    if (left.length > right.length) leftIndex += 1;
    else if (right.length > left.length) rightIndex += 1;
    else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }

  return true;
}

function cityMatches(targetCity: string, value: unknown) {
  const target = cityKey(targetCity);
  const candidate = cityKey(value);
  if (!target || !candidate) return false;
  if (target === candidate) return true;
  return target.length >= 6 && candidate.length >= 6 && editDistanceAtMostOne(target, candidate);
}

function requestedLocationPart(location: string) {
  const text = cleanString(location)?.replace(/\s+/g, " ").trim() || "";
  if (!text) return null;

  const normalized = normalizedText(text).replace(/\./g, "");
  const stateOnly = normalizeState(normalized);
  const countryOnly = normalizeCountry(normalized);

  if (stateOnly && (STATE_NAME_TO_CODE[normalized] || normalized.length === 2)) return { city: "", state: stateOnly, country: "" };
  if (countryOnly && !text.includes(",")) return { city: "", state: "", country: countryOnly };

  const parts = text.split(",").map((part) => part.trim()).filter(Boolean);
  const city = normalizedText(parts[0]);
  const state = parts.length > 1 ? normalizeState(parts[1]) : "";
  const country = parts.length > 2 ? normalizeCountry(parts[2]) : parts.length === 2 && !state ? normalizeCountry(parts[1]) : "";

  if (!city && !state && !country) return null;
  return { city, state, country };
}

function requestedLocations(location: string | null) {
  const text = cleanString(location)?.replace(/\s+/g, " ").trim() || "";
  if (!text) return [];
  return splitLocations(text)
    .map(requestedLocationPart)
    .filter((locationPart): locationPart is { city: string; state: string; country: string } => Boolean(locationPart));
}

function parsedRequestLocations(parsedRequest: ParsedRequest) {
  const rawLocations = parsedRequest.locations.length > 0 ? parsedRequest.locations : parsedRequest.location ? splitLocations(parsedRequest.location) : [];
  return rawLocations
    .map(requestedLocationPart)
    .filter((locationPart): locationPart is { city: string; state: string; country: string } => Boolean(locationPart));
}

function addressState(address: unknown) {
  const text = normalizedText(address);
  const match = text.match(/,\s*([a-z]{2})\s*(?:\d{5})?(?:,|\s|$)/i);
  return match ? normalizeState(match[1]) : "";
}

function matchesRequestedGoogleMapsLocation(record: DataRecord, parsedRequest: ParsedRequest) {
  if (parsedRequest.sourceType !== "google_maps") return true;

  const targets = parsedRequestLocations(parsedRequest);
  if (targets.length === 0) return true;

  const recordCity = normalizedText(record.city);
  const recordState = normalizeState(record.state) || addressState(record.address);
  const recordCountry = normalizeCountry(record.country);
  const address = normalizedText(record.address);

  return targets.some((target) => {
    if (target.country && recordCountry && recordCountry !== target.country) return false;
    if (target.state && recordState && recordState !== target.state) return false;
    if (target.city && !target.state && !target.country) return true;
    if (!target.city) return true;
    if (recordCity && cityMatches(target.city, recordCity)) return true;
    if (!recordCity && address) {
      const addressParts = address.split(",").map((part) => part.trim());
      return addressParts.some((part) => cityMatches(target.city, part));
    }
    return false;
  });
}

function dedupeKey(record: DataRecord, sourceType: SourceType) {
  if (sourceType === "linkedin") {
    return (record.linkedinProfileUrl || record.linkedinCompanyUrl || `${record.contactName || ""}|${record.companyName || ""}`).toString().toLowerCase();
  }

  return [
    record.googleMapsUrl,
    domainFromUrl(record.website),
    `${record.businessName || ""}|${record.phone || ""}`,
    `${record.businessName || ""}|${record.address || ""}`,
  ]
    .find((part) => part && part.toString().replace("|", "").trim().length > 2)
    ?.toString()
    .toLowerCase();
}

function cleanGoogleMapsRecord(source: Record<string, unknown>): DataRecord {
  return {
    businessName: cleanString(firstValue(source, ["title", "name", "businessName", "companyName"])),
    category: cleanString(firstValue(source, ["categoryName", "category", "categories"])),
    phone: normalizePhone(firstValue(source, ["phone", "phoneNumber", "contactPhone"])),
    email: normalizeEmail(firstValue(source, ["email", "emailAddress", "emails", "contactEmail"])),
    website: normalizeUrl(firstValue(source, ["website", "url", "site"])),
    address: cleanString(firstValue(source, ["address", "street", "fullAddress"])),
    city: cleanString(firstValue(source, ["city"])),
    state: cleanString(firstValue(source, ["state", "region"])),
    country: cleanString(firstValue(source, ["country"])),
    rating: numberLike(firstValue(source, ["totalScore", "rating", "stars"])),
    reviewsCount: numberLike(firstValue(source, ["reviewsCount", "reviewCount", "reviews"])),
    googleMapsUrl: normalizeUrl(firstValue(source, ["url", "googleMapsUrl", "placeUrl"])),
    source: "Google Maps",
  };
}

function cleanLinkedInRecord(source: Record<string, unknown>): DataRecord {
  const profile = typeof source.profile === "object" && source.profile ? (source.profile as Record<string, unknown>) : source;

  return {
    companyName: cleanString(firstValue(profile, ["companyName", "company", "name", "currentCompany", "company_name"])),
    linkedinCompanyUrl: normalizeUrl(firstValue(profile, ["companyLinkedin", "companyLinkedIn", "linkedinCompanyUrl", "companyUrl"])),
    contactName: cleanString(firstValue(profile, ["fullName", "name", "contactName"])),
    title: cleanString(firstValue(profile, ["title", "headline", "occupation", "currentPosition"])),
    linkedinProfileUrl: normalizeUrl(firstValue(profile, ["linkedinProfileUrl", "profileUrl", "url", "linkedinUrl"])),
    website: normalizeUrl(firstValue(profile, ["website", "companyWebsite"])),
    industry: cleanString(firstValue(profile, ["industry", "companyIndustry"])),
    companySize: cleanString(firstValue(profile, ["companySize", "size"])),
    employeeCount: numberLike(firstValue(profile, ["employeeCount", "employees", "staffCount"])),
    headquarters: cleanString(firstValue(profile, ["headquarters", "hq", "addressWithCountry"])),
    location: cleanString(firstValue(profile, ["location", "addressWithCountry", "addressWithoutCountry"])),
    email: normalizeEmail(firstValue(profile, ["email", "emails", "contactEmail"])),
    source: "LinkedIn",
  };
}

function cleanRecordBySource(item: unknown, sourceType: SourceType) {
  if (!item || typeof item !== "object") return null;
  const source = item as Record<string, unknown>;

  if (sourceType === "linkedin") return cleanLinkedInRecord(source);
  return cleanGoogleMapsRecord(source);
}

function hasUsefulValue(record: DataRecord) {
  return Object.entries(record).some(([key, value]) => key !== "source" && value !== undefined && value !== null && `${value}`.trim() !== "");
}

export function cleanRecords(items: unknown[], parsedRequest: ParsedRequest) {
  const seen = new Set<string>();
  const unique: DataRecord[] = [];
  let locationFilteredCount = 0;

  for (const item of items) {
    const record = cleanRecordBySource(item, parsedRequest.sourceType);
    if (!record || !hasUsefulValue(record)) continue;

    if (!matchesRequestedGoogleMapsLocation(record, parsedRequest)) {
      locationFilteredCount += 1;
      continue;
    }

    const key = dedupeKey(record, parsedRequest.sourceType);
    if (key && seen.has(key)) continue;

    if (key) seen.add(key);
    unique.push(record);
  }

  const records = unique.slice(0, parsedRequest.quantity);
  const shortageReason =
    records.length < parsedRequest.quantity
      ? parsedRequest.sourceType === "google_maps"
        ? `The data source returned ${items.length} Google Maps rows; ${locationFilteredCount} rows were outside the requested location and removed; ${unique.length} unique records remained after cleaning and deduplication, so ${records.length} records were exported. Google Maps does not expose a complete city-wide business directory for one search, and only returns places visible through the submitted search windows. For stricter city filtering, include state or country in the prompt.`
        : `The data source returned ${items.length} rows; ${unique.length} unique records remained after cleaning and deduplication, so ${records.length} records were exported. The selected source may have a result cap, a smaller available dataset, or stricter limits for this search.`
      : null;

  return {
    records,
    totalUniqueCount: unique.length,
    shortageReason,
  };
}
