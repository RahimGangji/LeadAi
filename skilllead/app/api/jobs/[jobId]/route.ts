import { getJob, refreshJob, serializeJob } from "@/lib/server/jobs";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params;
  const job = getJob(jobId);

  if (!job) {
    return Response.json({ error: "Job not found." }, { status: 404 });
  }

  const refreshed = await refreshJob(job);
  return Response.json(serializeJob(refreshed));
}
