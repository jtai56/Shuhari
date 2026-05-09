import { buildFallbackAnalysis, type AnalysisResult, type UploadedProfile } from "@/lib/color-analysis";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

type AnalyzePayload = {
  photos?: string[];
  profile?: UploadedProfile;
};

type OpenAIChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

function normalizeProfile(profile?: UploadedProfile): UploadedProfile {
  return {
    name: profile?.name ?? "",
    styleGoal: profile?.styleGoal ?? "",
    jewelryTone: profile?.jewelryTone ?? "mixed",
    contrastLevel: profile?.contrastLevel ?? "balanced",
    makeupPreference: profile?.makeupPreference ?? "",
  };
}

function buildPrompt(profile: UploadedProfile) {
  return `
You are an expert Korean personal color consultant specializing in Asian and multicultural skin tone analysis.

Analyze the uploaded photos like a professional personal color draping session. Do not rely on race or ethnicity assumptions. Instead, observe visible color relationships: skin overtone, undertone signals, hair depth, brow depth, eye clarity, lip color, facial contrast, and how different color families would likely affect the face.

Important Asian color analysis guidance:
- Many Asian clients have yellow, golden, beige, or olive overtones, but that does not automatically mean they are warm-toned.
- Separate overtone from undertone. A yellow-looking surface tone may still harmonize best with cool rose, muted mauve, blue-red, or ash-brown colors.
- Watch for olive undertones, muted grayness, surface redness, sallowness, and hyperpigmentation when judging warmth/coolness.
- Prioritize facial effect: the best colors should make the skin look clearer, the lips healthier, the eyes brighter, dark circles softer, and facial contours more refined.
- Avoid simplistic rules like "gold jewelry means warm" or "dark hair means winter." Use jewelry preference only as supporting context.
- Account for photo uncertainty: lighting, makeup, filters, shadows, and camera white balance can distort undertone. State confidence level if uncertain.

Use a Korean personal color framework with 12-season or 16-season nuance. Determine:
1. Temperature: warm, cool, neutral-warm, neutral-cool, olive-neutral, or mixed.
2. Value: light, medium, deep.
3. Chroma: muted/soft, clear/bright, or balanced.
4. Contrast: low, medium, high.
5. Best seasonal family and subtype, such as Light Spring, Bright Spring, Soft Summer, True Summer, Soft Autumn, Deep Autumn, Bright Winter, Deep Winter, etc.

For the "season" field, choose the closest exact preset from this 12-season system:
- Light Spring: warm-neutral, light, clear-gentle, low-medium contrast; peach, cream, light aqua, honey beige.
- Warm Spring: warm, light-medium, clear, medium contrast; golden cream, coral, poppy, fresh leaf, camel.
- Bright Spring: warm-neutral, light-medium, bright-clear, medium-high contrast; clear coral, butter yellow, bright aqua, leaf green.
- Light Summer: cool-neutral, light, soft-clear, low contrast; powder pink, lavender mist, sky blue, seafoam, dove gray.
- Cool Summer: cool, light-medium, soft, medium contrast; rose pink, blue gray, cool mauve, soft navy.
- Soft Summer: cool-neutral, light-medium, muted-smoky, low-medium contrast; dusty rose, mauve taupe, sage gray, soft slate, mushroom. It is not yellow or bright.
- Soft Autumn: warm-neutral, medium, muted-earthy, low-medium contrast; sesame, clay rose, moss, warm taupe, cocoa.
- Warm Autumn: warm, medium-deep, rich-earthy, medium contrast; mustard, rust, olive, copper, chocolate.
- Deep Autumn: warm-neutral, deep, rich, medium-high contrast; espresso, forest olive, auburn, deep teal, antique gold.
- Bright Winter: cool-neutral, medium-deep, bright-clear, high contrast; icy pink, fuchsia, cobalt, emerald, black.
- Cool Winter: cool, medium-deep, clear, high contrast; blue red, royal blue, pine, plum, pure white.
- Deep Winter: cool-neutral, deep, clear-rich, high contrast; ink, black cherry, deep pine, cool espresso, mineral ivory.

Do not invent a season name. The archetype can be creative, but the season must be one of the exact presets above.

When recommending colors, favor a minimal Korean editorial style with earth tones where possible. However, do not force earth tones if they are unflattering. Adapt earth tones by temperature:
- Warm types: sesame beige, oat, camel, clay, terracotta, olive, moss, chestnut, espresso.
- Cool types: stone, mushroom, rose beige, mauve taupe, graphite, slate, pine, berry brown.
- Neutral or olive types: greige, lichen, muted cocoa, soft bark, tea brown, smoky olive.

Output practical guidance for:
- Best wardrobe colors.
- Best neutrals.
- Accent colors.
- Makeup base, blush, lips, and eyes.
- Hair color direction.
- Jewelry metals.
- Colors to avoid and why.
- Styling formulas for a clean Korean minimalist wardrobe.
- Shopping checklist.

Be specific and personalized. Mention how the recommended colors improve the user's face visually. Avoid generic beauty advice.

Client context:
- Client name: ${profile.name || "Unknown"}
- Style goal: ${profile.styleGoal || "Not provided"}
- Preferred jewelry tone: ${profile.jewelryTone}
- Contrast comfort: ${profile.contrastLevel}
- Makeup preference: ${profile.makeupPreference || "Not provided"}

Return valid JSON only. Do not use markdown. Match this schema exactly:
{
  "source": "ai",
  "confidence": "low" | "medium" | "high",
  "archetype": string,
  "season": string,
  "undertone": string,
  "overtone": string,
  "value": string,
  "chroma": string,
  "contrast": string,
  "summary": string,
  "photoCaveats": string[],
  "whyItWorks": string[],
  "palette": [
    { "name": string, "hex": string, "use": string, "why": string }
  ],
  "neutrals": string[],
  "accentColors": string[],
  "metals": string[],
  "avoid": string[],
  "makeup": {
    "base": string,
    "cheeks": string,
    "lips": string,
    "eyes": string
  },
  "hair": {
    "best": string[],
    "avoid": string[]
  },
  "stylingGuide": string[],
  "shoppingChecklist": string[]
}

Keep the result concise but specific: 5 palette colors, 3 to 4 bullets for most arrays, and short complete sentences.
`;
}

