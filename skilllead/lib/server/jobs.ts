import type { GeneratedFile, ParsedRequest, ScrapingJob } from "@/lib/types";
import { getApifyUserMessage, getRun, getRunDatasetItems, startActorRun } from "./apify";
import { cleanRecords } from "./data";
import { createExcelFile } from "./files";

type JobStore = {
  jobs: Map<string, ScrapingJob>;
  files: Map<string, GeneratedFile>;
};

const globalForJobs = globalThis as typeof globalThis & {
  skillLeadStore?: JobStore;
};

export const store =
  globalForJobs.skillLeadStore ||
  (globalForJobs.skillLeadStore = {
    jobs: new Map<string, ScrapingJob>(),
    files: new Map<string, GeneratedFile>(),
  });

function now() {
  return new Date().toISOString();
}

function expiresAt() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

export function serializeJob(job: ScrapingJob) {
  return {
    jobId: job.id,
    status: job.status,
    parsedRequest: job.parsedRequest,
    resultCount: job.resultCount,
    requestedCount: job.requestedCount,
    shortageReason: job.shortageReason,
    downloadUrl: job.downloadUrl,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
  };
}

export function getJob(jobId: string) {
  return store.jobs.get(jobId) || null;
}

export function getFile(fileId: string) {
  return store.files.get(fileId) || null;
}

export async function createAndStartJob(originalPrompt: string, parsedRequest: ParsedRequest) {
  const id = crypto.randomUUID();
  const createdAt = now();
  const job: ScrapingJob = {
    id,
    originalPrompt,
    parsedRequest,
    status: "queued",
    selectedActorKey: "google_maps_business_search",
    apifyActorId: null,
    apifyRunId: null,
    apifyDatasetId: null,
    resultCount: null,
    requestedCount: parsedRequest.quantity,
    shortageReason: null,
    fileId: null,
    downloadUrl: null,
    errorMessage: null,
    createdAt,
    updatedAt: createdAt,
    completedAt: null,
    expiresAt: expiresAt(),
  };

  store.jobs.set(id, job);

  try {
    const run = await startActorRun(parsedRequest);
    job.selectedActorKey = run.actor.key;
    job.apifyActorId = run.actor.actorId;
    job.apifyRunId = run.runId;
    job.apifyDatasetId = run.datasetId;
    job.status = "running";
    job.updatedAt = now();
  } catch (error) {
    console.error("Apify job start failed", error);
    job.status = "failed";
    job.errorMessage =
      getApifyUserMessage(error) ||
      "Unable to start the data collection job right now. Please check the selected source and try again.";
    job.updatedAt = now();
  }

  return job;
}

export async function refreshJob(job: ScrapingJob) {
  if (!job.apifyRunId || job.status === "ready" || job.status === "failed") {
    return job;
  }

  try {
    const run = await getRun(job.apifyRunId);
    job.apifyDatasetId = run.defaultDatasetId || job.apifyDatasetId;

    if (["FAILED", "ABORTED", "TIMED-OUT"].includes(run.status)) {
      console.error("Apify run ended unsuccessfully", {
        runId: job.apifyRunId,
        status: run.status,
        statusMessage: run.statusMessage,
      });
      job.status = "failed";
      job.errorMessage = "The scraping job could not be completed. Please try again or reduce the number of records.";
      job.updatedAt = now();
      return job;
    }

    if (run.status !== "SUCCEEDED") {
      job.status = "running";
      job.updatedAt = now();
      return job;
    }

    job.status = "processing";
    job.updatedAt = now();

    const items = await getRunDatasetItems(job.apifyRunId);
    const result = cleanRecords(items, job.parsedRequest);
    const records = result.records;
    const file = await createExcelFile(job.id, job.parsedRequest, records);

    store.files.set(file.id, file);
    job.status = "ready";
    job.resultCount = records.length;
    job.shortageReason = result.shortageReason;
    job.fileId = file.id;
    job.downloadUrl = `/api/files/${file.id}/download`;
    job.completedAt = now();
    job.updatedAt = job.completedAt;
  } catch (error) {
    console.error("Job refresh failed", error);
    job.status = "failed";
    job.errorMessage = "Unable to update this scraping job right now. Please try again shortly.";
    job.updatedAt = now();
  }

  return job;
}
