export type ScrapingIntent =
  | "local_business_search"
  | "company_search"
  | "contact_search"
  | "ceo_search"
  | "unknown";

export type SourceType = "google_maps" | "linkedin";

export type JobStatus =
  | "needs_clarification"
  | "queued"
  | "running"
  | "processing"
  | "ready"
  | "failed";

export type ParsedRequest = {
  intent: ScrapingIntent;
  sourceType: SourceType;
  businessType: string | null;
  companyType: string | null;
  location: string | null;
  locations: string[];
  quantity: number;
  source: string;
  fields: string[];
  requestedFields: string[];
  defaultFieldsUsed: boolean;
  outputFormat: "xlsx";
  searchQuery: string;
  targetUrls: string[];
  actorKey: string | null;
  requiresFollowUp: boolean;
  missingFields: string[];
  followUpQuestions: string[];
  confidence: number;
};

export type DataRecord = Record<string, string | number | boolean | null | undefined>;

export type GeneratedFile = {
  id: string;
  jobId: string;
  filename: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  expiresAt: string;
};

export type ScrapingJob = {
  id: string;
  originalPrompt: string;
  parsedRequest: ParsedRequest;
  status: JobStatus;
  selectedActorKey: string | null;
  apifyActorId: string | null;
  apifyRunId: string | null;
  apifyDatasetId: string | null;
  resultCount: number | null;
  requestedCount: number;
  shortageReason: string | null;
  fileId: string | null;
  downloadUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  expiresAt: string;
};