async function requestOpenAIAnalysis(
  photos: string[],
  profile: UploadedProfile,
): Promise<AnalysisResult | null> {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.OPEN_AI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const content = [
    {
      type: "text",
      text: buildPrompt(profile),
    },
    ...photos.map((photo) => ({
      type: "image_url",
      image_url: {
        url: photo,
      },
    })),
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.7,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content:
            "You are a precise personal color analyst. Return JSON only and never wrap it in markdown.",
        },
        {
          role: "user",
          content,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as OpenAIChatCompletionResponse;
  const rawContent = payload.choices?.[0]?.message?.content;

  if (!rawContent) {
    return null;
  }

  const parsed = JSON.parse(rawContent) as AnalysisResult;

  return {
    ...parsed,
    source: "ai",
  };
}

export async function POST(request: Request) {
  const limited = await rateLimitResponse(request, "analyze");
  if (limited) {
    return limited;
  }

  try {
    const body = (await request.json()) as AnalyzePayload;
    const photos = body.photos?.filter(Boolean) ?? [];
    const profile = normalizeProfile(body.profile);

    if (photos.length === 0) {
      return Response.json(
        { error: "Please upload at least one photo." },
        { status: 400 },
      );
    }

    try {
      const analysis = await requestOpenAIAnalysis(photos, profile);

      if (analysis) {
        return Response.json(analysis);
      }
    } catch {
      // Fall back to the local guide if the AI request fails.
    }

    return Response.json(buildFallbackAnalysis(profile, photos.length));
  } catch {
    return Response.json(
      { error: "Unable to process the analysis request." },
      { status: 400 },
    );
  }
}
