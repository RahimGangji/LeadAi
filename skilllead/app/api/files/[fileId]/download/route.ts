import fs from "node:fs/promises";
import { getFile } from "@/lib/server/jobs";
import { fileExists } from "@/lib/server/files";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await context.params;
  const file = getFile(fileId);

  if (!file) {
    return Response.json({ error: "File not found." }, { status: 404 });
  }

  if (new Date(file.expiresAt).getTime() < Date.now()) {
    return Response.json({ error: "File has expired." }, { status: 410 });
  }

  if (!(await fileExists(file.path))) {
    return Response.json({ error: "File is no longer available." }, { status: 404 });
  }

  const buffer = await fs.readFile(file.path);

  return new Response(buffer, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.sizeBytes),
      "Content-Disposition": `attachment; filename="${file.filename}"`,
    },
  });
}
