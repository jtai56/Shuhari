import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { rateLimitResponse } from "@/lib/rate-limit";

type LeadPayload = {
  event?: string;
  email?: string;
  name?: string;
  season?: string;
  source?: string;
};

export async function POST(request: Request) {
  const limited = await rateLimitResponse(request, "leads");
  if (limited) {
    return limited;
  }

  const body = (await request.json()) as LeadPayload;
  const lead = {
    event: body.event ?? "lead",
    email: body.email ?? "",
    name: body.name ?? "",
    season: body.season ?? "",
    source: body.source ?? "site",
    createdAt: new Date().toISOString(),
  };

  try {
    const dataDirectory = path.join(process.cwd(), "data");
    await mkdir(dataDirectory, { recursive: true });
    await appendFile(
      path.join(dataDirectory, "leads.jsonl"),
      `${JSON.stringify(lead)}\n`,
      "utf8",
    );
  } catch {
    console.info("Lead captured", lead);
  }

  return Response.json({ ok: true });
}
