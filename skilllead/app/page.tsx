"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Database,
  Download,
  FileSpreadsheet,
  Loader2,
  MapPin,
  Play,
  Search,
} from "lucide-react";
import type { ParsedRequest } from "@/lib/types";

type JobResponse = {
  jobId: string;
  status: "needs_clarification" | "queued" | "running" | "processing" | "ready" | "failed";
  parsedRequest: ParsedRequest;
  resultCount: number | null;
  requestedCount: number;
  shortageReason: string | null;
  downloadUrl: string | null;
  errorMessage: string | null;
};

const examples = [
  "Find 25 dental clinics in Austin from Google Maps",
  "Find 100 restaurants in Dallas, TX from Google Maps with phone and website",
  "Find 50 coffee shops in Dallas from Google Maps with phone and website",
];

const statusLabels: Record<JobResponse["status"], string> = {
  needs_clarification: "Needs clarification",
  queued: "Queued",
  running: "Scraping",
  processing: "Preparing Excel",
  ready: "Ready",
  failed: "Failed",
};

function FieldPill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">{children}</span>;
}

function StatusBadge({ status }: { status: JobResponse["status"] }) {
  const ready = status === "ready";
  const failed = status === "failed";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${
        ready
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : failed
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-slate-200 bg-slate-50 text-slate-700"
      }`}
    >
      {ready ? <CheckCircle2 size={14} /> : failed ? <AlertCircle size={14} /> : <Loader2 className="animate-spin" size={14} />}
      {statusLabels[status]}
    </span>
  );
}

export default function Home() {
  const [prompt, setPrompt] = useState(examples[0]);
  const [parsedRequest, setParsedRequest] = useState<ParsedRequest | null>(null);
  const [job, setJob] = useState<JobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const isBusy = isParsing || isStarting || job?.status === "queued" || job?.status === "running" || job?.status === "processing";

  const requestSummary = useMemo(() => {
    if (!parsedRequest) return [];

    return [
      { label: "Source", value: parsedRequest.source },
      { label: "Location", value: parsedRequest.locations.length > 0 ? parsedRequest.locations.join(", ") : parsedRequest.location || "Not set" },
      { label: "Quantity", value: parsedRequest.quantity.toString() },
      { label: "Target", value: parsedRequest.businessType || parsedRequest.companyType || parsedRequest.searchQuery || "Not set" },
    ];
  }, [parsedRequest]);

  async function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setJob(null);
    setParsedRequest(null);
    setIsParsing(true);

    try {
      const response = await fetch("/api/requests/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to parse the request.");

      setParsedRequest(data.parsedRequest);

      if (!data.parsedRequest.requiresFollowUp) {
        await startJob(data.parsedRequest);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to parse the request.");
    } finally {
      setIsParsing(false);
    }
  }

  async function startJob(requestToStart = parsedRequest) {
    if (!requestToStart) return;

    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, parsedRequest: requestToStart }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to start the scraping job.");

      setJob(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start the scraping job.");
    } finally {
      setIsStarting(false);
    }
  }

  useEffect(() => {
    if (!job || job.status === "ready" || job.status === "failed") return;

    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/jobs/${job.jobId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to refresh job status.");
        setJob(data);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to refresh job status.");
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, [job]);

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">SkillLead</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
              Google Maps data to Excel
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Database size={17} />
            Smart source routing
          </div>
        </header>

        <section className="grid flex-1 gap-6 py-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(380px,0.65fr)]">
          <div className="space-y-6">
            <form onSubmit={submitPrompt} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <label htmlFor="prompt" className="text-base font-semibold text-slate-950">
                    Describe the data you need
                  </label>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                    Include target, location, quantity, and fields. The system turns Google Maps results into a clean Excel file.
                  </p>
                </div>
                <Search className="mt-1 text-slate-400" size={22} />
              </div>

              <textarea
                id="prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className="mt-5 min-h-36 w-full resize-none rounded-lg border border-slate-300 bg-white px-4 py-3 text-base leading-7 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                placeholder="Give me 100 plumbers in Texas"
              />

              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {examples.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setPrompt(example)}
                      className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                    >
                      {example}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={isBusy || prompt.trim().length < 8}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto sm:min-w-40"
                >
                  {isParsing ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
                  Parse and run
                </button>
              </div>
            </form>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}

            <section className="grid gap-4 md:grid-cols-3">
              {[
                ["1", "Understand", "AI extracts category, location, quantity, fields, and source."],
                ["2", "Collect", "The selected source returns structured results for your request."],
                ["3", "Export", "The app cleans duplicates and generates a downloadable Excel file."],
              ].map(([step, title, body]) => (
                <div key={step} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-sm font-semibold text-emerald-700">
                    {step}
                  </div>
                  <h2 className="mt-4 text-sm font-semibold text-slate-950">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                </div>
              ))}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Request details</h2>
                  <p className="mt-1 text-sm text-slate-600">Validated structure before scraping starts.</p>
                </div>
                <ClipboardList className="text-slate-400" size={21} />
              </div>

              {parsedRequest ? (
                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {requestSummary.map((item) => (
                      <div key={item.label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-medium uppercase text-slate-500">{item.label}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase text-slate-500">Fields</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {parsedRequest.defaultFieldsUsed ? "Default fields selected for this source." : "Fields selected from your prompt."}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {parsedRequest.fields.map((field) => (
                        <FieldPill key={field}>{field}</FieldPill>
                      ))}
                    </div>
                  </div>

                  {parsedRequest.requiresFollowUp ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      <p className="font-semibold">More detail needed</p>
                      <ul className="mt-2 list-inside list-disc space-y-1">
                        {parsedRequest.followUpQuestions.map((question) => (
                          <li key={question}>{question}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                  Parsed request details will appear here after you submit a prompt.
                </div>
              )}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Job status</h2>
                  <p className="mt-1 text-sm text-slate-600">Progress updates poll the backend every five seconds.</p>
                </div>
                {job ? <StatusBadge status={job.status} /> : <MapPin className="text-slate-400" size={21} />}
              </div>

              {job ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium uppercase text-slate-500">Job ID</p>
                    <p className="mt-1 break-all text-sm font-semibold text-slate-950">{job.jobId}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-medium uppercase text-slate-500">Rows exported</p>
                      <p className="mt-1 text-xl font-semibold text-slate-950">{job.resultCount ?? "-"}</p>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-medium uppercase text-slate-500">Requested</p>
                      <p className="mt-1 text-xl font-semibold text-slate-950">{job.requestedCount}</p>
                    </div>
                  </div>

                  {job.shortageReason ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{job.shortageReason}</div>
                  ) : null}

                  {job.errorMessage ? (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{job.errorMessage}</div>
                  ) : null}

                  {job.downloadUrl ? (
                    <a
                      href={job.downloadUrl}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
                    >
                      <Download size={18} />
                      Download Excel file
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                      <FileSpreadsheet size={18} />
                      Excel download appears here after processing.
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                  No scraping job has started yet.
                </div>
              )}
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
