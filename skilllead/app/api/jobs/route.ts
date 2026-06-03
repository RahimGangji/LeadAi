import { createAndStartJob, serializeJob } from "@/lib/server/jobs";
import { createJobBodySchema } from "@/lib/server/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = createJobBodySchema.parse(await request.json());

    if (body.parsedRequest.requiresFollowUp) {
      return Response.json(
        {
          error: "This request needs clarification before scraping can start.",
          parsedRequest: body.parsedRequest,
        },
        { status: 422 },
      );
    }

    const job = await createAndStartJob(body.prompt, body.parsedRequest);
    return Response.json(serializeJob(job));
  } catch (error) {
    console.error("Job creation failed", error);
    const message = "Unable to create the scraping job right now. Please check the server configuration and try again.";
    return Response.json({ error: message }, { status: 400 });
  }
}
