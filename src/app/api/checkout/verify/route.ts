import Stripe from "stripe";
import { createHmac } from "node:crypto";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

const ENTITLEMENT_COOKIE = "shuhari_entitlement";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

function signSession(sessionId: string, secret: string) {
  const signature = createHmac("sha256", secret)
    .update(sessionId)
    .digest("base64url");

  return `${sessionId}.${signature}`;
}

export async function POST(request: Request) {
  const limited = await rateLimitResponse(request, "checkout-verify");
  if (limited) {
    return limited;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    return Response.json(
      { error: "Stripe is not configured." },
      { status: 503 },
    );
  }

  let sessionId: string | undefined;

  try {
    const body = (await request.json()) as { sessionId?: string };
    sessionId = body.sessionId;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!sessionId || !sessionId.startsWith("cs_")) {
    return Response.json({ error: "Invalid checkout session." }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  const isPaid =
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required";

  if (!isPaid || session.metadata?.product !== "full-color-guide") {
    return Response.json({ unlocked: false }, { status: 403 });
  }

  const response = Response.json({ unlocked: true });
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  response.headers.set(
    "Set-Cookie",
    `${ENTITLEMENT_COOKIE}=${signSession(session.id, stripeSecretKey)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${THIRTY_DAYS}${secure}`,
  );

  return response;
}
