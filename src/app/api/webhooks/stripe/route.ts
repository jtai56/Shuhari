import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import Stripe from "stripe";

export const runtime = "nodejs";

async function recordCheckoutCompleted(session: Stripe.Checkout.Session, eventId: string) {
  const purchase = {
    event: "checkout.session.completed",
    eventId,
    sessionId: session.id,
    paymentStatus: session.payment_status,
    customer: typeof session.customer === "string" ? session.customer : null,
    customerEmail: session.customer_details?.email ?? session.customer_email ?? "",
    amountTotal: session.amount_total,
    currency: session.currency,
    metadata: session.metadata ?? {},
    createdAt: new Date().toISOString(),
  };

  try {
    const dataDirectory = path.join(process.cwd(), "data");
    await mkdir(dataDirectory, { recursive: true });
    await appendFile(
      path.join(dataDirectory, "stripe-checkout-events.jsonl"),
      `${JSON.stringify(purchase)}\n`,
      "utf8",
    );
  } catch {
    console.info("Checkout completed", purchase);
  }
}

export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    return Response.json(
      {
        error:
          "Stripe webhooks are not configured. Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.",
      },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Missing Stripe-Signature header." }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe webhook.";
    return Response.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    await recordCheckoutCompleted(event.data.object as Stripe.Checkout.Session, event.id);
  }

  return Response.json({ received: true });
}
