import { rateLimitResponse } from "@/lib/rate-limit";

type CheckoutPayload = {
  email?: string;
  name?: string;
  season?: string;
};

const STRIPE_MANAGED_PAYMENTS_VERSION = "2026-02-25.preview";
const DEFAULT_PRODUCT_NAME = "Shuhari Personal Color Guide";
const DEFAULT_PRODUCT_DESCRIPTION = "Full personal color analysis and AI clothing try-on guide.";
const DEFAULT_TAX_CODE = "txcd_10103100";

function getBaseUrl(request: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL is required in production.");
  }

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(request: Request) {
  const limited = await rateLimitResponse(request, "checkout");
  if (limited) {
    return limited;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    return Response.json(
      {
        error:
          "Stripe is not configured yet. Add STRIPE_SECRET_KEY to .env and restart the dev server.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json()) as CheckoutPayload;
  let baseUrl: string;
  try {
    baseUrl = getBaseUrl(request);
  } catch {
    return Response.json(
      { error: "Checkout is missing the production site URL configuration." },
      { status: 503 },
    );
  }
  const params = new URLSearchParams();

  params.set("mode", "payment");
  params.set("success_url", `${baseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${baseUrl}/?checkout=cancelled`);
  params.set("allow_promotion_codes", "true");
  params.set("managed_payments[enabled]", "true");
  params.set("metadata[product]", "full-color-guide");
  params.set("metadata[season]", body.season ?? "unknown");
  params.set("metadata[name]", body.name ?? "");

  if (body.email) {
    params.set("customer_email", body.email);
    params.set("metadata[email]", body.email);
  }

  if (process.env.STRIPE_PRICE_ID) {
    params.set("line_items[0][price]", process.env.STRIPE_PRICE_ID);
    params.set("line_items[0][quantity]", "1");
  } else {
    params.set("line_items[0][price_data][currency]", "usd");
    params.set("line_items[0][price_data][unit_amount]", "500");
    params.set("line_items[0][price_data][product_data][name]", DEFAULT_PRODUCT_NAME);
    params.set("line_items[0][price_data][product_data][description]", DEFAULT_PRODUCT_DESCRIPTION);
    params.set("line_items[0][price_data][product_data][tax_code]", DEFAULT_TAX_CODE);
    params.set("line_items[0][quantity]", "1");
  }

  const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": STRIPE_MANAGED_PAYMENTS_VERSION,
    },
    body: params,
  });

  if (!stripeResponse.ok) {
    const errorText = await stripeResponse.text();
    console.error("Stripe checkout error", errorText);

    return Response.json(
      {
        error:
          "Stripe rejected the checkout request. Check STRIPE_SECRET_KEY and STRIPE_PRICE_ID.",
      },
      { status: 500 },
    );
  }

  const session = (await stripeResponse.json()) as { url?: string };

  if (!session.url) {
    return Response.json(
      { error: "Stripe did not return a checkout URL." },
      { status: 500 },
    );
  }

  return Response.json({ url: session.url });
}
