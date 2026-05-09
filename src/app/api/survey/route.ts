import { recordSurveyResponse } from "@/lib/metrics";
import { rateLimitResponse } from "@/lib/rate-limit";

type SurveyPayload = {
  wouldPay?: string;
  price?: string;
  source?: string;
};

const validWouldPay = new Set(["yes", "maybe", "no"]);

export async function POST(request: Request) {
  const limited = await rateLimitResponse(request, "survey");
  if (limited) {
    return limited;
  }

  let body: SurveyPayload;
  try {
    body = (await request.json()) as SurveyPayload;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const wouldPay = body.wouldPay?.trim().toLowerCase() ?? "";
  const price = body.price?.trim() ?? "";

  if (!validWouldPay.has(wouldPay)) {
    return Response.json(
      { error: "Please answer whether you would pay." },
      { status: 400 },
    );
  }

  if (!price) {
    return Response.json(
      { error: "Please share how much you would pay." },
      { status: 400 },
    );
  }

  await recordSurveyResponse({
    wouldPay,
    price,
    source: body.source ?? "landing_survey",
  });

  return Response.json({ ok: true });
}
