import { parsePromptWithCerebras } from "@/lib/server/ai";
import { parseRequestBodySchema } from "@/lib/server/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = parseRequestBodySchema.parse(await request.json());
    const parsedRequest = await parsePromptWithCerebras(body.prompt);

    return Response.json({ parsedRequest });
  } catch (error) {
    console.error("Request parsing failed", error);
    const message = "Request parsing is not available right now. Please check the server configuration and try again.";
    return Response.json({ error: message }, { status: 400 });
  }
}
