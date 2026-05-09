import { Buffer } from "node:buffer";

export const runtime = "nodejs";

// The same prompt the user validated — produces clean B&W clothing mattes
const MASK_PROMPT = `Create a binary clothing matte.

White = editable clothing regions.
Black = protected regions.

Segment ONLY visible clothing fabric. Exclude: skin, hair, face, accessories, microphone, jewelry, background. Preserve: accurate garment contours, anti-aliased edges, hair-over-clothing boundaries, thin straps and folds.

The output must be a clean monochrome segmentation mask suitable for compositing and automated recoloring pipelines.`;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.OPEN_AI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OpenAI is not configured. Add OPENAI_API_KEY." },
      { status: 503 },
    );
  }

  let photo: string | undefined;
  try {
    const body = (await request.json()) as { photo?: string };
    photo = body.photo;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!photo) {
    return Response.json({ error: "photo is required." }, { status: 400 });
  }

  // Convert data URL → Blob for the multipart upload
  const commaIdx = photo.indexOf(",");
  const header = photo.slice(0, commaIdx);
  const base64Data = photo.slice(commaIdx + 1);
  const mimeType = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const buffer = Buffer.from(base64Data, "base64");
  const imageBlob = new Blob([buffer], { type: mimeType });

  const model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2";

  const formData = new FormData();
  formData.set("model", model);
  formData.set("image", imageBlob, "photo.png");
  formData.set("prompt", MASK_PROMPT);
  formData.set("size", "1024x1024");
  formData.set("response_format", "b64_json");

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text();
    return Response.json(
      { error: "Mask generation failed.", detail },
      { status: 502 },
    );
  }

  const data = (await response.json()) as {
    data?: Array<{ b64_json?: string }>;
  };

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    return Response.json(
      { error: "The model did not return a mask image." },
      { status: 502 },
    );
  }

  return Response.json({ mask: `data:image/png;base64,${b64}` });
}
