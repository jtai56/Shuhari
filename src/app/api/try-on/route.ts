import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";
import Stripe from "stripe";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

const ENTITLEMENT_COOKIE = "shuhari_entitlement";
const isDemoBypassEnabled =
  process.env.NEXT_PUBLIC_DEMO_BYPASS_PAYWALL === "true";

function getCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const cookie = cookies.find((item) => item.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

function verifySignedSession(token: string | null, secret: string) {
  if (!token) return null;

  const dotIndex = token.lastIndexOf(".");
  if (dotIndex <= 0) return null;

  const sessionId = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  if (!sessionId.startsWith("cs_")) return null;

  const expected = createHmac("sha256", secret)
    .update(sessionId)
    .digest("base64url");

  const givenBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (givenBuffer.length !== expectedBuffer.length) return null;

  return timingSafeEqual(givenBuffer, expectedBuffer) ? sessionId : null;
}

async function verifyPaidSession(request: Request) {
  if (process.env.NODE_ENV !== "production" || isDemoBypassEnabled) {
    return true;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return false;
  }

  const sessionId = verifySignedSession(
    getCookie(request, ENTITLEMENT_COOKIE),
    stripeSecretKey,
  );

  if (!sessionId) return false;

  const stripe = new Stripe(stripeSecretKey);
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  return (
    session.metadata?.product === "full-color-guide" &&
    (session.payment_status === "paid" ||
      session.payment_status === "no_payment_required")
  );
}

function buildPrompt(colorName: string, colorHex: string): string {
  return (
    `Change only the shirt or top to the color ${colorName} (${colorHex}). ` +
    `Keep everything else identical: the person's face, hair, skin tone, hands, background, and all accessories. ` +
    `Preserve all fabric texture, shadows, wrinkles, folds, and lighting. ` +
    `The result must look like a real photograph of the same person wearing a ${colorName} shirt.`
  );
}

export async function POST(request: Request) {
  const limited = await rateLimitResponse(request, "try-on");
  if (limited) {
    return limited;
  }

  const apiKey = process.env.OPENAI_API_KEY ?? process.env.OPEN_AI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OpenAI API key not configured." },
      { status: 503 },
    );
  }

  let photo: string | undefined;
  let color: { name: string; hex: string } | undefined;

  try {
    const body = (await request.json()) as {
      photo?: string;
      color?: { name: string; hex: string };
    };
    photo = body.photo;
    color = body.color;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!photo || !color) {
    return Response.json(
      { error: "photo and color are required." },
      { status: 400 },
    );
  }

  if (!(await verifyPaidSession(request))) {
    return Response.json(
      { error: "Outfit color preview generation requires a verified purchase." },
      { status: 403 },
    );
  }

  const commaIdx = photo.indexOf(",");
  const base64Data = photo.slice(commaIdx + 1);
  const mimeType = photo.slice(5, commaIdx).split(";")[0] ?? "image/png";
  const buffer = Buffer.from(base64Data, "base64");

  if (buffer.byteLength > 4 * 1024 * 1024) {
    return Response.json(
      { error: "Photo too large (max 4 MB). Resize before sending." },
      { status: 400 },
    );
  }

  const imageBlob = new Blob([buffer], { type: mimeType });

  const formData = new FormData();
  formData.set("model", "gpt-image-2");
  formData.set("image", imageBlob, "photo.png");
  formData.set("prompt", buildPrompt(color.name, color.hex));
  formData.set("size", "1024x1024");

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errBody = (await response.json()) as {
        error?: { message?: string };
      };
      detail = errBody.error?.message ?? JSON.stringify(errBody);
    } catch {
      detail = await response.text().catch(() => detail);
    }
    return Response.json(
      { error: `OpenAI rejected the request: ${detail}` },
      { status: 502 },
    );
  }

  const data = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };

  const item = data.data?.[0];
  if (!item) {
    return Response.json(
      { error: "OpenAI did not return an image." },
      { status: 502 },
    );
  }

  if (item.b64_json) {
    return Response.json({ image: `data:image/png;base64,${item.b64_json}` });
  }

  if (!item.url) {
    return Response.json(
      { error: "OpenAI response contained no image data." },
      { status: 502 },
    );
  }

  const imageRes = await fetch(item.url);
  if (!imageRes.ok) {
    return Response.json(
      { error: `Could not fetch generated image: HTTP ${imageRes.status}` },
      { status: 502 },
    );
  }

  const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
  const image = `data:image/png;base64,${imageBuffer.toString("base64")}`;

  return Response.json({ image });
}
