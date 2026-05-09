"use client";

import { toJpeg } from "html-to-image";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

// ─── Color math (shared by InteractiveTryOn) ──────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h, s, l];
}

// ─── Interactive Outfit Color Preview ─────────────────────────────────────────

type TryOnEntry =
  | { status: "pending" }
  | { status: "loading" }
  | { status: "done"; dataUrl: string }
  | { status: "error"; msg?: string };

function InteractiveTryOn({
  photo,
  palette,
  isUnlocked,
}: {
  photo: string;
  palette: ReadonlyArray<{ name: string; hex: string; use: string }>;
  isUnlocked: boolean;
}) {
  const [entries, setEntries] = useState<Record<string, TryOnEntry>>(
    () => Object.fromEntries(palette.map((c) => [c.hex, { status: "pending" }])),
  );
  const hasTriggered = useRef(false);
  const [framedPhoto, setFramedPhoto] = useState<string | null>(null);
  const [expandedTryOn, setExpandedTryOn] = useState<{
    colorName: string;
    dataUrl: string;
  } | null>(null);

  // Frame the photo into a square canvas without distortion. This keeps the
  // whole uploaded image visible for gpt-image-2 while matching its square output.
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const size = 1024;
      const oc = document.createElement("canvas");
      oc.width = size;
      oc.height = size;
      const ctx = oc.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#f7f1ea";
      ctx.fillRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const scale = Math.min(size / img.naturalWidth, size / img.naturalHeight);
      const width = img.naturalWidth * scale;
      const height = img.naturalHeight * scale;
      const x = (size - width) / 2;
      const y = (size - height) / 2;
      ctx.drawImage(img, x, y, width, height);

      setFramedPhoto(oc.toDataURL("image/png"));
    };
    img.src = photo;
  }, [photo]);

  // Fire all outfit preview requests concurrently as soon as the paywall is cleared
  useEffect(() => {
    if (!isUnlocked || !framedPhoto || hasTriggered.current) return;
    hasTriggered.current = true;

    palette.forEach((color) => {
      setEntries((prev) => ({ ...prev, [color.hex]: { status: "loading" } }));

      fetch("/api/try-on", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: framedPhoto, color }),
      })
        .then((r) => r.json())
        .then((body: { image?: string; error?: string }) => {
          if (body.image) {
            setEntries((prev) => ({
              ...prev,
              [color.hex]: { status: "done", dataUrl: body.image! },
            }));
          } else {
            throw new Error(body.error ?? "No image returned.");
          }
        })
        .catch((err: unknown) => {
          setEntries((prev) => ({
            ...prev,
            [color.hex]: {
              status: "error",
              msg: err instanceof Error ? err.message : undefined,
            },
          }));
        });
    });
  }, [isUnlocked, framedPhoto, palette]);

  const doneCount = Object.values(entries).filter((e) => e.status === "done").length;
  const totalCount = palette.length;

  return (
    <div className="space-y-4">
      {/* Progress hint while generating */}
      {isUnlocked && doneCount < totalCount ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[0.6rem] uppercase tracking-[0.22em] text-[var(--muted)]">
            Generating {doneCount}/{totalCount} looks…
          </p>
          <p className="text-[0.65rem] text-[var(--muted)]">
            Each look appears as soon as it finishes.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {palette.map((color) => {
          const entry = entries[color.hex] ?? { status: "pending" };
          return (
            <div key={color.hex} className="space-y-2">
              <div className="aspect-square overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-[var(--panel)]">
                {entry.status === "done" ? (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedTryOn({
                        colorName: color.name,
                        dataUrl: entry.dataUrl,
                      })
                    }
                    className="h-full w-full cursor-zoom-in"
                    aria-label={`Expand outfit color preview for ${color.name}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.dataUrl}
                      alt={`You in ${color.name}`}
                      className="h-full w-full object-contain"
                    />
                  </button>
                ) : entry.status === "loading" ? (
                  <div
                    className="flex h-full w-full flex-col items-center justify-center gap-3"
                    style={{ backgroundColor: `${color.hex}22` }}
                  >
                    <div
                      className="h-10 w-10 rounded-full border-2 border-white/60 shadow-sm"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--ink)]/30 [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--ink)]/30 [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--ink)]/30 [animation-delay:240ms]" />
                    </div>
                  </div>
                ) : entry.status === "error" ? (
                  <div
                    className="flex h-full w-full items-center justify-center"
                    style={{ backgroundColor: `${color.hex}11` }}
                  >
                    <p className="text-center text-[0.55rem] uppercase tracking-wide text-[var(--muted)]">
                      Could not generate
                    </p>
                  </div>
                ) : (
                  /* pending — only shown before unlock (blurred by parent) */
                  <div
                    className="h-full w-full"
                    style={{ backgroundColor: `${color.hex}33` }}
                  />
                )}
              </div>
              <p className="text-xs font-medium text-[var(--ink)]">{color.name}</p>
              <p className="text-[0.6rem] leading-4 text-[var(--muted)]">{color.use}</p>
            </div>
          );
        })}
      </div>

      {expandedTryOn ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/75 p-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${expandedTryOn.colorName} outfit color preview`}
          onClick={() => setExpandedTryOn(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/20 bg-[var(--paper)] shadow-[0_30px_120px_rgba(0,0,0,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  Color preview
                </p>
                <h3 className="mt-1 font-serif-kor text-2xl text-[var(--ink)]">
                  {expandedTryOn.colorName}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={expandedTryOn.dataUrl}
                  download={`${expandedTryOn.colorName.toLowerCase().replaceAll(" ", "-")}-color-preview.png`}
                  className="rounded-full bg-[var(--ink)] px-4 py-2 text-xs uppercase tracking-[0.16em] text-[var(--paper)] transition hover:bg-[#57473c]"
                >
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => setExpandedTryOn(null)}
                  className="rounded-full border border-[var(--line-strong)] px-4 py-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)] transition hover:text-[var(--ink)]"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="max-h-[76vh] bg-white/45 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={expandedTryOn.dataUrl}
                alt={`Expanded outfit color preview for ${expandedTryOn.colorName}`}
                className="mx-auto max-h-[72vh] w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Color Wheel ─────────────────────────────────────────────────────────────

function ColorWheel({
  palette,
}: {
  palette: ReadonlyArray<{ name: string; hex: string }>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const SIZE = 260;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const outerR = SIZE / 2 - 4;
    const innerR = outerR * 0.52;

    // Draw hue segments
    for (let i = 0; i < 360; i++) {
      const a0 = ((i - 90) * Math.PI) / 180;
      const a1 = ((i + 1 - 90) * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, a0, a1);
      ctx.closePath();
      ctx.fillStyle = `hsl(${i},65%,58%)`;
      ctx.fill();
    }

    // Punch inner hole
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    // Inner fill
    ctx.beginPath();
    ctx.arc(cx, cy, innerR - 1, 0, Math.PI * 2);
    ctx.fillStyle = "#f7f3ef";
    ctx.fill();

    // Plot palette dots
    palette.forEach(({ hex, name }) => {
      const [r, g, b] = hexToRgb(hex);
      const [h] = rgbToHsl(r, g, b);
      const angle = h * Math.PI * 2 - Math.PI / 2;
      const dotR = innerR + (outerR - innerR) * 0.5;
      const dx = cx + Math.cos(angle) * dotR;
      const dy = cy + Math.sin(angle) * dotR;

      ctx.beginPath();
      ctx.arc(dx, dy, 9, 0, Math.PI * 2);
      ctx.fillStyle = hex;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Short name label
      const short = name.split(" ").pop() ?? name;
      const labelR = innerR + (outerR - innerR) * 0.5 + 22;
      const lx = cx + Math.cos(angle) * labelR;
      const ly = cy + Math.sin(angle) * labelR;
      ctx.font = "bold 9px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#3D3027";
      ctx.fillText(short.slice(0, 8), lx, ly);
    });
  }, [palette]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 260, height: 260 }}
      className="rounded-full"
    />
  );
}

// ─── Personal Color Card ──────────────────────────────────────────────────────

function ColorSwatch({ hex, label }: { hex: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="h-12 w-12 rounded-full border border-black/8 shadow-sm"
        style={{ backgroundColor: hex }}
      />
      <p className="text-center text-[0.55rem] uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </p>
    </div>
  );
}

function SwatchRow({
  label,
  colors,
}: {
  label: string;
  colors: string[];
}) {
  const GENERIC_HEX: Record<string, string> = {
    oatmeal: "#DDD3BF", camel: "#C4A882", mushroom: "#9E8A7A",
    espresso: "#4A3728", "soft espresso": "#6A4E3D", greige: "#C4B49A",
    almond: "#DDD2C4", "tea brown": "#8A7465", "soft bark": "#5E5047",
    graphite: "#6F6768", ink: "#243137", "cool espresso": "#3D2E2A",
    "mineral ivory": "#E7E0D8", silver: "#C0C0C0", "soft pewter": "#B0B4B8",
    "white gold": "#E8E0D0", "antique gold": "#C9A84C", bronze: "#CD7F32",
    "dark brass": "#8A7248", "champagne gold": "#D4AF7A", "soft silver": "#C8CCCC",
    "mixed metal": "#B0A898", "brushed gold": "#D4A84B", "warm tortoiseshell": "#8B5E3C",
    gunmetal: "#6F7378", platinum: "#E8E8E0", "dark olive": "#4A5240",
    "bronzed brown": "#8B6940", "warm charcoal": "#4A4440",
    "cool taupe": "#9A9090", "smoky navy": "#3A4A5A", "soft stone": "#A89E96",
    "mushroom gray": "#9A9088", "muted terracotta": "#C47A5A", eucalyptus: "#7A9E8A",
    "tea rose": "#C48E8E", "muted rose": "#B08080", "lichen green": "#8A9080",
    "smoky cocoa": "#7A6858", "aubergine brown": "#6A3A4A", "oxidized teal": "#3A7A7A",
    "burnt paprika": "#C45A3A", "dusty berry": "#8A6878", "sage gray": "#8A9888",
    "muted denim": "#6A7A9A", "berry wine": "#7A3A5A", "forest teal": "#2A5A5A",
    "cool pine": "#3A5A4A",
  };

  const toHex = (name: string) => {
    const lower = name.toLowerCase().trim();
    if (lower.match(/^#[0-9a-f]{6}$/i)) return lower;
    return GENERIC_HEX[lower] ?? "#C0B8B0";
  };

  return (
    <div className="space-y-1.5">
      <p className="text-[0.55rem] uppercase tracking-[0.24em] text-[var(--muted)]">{label}</p>
      <div className="flex gap-1.5 flex-wrap">
        {colors.map((c) => (
          <div
            key={c}
            title={c}
            className="h-7 w-7 rounded-full border border-black/8 shadow-sm"
            style={{ backgroundColor: toHex(c) }}
          />
        ))}
      </div>
    </div>
  );
}

const NECKLINES: Record<string, string[]> = {
  "Soft Autumn": ["Scoop Neck", "V-Neck", "Boat Neck"],
  "Deep Autumn": ["V-Neck", "Square Neck", "Collared"],
  "Soft Summer": ["Round Neck", "Scoop Neck", "Off-Shoulder"],
  "Deep Winter": ["Boat Neck", "Square Neck", "Collared"],
  "Muted Neutral": ["V-Neck", "Scoop Neck", "Wrap"],
};

const ACCESSORIES: Record<string, string[]> = {
  "Soft Autumn": ["Brushed Gold", "Amber", "Warm Pearl"],
  "Deep Autumn": ["Antique Gold", "Tortoiseshell", "Bronze"],
  "Soft Summer": ["Silver", "Pearl", "Soft Rose Quartz"],
  "Deep Winter": ["Silver", "Gunmetal", "Onyx"],
  "Muted Neutral": ["Mixed Metal", "Champagne Gold", "Greige Stone"],
};

async function exportElementAsJpg(elementId: string, fileName: string) {
  const node = document.getElementById(elementId);
  if (!node) return;

  try {
    await document.fonts.ready;
    await Promise.all(
      Array.from(node.querySelectorAll<HTMLImageElement>("img")).map(
        (image) =>
          image.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                image.addEventListener("load", () => resolve(), { once: true });
                image.addEventListener("error", () => resolve(), { once: true });
              }),
      ),
    );

    const ignored = Array.from(
      node.querySelectorAll<HTMLElement>(".export-ignore"),
    );
    const previousDisplay = ignored.map((element) => element.style.display);
    let dataUrl = "";

    try {
      ignored.forEach((element) => {
        element.style.display = "none";
      });

      dataUrl = await toJpeg(node, {
        quality: 0.94,
        pixelRatio: 2,
        backgroundColor: "#ece3d8",
        cacheBust: true,
      });
    } finally {
      ignored.forEach((element, index) => {
        element.style.display = previousDisplay[index] ?? "";
      });
    }

    const link = document.createElement("a");
    link.download = fileName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    console.error("JPG export failed", err);
    alert("Could not save the JPG. Please try again after the card finishes loading.");
  }
}

function PersonalColorCard({
  result,
  palette,
}: {
  result: AnalysisResult;
  palette: ReadonlyArray<{ name: string; hex: string; use: string }>;
}) {
  const season = result.season;
  const keywords = [result.undertone, result.value, result.chroma]
    .map((s) => s.split(" ")[0])
    .join(" · ")
    .toUpperCase();

  const necklines = NECKLINES[season] ?? ["V-Neck", "Scoop Neck", "Boat Neck"];
  const accessories = ACCESSORIES[season] ?? ["Silver", "Gold", "Pearl"];

  const MAKEUP_APPROX: Record<string, string> = {
    lips: result.makeup.lips.toLowerCase().includes("rose")
      ? "#B06070"
      : result.makeup.lips.toLowerCase().includes("berry") ||
          result.makeup.lips.toLowerCase().includes("plum")
        ? "#7A3A5A"
        : result.makeup.lips.toLowerCase().includes("brick") ||
            result.makeup.lips.toLowerCase().includes("mahogany")
          ? "#8B4A38"
          : result.makeup.lips.toLowerCase().includes("nude") ||
              result.makeup.lips.toLowerCase().includes("beige")
            ? "#C4906A"
            : "#B07878",
    eyes: result.makeup.eyes.toLowerCase().includes("olive")
      ? "#7A7A44"
      : result.makeup.eyes.toLowerCase().includes("taupe")
        ? "#9A8878"
        : result.makeup.eyes.toLowerCase().includes("charcoal")
          ? "#4A4848"
          : "#7A6858",
  };

  return (
    <div
      id="personal-color-card"
      className="font-sans overflow-hidden rounded-[2rem] border border-[var(--line)] bg-white/80 p-6 shadow-sm sm:p-8"
    >
      {/* Header */}
      <div className="mb-6 text-center">
        <p className="text-[0.6rem] uppercase tracking-[0.38em] text-[var(--muted)]">
          Personal Color Analysis
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[var(--muted)]/70">
          {keywords}
        </p>
      </div>

      {/* Best colors grid + wheel */}
      <div className="grid gap-8 md:grid-cols-[1fr_auto]">
        <div>
          <p className="mb-3 text-[0.6rem] uppercase tracking-[0.28em] text-[var(--muted)]">
            Best Colors
          </p>
          <div className="flex flex-wrap gap-4">
            {palette.map((c) => (
              <ColorSwatch key={c.hex} hex={c.hex} label={c.name} />
            ))}
          </div>

          {/* Less compatible — avoids, shown without strikethrough */}
          <p className="mb-2 mt-6 text-[0.6rem] uppercase tracking-[0.28em] text-[var(--muted)]">
            Less compatible
          </p>
          <div className="flex flex-wrap gap-2">
            {result.avoid.map((a) => (
              <span
                key={a}
                className="rounded-full border border-[var(--line)] bg-white/60 px-3 py-1 text-xs leading-5 text-[var(--muted)]"
              >
                {a}
              </span>
            ))}
          </div>
        </div>

        {/* Color Wheel */}
        <div className="flex flex-col items-center gap-2">
          <ColorWheel palette={palette} />
          <p className="text-[0.55rem] uppercase tracking-[0.2em] text-[var(--muted)]">
            Hue Territory
          </p>
        </div>
      </div>

      {/* Bottom 4-column card */}
      <div className="mt-8 grid gap-5 border-t border-[var(--line)] pt-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Color Palette */}
        <div className="space-y-4">
          <p className="text-[0.6rem] uppercase tracking-[0.28em] text-[var(--muted)]">
            Color Palette
          </p>
          <SwatchRow label="Neutrals" colors={[...result.neutrals]} />
          <SwatchRow label="Accents" colors={[...result.accentColors]} />
          <SwatchRow label="Metals" colors={[...result.metals]} />
        </div>

        {/* Best Necklines */}
        <div className="space-y-3">
          <p className="text-[0.6rem] uppercase tracking-[0.28em] text-[var(--muted)]">
            Best Necklines
          </p>
          {necklines.map((n) => (
            <p key={n} className="text-sm font-sans leading-6 text-[var(--ink)]">
              {n}
            </p>
          ))}
        </div>

        {/* Best Accessories */}
        <div className="space-y-3">
          <p className="text-[0.6rem] uppercase tracking-[0.28em] text-[var(--muted)]">
            Best Accessories
          </p>
          {accessories.map((a) => (
            <p key={a} className="text-sm font-sans leading-6 text-[var(--ink)]">
              {a}
            </p>
          ))}
        </div>

        {/* Hair & Makeup */}
        <div className="space-y-3">
          <p className="text-[0.6rem] uppercase tracking-[0.28em] text-[var(--muted)]">
            Hair &amp; Makeup
          </p>
          <div className="space-y-2">
            <p className="text-[0.6rem] uppercase tracking-[0.18em] text-[var(--muted)]">
              Hair
            </p>
            {result.hair.best.slice(0, 2).map((h) => (
              <p key={h} className="text-xs font-sans leading-5 text-[var(--ink)]">
                {h}
              </p>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className="h-7 w-7 rounded-full border border-black/8"
                style={{ backgroundColor: MAKEUP_APPROX.lips }}
              />
              <p className="text-[0.5rem] uppercase tracking-wide text-[var(--muted)]">
                Lips
              </p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div
                className="h-7 w-7 rounded-full border border-black/8"
                style={{ backgroundColor: MAKEUP_APPROX.eyes }}
              />
              <p className="text-[0.5rem] uppercase tracking-wide text-[var(--muted)]">
                Eyes
              </p>
            </div>
          </div>
          <p className="text-[0.65rem] leading-5 text-[var(--muted)] italic">
            {result.makeup.lips.split(",")[0]}
          </p>
        </div>
      </div>
    </div>
  );
}

import type { AnalysisResult, UploadedProfile } from "@/lib/color-analysis";
import { getSeasonPreset, seasonPresets } from "@/lib/season-presets";

type UploadedPhoto = {
  id: string;
  name: string;
  preview: string;
  file: File;
  dataUrl?: string;
};

type AppStage = "landing" | "loading" | "slides" | "summary";

const STORAGE_RESULT_KEY = "shuhari:lastResult";
const STORAGE_UNLOCKED_KEY = "shuhari:unlocked";

const initialProfile: UploadedProfile = {
  name: "",
  styleGoal: "",
  jewelryTone: "mixed",
  contrastLevel: "balanced",
  makeupPreference: "",
};

const landingSwatches = ["#D3BEA3", "#B27D72", "#7B8575", "#8B796B", "#3D3027"];
const landingHighlights = [
  {
    title: "Undertone read",
    description: "Warm, cool, olive, or neutral signals without guessing by skin depth.",
  },
  {
    title: "Face contrast",
    description: "How light, dark, soft, or clear colors change your overall presence.",
  },
  {
    title: "Wearable palette",
    description: "A focused set of colors for clothes, makeup, hair, and jewelry.",
  },
];
const isDevelopment = process.env.NODE_ENV !== "production";
const isPaywallBypassEnabled =
  isDevelopment || process.env.NEXT_PUBLIC_DEMO_BYPASS_PAYWALL === "true";
type AnalyticsEventParams = Record<string, string | number | boolean | undefined>;

function trackAnalyticsEvent(
  eventName: string,
  params: AnalyticsEventParams = {},
) {
  if (typeof window === "undefined") {
    return;
  }

  const analyticsWindow = window as Window & {
    gtag?: (command: "event", eventName: string, params?: AnalyticsEventParams) => void;
  };

  analyticsWindow.gtag?.("event", eventName, params);
}

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read image."));
    };

    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });
}

function DetailPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-[var(--line)] bg-white/55 px-4 py-2 text-sm text-[var(--muted)]">
      <span className="text-[var(--ink)]">{label}</span> {value}
    </div>
  );
}

function TheoryBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/55 p-5">
      <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-3 text-lg text-[var(--ink)]">{value}</p>
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  children,
  className,
  isLocked = false,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  className?: string;
  isLocked?: boolean;
}) {
  return (
    <section className={`snap-center rounded-[2.25rem] border border-[var(--line)] bg-white/70 p-7 shadow-[0_30px_90px_rgba(72,53,41,0.08)] sm:p-10${className ? ` ${className}` : ""}`}>
      <p className="text-xs uppercase tracking-[0.34em] text-[var(--muted)]">
        {eyebrow}
      </p>
      <h2 className="mt-4 max-w-3xl font-serif-kor text-4xl leading-tight text-[var(--ink)] sm:text-6xl">
        {title}
      </h2>
      <div
        className={
          isLocked
            ? "mt-8 pointer-events-none select-none opacity-45 blur-[6px]"
            : "mt-8"
        }
        aria-hidden={isLocked}
      >
        {children}
      </div>
    </section>
  );
}

function FaceEffectStory({
  result,
  preset,
}: {
  result: AnalysisResult;
  preset: NonNullable<ReturnType<typeof getSeasonPreset>>;
}) {
  const signals = [
    { label: "Temperature", value: preset.temperature, color: preset.palette[0]?.hex },
    { label: "Value", value: preset.value, color: preset.palette[1]?.hex },
    { label: "Chroma", value: preset.chroma, color: preset.palette[2]?.hex },
    { label: "Contrast", value: preset.contrast, color: preset.palette[3]?.hex },
  ].filter((item) => item.value);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <div
        className="relative min-h-80 overflow-hidden rounded-[2rem] border border-[var(--line)] p-6"
        style={{
          background:
            `radial-gradient(circle at 24% 18%, ${preset.palette[0]?.hex ?? "#d8c8bb"}55, transparent 24%), ` +
            `radial-gradient(circle at 78% 24%, ${preset.palette[1]?.hex ?? "#b7aaa0"}50, transparent 26%), ` +
            `linear-gradient(145deg, #fffaf6, ${preset.appBackground})`,
        }}
      >
        <p className="text-[0.6rem] uppercase tracking-[0.28em] text-[var(--muted)]">
          Face Harmony Scan
        </p>
        <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 bg-white/45 shadow-[0_30px_90px_rgba(61,48,39,0.12)] backdrop-blur-sm" />
        <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--line)] bg-[var(--paper)]/75" />

        {preset.palette.slice(0, 5).map((color, index) => {
          const angle = (index / 5) * Math.PI * 2 - Math.PI / 2;
          const radius = 120;
          return (
            <div
              key={color.hex}
              className="absolute h-12 w-12 rounded-full border-4 border-white shadow-[0_14px_34px_rgba(61,48,39,0.16)]"
              style={{
                backgroundColor: color.hex,
                left: `calc(50% + ${Math.cos(angle) * radius}px - 1.5rem)`,
                top: `calc(50% + ${Math.sin(angle) * radius}px - 1.5rem)`,
              }}
              title={color.name}
            />
          );
        })}

        <div className="absolute inset-x-6 bottom-6 rounded-[1.4rem] border border-white/70 bg-white/65 p-4 backdrop-blur">
          <p className="text-sm leading-6 text-[var(--ink)]">
            These colors sit close enough to your natural depth and softness to
            brighten the face without competing with it.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-4">
          {signals.map((signal) => (
            <div
              key={signal.label}
              className="rounded-[1.35rem] border border-[var(--line)] bg-white/65 p-4"
            >
              <div
                className="mb-3 h-2 rounded-full"
                style={{ backgroundColor: signal.color }}
              />
              <p className="text-[0.55rem] uppercase tracking-[0.2em] text-[var(--muted)]">
                {signal.label}
              </p>
              <p className="mt-2 text-sm leading-5 text-[var(--ink)]">
                {signal.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {result.whyItWorks.slice(0, 4).map((item, index) => (
            <div
              key={item}
              className="group rounded-[1.6rem] border border-[var(--line)] bg-white/65 p-5 transition hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-[0_18px_50px_rgba(61,48,39,0.08)]"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--paper)] text-xs text-[var(--muted)]">
                  0{index + 1}
                </span>
                <span
                  className="h-px flex-1"
                  style={{ backgroundColor: preset.palette[index % preset.palette.length]?.hex }}
                />
              </div>
              <p className="text-sm leading-7 text-[var(--ink)]">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BottleLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-2xl text-center">
        <div className="mx-auto flex h-[25rem] w-44 items-end justify-center rounded-b-[4rem] rounded-t-[2rem] border-[10px] border-[var(--ink)]/15 bg-white/35 p-4 shadow-[inset_0_0_35px_rgba(61,48,39,0.08)]">
          <div className="water-bottle relative h-full w-full overflow-hidden rounded-b-[3rem] rounded-t-[1.2rem] bg-[#efe5d8]">
            <div className="water-fill" />
            <div className="water-shine" />
          </div>
        </div>
        <p className="mt-10 text-xs uppercase tracking-[0.34em] text-[var(--muted)]">
          Mixing your palette
        </p>
        <h1 className="mx-auto mt-4 max-w-xl font-serif-kor text-4xl leading-tight text-[var(--ink)]">
          Reading undertone, depth, softness, and facial contrast.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[var(--muted)]">
          Your photos are being compared against seasonal color signals, then
          distilled into a short guide you can actually use.
        </p>
      </div>
    </div>
  );
}

function LockedPreview({
  season,
  onUnlock,
  onDevUnlock,
  loading,
}: {
  season: string;
  onUnlock: () => void;
  onDevUnlock: () => void;
  loading: boolean;
}) {
  return (
    <div className="sticky top-6 z-10 mb-8 rounded-[2rem] border border-[var(--line-strong)] bg-[var(--paper)]/95 p-6 text-center shadow-[0_24px_80px_rgba(72,53,41,0.16)] backdrop-blur">
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
        Free preview ready
      </p>
      <p className="mt-3 font-serif-kor text-5xl leading-none text-[var(--ink)]">
        {season}
      </p>
      <h2 className="mx-auto mt-3 max-w-2xl font-serif-kor text-3xl leading-tight text-[var(--ink)]">
        Unlock the full guide for the detailed report, beauty direction, and
        outfit color previews.
      </h2>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onUnlock}
          className="rounded-full bg-[var(--ink)] px-7 py-3 text-sm uppercase tracking-[0.18em] text-[var(--paper)] transition hover:bg-[#57473c]"
        >
          {loading ? "Opening checkout..." : "Unlock full guide $5"}
        </button>
        {isPaywallBypassEnabled ? (
          <button
            type="button"
            onClick={onDevUnlock}
            className="rounded-full border border-[var(--line-strong)] bg-white/75 px-7 py-3 text-sm uppercase tracking-[0.18em] text-[var(--ink)] transition hover:bg-white"
          >
            Demo bypass
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ColorAnalysisStudio() {
  const [profile, setProfile] = useState<UploadedProfile>(initialProfile);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [stage, setStage] = useState<AppStage>("landing");
  const [error, setError] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [surveyWouldPay, setSurveyWouldPay] = useState("yes");
  const [surveyPrice, setSurveyPrice] = useState("");
  const [surveyStatus, setSurveyStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const heroPhoto = photos[0]?.dataUrl ?? photos[0]?.preview;
  const canSubmit = photos.length > 0;
  const activePreset = useMemo(
    () => (result ? getSeasonPreset(result.season) : null),
    [result],
  );
  const topPalette = useMemo(
    () => activePreset?.palette.slice(0, 5) ?? result?.palette.slice(0, 5) ?? [],
    [activePreset, result],
  );
  const keyDetails = useMemo(() => {
    if (!result || !activePreset) {
      return [];
    }

    return [
      { label: "Season", value: activePreset.season },
      { label: "Temperature", value: activePreset.temperature },
      { label: "Value", value: activePreset.value },
      { label: "Chroma", value: activePreset.chroma },
      { label: "Contrast", value: activePreset.contrast },
    ];
  }, [activePreset, result]);

  useEffect(() => {
    void fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "page_view",
        source: "landing",
      }),
    });

    const savedResultRaw = window.localStorage.getItem(STORAGE_RESULT_KEY);
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("checkout");
    const sessionId = params.get("session_id");

    let savedParsed: AnalysisResult | null = null;
    if (savedResultRaw) {
      try {
        savedParsed = JSON.parse(savedResultRaw) as AnalysisResult;
      } catch {
        window.localStorage.removeItem(STORAGE_RESULT_KEY);
      }
    }

    if (checkoutStatus === "success") {
      void (async () => {
        try {
          if (!sessionId) {
            throw new Error("Missing checkout session.");
          }

          const verifyResponse = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });

          if (!verifyResponse.ok) {
            throw new Error("Checkout could not be verified.");
          }

          await verifyResponse.json();
          window.localStorage.setItem(STORAGE_UNLOCKED_KEY, "true");
          if (savedParsed) {
            setResult(savedParsed);
          }
          setIsUnlocked(true);
          setStage("slides");
          trackAnalyticsEvent("guide_unlocked", {
            season: savedParsed?.season ?? "",
            source: "stripe_checkout",
            value: 5,
            currency: "USD",
          });
        } catch {
          window.localStorage.removeItem(STORAGE_UNLOCKED_KEY);
          setIsUnlocked(false);
          if (savedParsed) {
            setResult(savedParsed);
            setStage("slides");
          } else {
            setStage("landing");
          }
          setError("We could not verify that checkout completed. Please try again.");
        } finally {
          window.history.replaceState({}, "", "/");
        }
      })();
      return;
    }

    if (checkoutStatus === "cancelled") {
      queueMicrotask(() => {
        if (savedParsed) {
          setResult(savedParsed);
          setStage("slides");
        } else {
          setStage("landing");
        }
        setError("Checkout was cancelled. Your free preview is still saved.");
        window.history.replaceState({}, "", "/");
      });
      return;
    }

    const hasSavedUnlock =
      isPaywallBypassEnabled ||
      window.localStorage.getItem(STORAGE_UNLOCKED_KEY) === "true";

    if (hasSavedUnlock || savedParsed) {
      queueMicrotask(() => {
        if (hasSavedUnlock) {
          setIsUnlocked(true);
        }
        if (savedParsed) {
          setResult(savedParsed);
          setStage("slides");
        }
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      photos.forEach((photo) => {
        if (photo.preview.startsWith("blob:")) {
          URL.revokeObjectURL(photo.preview);
        }
      });
    };
  }, [photos]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, 3);

    if (files.length === 0) {
      return;
    }

    const nextPhotos = files.map((file, index) => ({
      id: `${file.name}-${index}-${Date.now()}`,
      name: file.name,
      preview: URL.createObjectURL(file),
      file,
    }));

    setPhotos(nextPhotos);
    setError(null);
    trackAnalyticsEvent("photos_uploaded", {
      photo_count: nextPhotos.length,
      source: "analysis_form",
    });
  }

  async function handleSubmit() {
    if (!canSubmit) {
      setError("Upload at least one photo first.");
      return;
    }

    setStage("loading");
    setError(null);

    try {
      const encodedPhotos = await Promise.all(
        photos.map(async (photo) => photo.dataUrl ?? (await fileToDataUrl(photo.file))),
      );
      setPhotos((current) =>
        current.map((photo, index) => ({
          ...photo,
          dataUrl: encodedPhotos[index] ?? photo.dataUrl,
        })),
      );

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          photos: encodedPhotos,
          profile,
        }),
      });

      if (!response.ok) {
        throw new Error("The analysis request could not be completed.");
      }

      const data = (await response.json()) as AnalysisResult;
      setResult(data);
      window.localStorage.setItem(STORAGE_RESULT_KEY, JSON.stringify(data));
      window.localStorage.removeItem(STORAGE_UNLOCKED_KEY);
      setIsUnlocked(isPaywallBypassEnabled);
      void fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "guide_generated",
          name: profile.name,
          season: data.season,
          source: "analysis_form",
        }),
      });
      trackAnalyticsEvent("guide_generated", {
        season: data.season,
        source: "analysis_form",
        paywall_bypass: isPaywallBypassEnabled,
      });
      if (isPaywallBypassEnabled) {
        void fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "guide_unlocked",
            name: profile.name,
            season: data.season,
            source: "demo_bypass",
          }),
        });
        trackAnalyticsEvent("guide_unlocked", {
          season: data.season,
          source: "demo_bypass",
          paywall_bypass: true,
        });
      }
      setStage("slides");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (requestError) {
      setStage("landing");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong while generating your guide.",
      );
    }
  }

  async function handleCheckout() {
    if (!result || !activePreset) {
      setError("Generate your free preview first.");
      return;
    }

    setIsCheckingOut(true);
    setError(null);
    window.localStorage.setItem(STORAGE_RESULT_KEY, JSON.stringify(result));

    try {
      void fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "unlock_clicked",
          name: profile.name,
          season: activePreset.season,
          source: "stripe_cta",
        }),
      });
      trackAnalyticsEvent("unlock_clicked", {
        season: activePreset.season,
        source: "stripe_cta",
        value: 5,
        currency: "USD",
      });

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          season: activePreset.season,
        }),
      });

      if (!response.ok) {
        const checkoutError = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(
          checkoutError?.error ?? "Stripe checkout could not be started.",
        );
      }

      const checkout = (await response.json()) as { url?: string };

      if (!checkout.url) {
        throw new Error("Stripe checkout URL was missing.");
      }

      window.location.href = checkout.url;
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unable to start checkout.",
      );
      setIsCheckingOut(false);
    }
  }

  function handleDevUnlock() {
    if (!isPaywallBypassEnabled) return;
    window.localStorage.setItem(STORAGE_UNLOCKED_KEY, "true");
    setIsUnlocked(true);
    setStage("slides");
    setError(null);
    void fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "guide_unlocked",
        name: profile.name,
        season: activePreset?.season ?? result?.season ?? "",
        source: "demo_bypass_button",
      }),
    });
    trackAnalyticsEvent("guide_unlocked", {
      season: activePreset?.season ?? result?.season ?? "",
      source: "demo_bypass_button",
      paywall_bypass: true,
    });
  }

  async function handleSurveySubmit() {
    setSurveyStatus("saving");

    try {
      const response = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wouldPay: surveyWouldPay,
          price: surveyPrice,
          source: "landing_survey",
        }),
      });

      if (!response.ok) {
        throw new Error("Survey could not be saved.");
      }

      setSurveyStatus("saved");
      trackAnalyticsEvent("survey_submitted", {
        would_pay: surveyWouldPay,
        price: surveyPrice,
        source: "landing_survey",
      });
    } catch {
      setSurveyStatus("error");
    }
  }

  if (stage === "loading") {
    return <BottleLoader />;
  }

  if (stage === "slides" && result && activePreset) {
    return (
      <main
        className="mx-auto min-h-screen w-full max-w-6xl px-5 py-10 sm:px-10"
        style={{
          background:
            `radial-gradient(circle at 8% 0%, ${activePreset.appBackground}, transparent 28%), transparent`,
        }}
      >
        <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStage("landing")}
            className="rounded-full border border-[var(--line)] bg-white/60 px-4 py-2 text-sm text-[var(--muted)] transition hover:text-[var(--ink)]"
          >
            Edit photos
          </button>
          <div className="flex flex-wrap gap-3">
            {!isUnlocked ? (
              <button
                type="button"
                onClick={() => void handleCheckout()}
                className="rounded-full bg-[var(--ink)] px-5 py-2 text-sm text-[var(--paper)] transition hover:bg-[#57473c]"
              >
                {isCheckingOut ? "Opening checkout..." : "Unlock full guide $5"}
              </button>
            ) : null}
            {isUnlocked ? (
              <>
                <button
                  type="button"
                  onClick={() => setStage("summary")}
                  className="rounded-full border border-[var(--line)] bg-white/60 px-5 py-2 text-sm text-[var(--muted)] transition hover:text-[var(--ink)]"
                >
                  Final palette
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void exportElementAsJpg(
                      "color-analysis-export",
                      `${activePreset.season.toLowerCase().replaceAll(" ", "-")}-color-analysis.jpg`,
                    )
                  }
                  className="export-ignore no-print rounded-full border border-[var(--line)] bg-white/60 px-5 py-2 text-sm text-[var(--muted)] transition hover:text-[var(--ink)]"
                >
                  Export JPG ↓
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div
          id="color-analysis-export"
          className="grid snap-y gap-12"
        >
          <SectionCard
            eyebrow="01 result"
            title={result.archetype}
            className="hide-for-card-print"
          >
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--panel)]">
                {heroPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={heroPhoto}
                    alt={profile.name ? `${profile.name} portrait` : "Uploaded portrait"}
                    className="h-[24rem] w-full object-cover object-center"
                  />
                ) : null}
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.26em] text-[var(--muted)]">
                  {activePreset.mood}
                </p>
                <p className="mt-5 max-w-2xl text-lg leading-9 text-[var(--muted)]">
                  {result.summary}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  {keyDetails.map((detail) => (
                    <DetailPill
                      key={detail.label}
                      label={`${detail.label}:`}
                      value={detail.value}
                    />
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          {!isUnlocked ? (
            <div className="no-print">
              <LockedPreview
                season={activePreset.season}
                onUnlock={() => void handleCheckout()}
                onDevUnlock={handleDevUnlock}
                loading={isCheckingOut}
              />
            </div>
          ) : null}

          <SectionCard
            eyebrow="02 color card"
            title="Your personal color map."
            isLocked={!isUnlocked}
          >
            <PersonalColorCard result={result} palette={topPalette} />
          </SectionCard>

          <SectionCard
            eyebrow="03 palette"
            title={`${activePreset.season} has a clear color logic.`}
            className="hide-for-card-print"
            isLocked={!isUnlocked}
          >
            <div className="grid gap-5 sm:grid-cols-5">
              {topPalette.map((color) => (
                <div
                  key={color.hex}
                  className="min-h-80 rounded-[2.2rem] border border-black/5 p-4 text-sm shadow-[0_20px_60px_rgba(72,53,41,0.08)]"
                  style={{ backgroundColor: color.hex }}
                >
                  <div className="flex h-full flex-col justify-end rounded-[1.55rem] bg-white/55 p-4 backdrop-blur">
                    <p className="font-medium text-[var(--ink)]">{color.name}</p>
                    <p className="mt-2 text-xs leading-5 text-[var(--ink)]/75">
                      {color.use}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <TheoryBlock label="Temperature" value={activePreset.temperature} />
              <TheoryBlock label="Value" value={activePreset.value} />
              <TheoryBlock label="Chroma" value={activePreset.chroma} />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="04 color preview"
            title="Preview wardrobe colors from your palette."
            className="hide-for-card-print"
            isLocked={!isUnlocked}
          >
            {heroPhoto ? (
              <InteractiveTryOn
                photo={heroPhoto}
                palette={topPalette}
                isUnlocked={isUnlocked}
              />
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Add a reference image to preview outfit colors.
              </p>
            )}
          </SectionCard>

          <SectionCard
            eyebrow="05 face effect"
            title="Why these shades work."
            className="hide-for-card-print"
            isLocked={!isUnlocked}
          >
            <FaceEffectStory result={result} preset={activePreset} />
          </SectionCard>

          <SectionCard
            eyebrow="06 beauty"
            title="Makeup and hair direction."
            className="hide-for-card-print"
            isLocked={!isUnlocked}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/65 p-6">
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
                  Makeup
                </p>
                <div className="mt-5 space-y-4 text-base leading-8 text-[var(--ink)]">
                  <p>{result.makeup.base}</p>
                  <p>{result.makeup.cheeks}</p>
                  <p>{result.makeup.lips}</p>
                  <p>{result.makeup.eyes}</p>
                </div>
              </div>
              <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/65 p-6">
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
                  Hair
                </p>
                <p className="mt-5 text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                  Best
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.hair.best.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-[var(--paper)] px-4 py-2 text-sm text-[var(--ink)]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <p className="mt-6 text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                  Avoid
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.hair.avoid.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-white/70 px-4 py-2 text-sm text-[var(--muted)]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="07 final"
            title="The one screen that matters."
            className="hide-for-card-print"
            isLocked={!isUnlocked}
          >
            <FinalSummary
              result={result}
              preset={activePreset}
              isUnlocked={isUnlocked}
              isCheckingOut={isCheckingOut}
              onUnlock={() => void handleCheckout()}
              onRestart={() => setStage("landing")}
              onShowSummary={() => setStage("summary")}
            />
          </SectionCard>
        </div>

        <section className="no-print mx-auto mt-12 w-full max-w-3xl rounded-[2rem] border border-[var(--line)] bg-white/65 p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
            Please help me get feedback!!
          </p>
          <form
            className="mt-6 grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSurveySubmit();
            }}
          >
            <label className="block space-y-2">
              <span className="text-sm text-[var(--muted)]">
                would you pay for this service?
              </span>
              <select
                value={surveyWouldPay}
                onChange={(event) => {
                  setSurveyWouldPay(event.target.value);
                  setSurveyStatus("idle");
                }}
                className="w-full rounded-[1rem] border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--line-strong)]"
              >
                <option value="yes">Yes</option>
                <option value="maybe">Maybe</option>
                <option value="no">No</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-[var(--muted)]">How much would you pay?</span>
              <input
                value={surveyPrice}
                onChange={(event) => {
                  setSurveyPrice(event.target.value);
                  setSurveyStatus("idle");
                }}
                className="w-full rounded-[1rem] border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--line-strong)]"
                placeholder="Enter an amount"
                required
              />
            </label>

            <button
              type="submit"
              disabled={surveyStatus === "saving" || surveyStatus === "saved"}
              className="self-end rounded-full bg-[var(--ink)] px-6 py-3 text-sm uppercase tracking-[0.18em] text-[var(--paper)] transition hover:bg-[#57473c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {surveyStatus === "saving"
                ? "Saving..."
                : surveyStatus === "saved"
                  ? "Saved"
                  : "Submit"}
            </button>
          </form>
          {surveyStatus === "saved" ? (
            <p className="mt-4 text-sm text-[var(--muted)]">
              Thank you. This helps me validate the business.
            </p>
          ) : null}
          {surveyStatus === "error" ? (
            <p className="mt-4 text-sm text-[#7a5648]">
              Could not save feedback. Please try again.
            </p>
          ) : null}
        </section>
      </main>
    );
  }

  if (stage === "summary" && result && activePreset) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-8">
        <div className="w-full max-w-4xl">
          <FinalSummary
            result={result}
            preset={activePreset}
            isUnlocked={isUnlocked}
            isCheckingOut={isCheckingOut}
            onUnlock={() => void handleCheckout()}
            onRestart={() => setStage("landing")}
            showActions={false}
          />
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {isUnlocked ? (
              <button
                type="button"
                onClick={() => setStage("slides")}
                className="rounded-full bg-[var(--ink)] px-7 py-3 text-sm uppercase tracking-[0.18em] text-[var(--paper)] transition hover:bg-[#57473c]"
              >
                See full guide →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleCheckout()}
                className="rounded-full bg-[var(--ink)] px-7 py-3 text-sm uppercase tracking-[0.18em] text-[var(--paper)] transition hover:bg-[#57473c]"
              >
                {isCheckingOut ? "Opening checkout..." : "Unlock full guide $5"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setStage("landing")}
              className="rounded-full border border-[var(--line)] bg-white/60 px-6 py-3 text-sm text-[var(--muted)] transition hover:text-[var(--ink)]"
            >
              Start over
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-10">
      <section className="grid min-h-[calc(100vh-3rem)] items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-8">
          <div>
            <p className="text-xs uppercase tracking-[0.38em] text-[var(--muted)]">
              Shuhari
            </p>
            <h1 className="mt-5 max-w-3xl font-serif-kor text-5xl leading-[1.05] text-[var(--ink)] sm:text-7xl">
              Your personal color guide, made instant.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-9 text-[var(--muted)]">
              Upload daylight reference images, get a free palette preview, then
              unlock the full report for $5.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {landingSwatches.map((swatch) => (
              <div
                key={swatch}
                className="h-14 w-14 rounded-full border border-white/70 shadow-[0_12px_40px_rgba(72,53,41,0.12)]"
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {landingHighlights.map((item) => (
              <div
                key={item.title}
                className="rounded-[1.35rem] border border-[var(--line)] bg-white/55 p-4"
              >
                <p className="text-sm text-[var(--ink)]">{item.title}</p>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {seasonPresets
              .filter((preset) =>
                ["Bright Spring", "Soft Summer", "Warm Autumn", "Deep Winter"].includes(
                  preset.season,
                ),
              )
              .map((preset) => (
                <div
                  key={preset.key}
                  className="rounded-[1.5rem] border border-[var(--line)] bg-white/50 p-4"
                >
                  <div className="flex overflow-hidden rounded-full border border-white/70">
                    {preset.palette.slice(0, 5).map((color) => (
                      <div
                        key={color.hex}
                        className="h-8 flex-1"
                        style={{ backgroundColor: color.hex }}
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-[var(--ink)]">{preset.season}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    {preset.temperature}, {preset.value}, {preset.chroma}
                  </p>
                </div>
              ))}
          </div>
        </div>

        <form
          className="rounded-[2.25rem] border border-[var(--line)] bg-white/70 p-5 shadow-[0_30px_90px_rgba(72,53,41,0.08)] sm:p-7"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                Start here
              </p>
              <h2 className="mt-2 font-serif-kor text-3xl text-[var(--ink)]">
                Get my guide
              </h2>
            </div>
            <span className="rounded-full bg-[var(--paper)] px-3 py-1 text-xs text-[var(--muted)]">
              Free preview
            </span>
          </div>

          <div className="mt-7 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm text-[var(--muted)]">Name</span>
              <input
                value={profile.name}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="w-full rounded-[1rem] border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--line-strong)]"
                placeholder="Minji"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-[var(--muted)]">Style goal</span>
              <textarea
                value={profile.styleGoal}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    styleGoal: event.target.value,
                  }))
                }
                className="min-h-24 w-full rounded-[1rem] border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm leading-6 text-[var(--ink)] outline-none transition focus:border-[var(--line-strong)]"
                placeholder="Style goal"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm text-[var(--muted)]">Jewelry</span>
                <select
                  value={profile.jewelryTone}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      jewelryTone:
                        event.target.value as UploadedProfile["jewelryTone"],
                    }))
                  }
                  className="w-full rounded-[1rem] border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--line-strong)]"
                >
                  <option value="gold">Gold</option>
                  <option value="silver">Silver</option>
                  <option value="mixed">Mixed</option>
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-[var(--muted)]">Contrast</span>
                <select
                  value={profile.contrastLevel}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      contrastLevel:
                        event.target.value as UploadedProfile["contrastLevel"],
                    }))
                  }
                  className="w-full rounded-[1rem] border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--line-strong)]"
                >
                  <option value="soft">Soft</option>
                  <option value="balanced">Balanced</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm text-[var(--muted)]">Makeup vibe</span>
              <input
                value={profile.makeupPreference}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    makeupPreference: event.target.value,
                  }))
                }
                className="w-full rounded-[1rem] border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--line-strong)]"
                placeholder="Muted, natural, glossy, soft matte..."
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-[var(--muted)]">
                Photos
              </span>
              <div className="rounded-[1.35rem] border border-dashed border-[var(--line-strong)] bg-[var(--paper)] p-4">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUpload}
                  className="block w-full text-sm text-[var(--muted)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--ink)] file:px-4 file:py-2 file:text-sm file:text-[var(--paper)]"
                />
                {photos.length > 0 ? (
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="group relative aspect-[4/5] overflow-hidden rounded-[1rem] border border-white/70 bg-white/50 shadow-sm"
                        title={photo.name}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.preview}
                          alt={photo.name}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-[var(--ink)]/45 px-2 py-1 text-[0.55rem] text-[var(--paper)] opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
                          {photo.name}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
                  Upload well lit photos
                </p>
              </div>
            </label>

            {error ? (
              <p className="rounded-[1rem] border border-[#caa999] bg-[#f7ebe4] px-4 py-3 text-sm text-[#7a5648]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-full bg-[var(--ink)] px-5 py-4 text-sm uppercase tracking-[0.18em] text-[var(--paper)] transition hover:bg-[#57473c]"
            >
              Get my guide
            </button>
          </div>
        </form>
      </section>

    </main>
  );
}

/** Remove "low/medium/high confidence" phrasing models often echo in prose. */
function stripAiConfidenceNote(text: string): string {
  return text
    .replace(/\bwith\s+(low|medium|high)\s+confidence\b\.?/gi, "")
    .replace(/\b(low|medium|high)\s+confidence\b[.:]?\s*/gi, "")
    .replace(/\(\s*(low|medium|high)\s+confidence\s*\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s.,;:-]+|[\s.,;:-]+$/g, "")
    .trim();
}

function FinalSummary({
  result,
  preset,
  isUnlocked,
  isCheckingOut,
  onUnlock,
  onRestart,
  onShowSummary,
  showActions = true,
}: {
  result: AnalysisResult;
  preset: NonNullable<ReturnType<typeof getSeasonPreset>>;
  isUnlocked: boolean;
  isCheckingOut: boolean;
  onUnlock: () => void;
  onRestart: () => void;
  onShowSummary?: () => void;
  showActions?: boolean;
}) {
  const heroColors = preset.palette.slice(0, 5);
  const details = [
    preset.temperature,
    preset.value,
    preset.chroma,
    preset.contrast,
  ].filter(Boolean);

  return (
    <div
      id="final-palette-card"
      className="overflow-hidden rounded-[2.5rem] border border-[var(--line)] text-[var(--paper)] shadow-[0_36px_120px_rgba(61,48,39,0.25)]"
      style={{ backgroundColor: preset.appInk }}
    >
      <div className="p-7 sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs uppercase tracking-[0.36em] text-[var(--paper)]/60">
            Final palette
          </p>
          <button
            type="button"
            onClick={() =>
              void exportElementAsJpg(
                "final-palette-card",
                `${preset.season.toLowerCase().replaceAll(" ", "-")}-final-card.jpg`,
              )
            }
            className="export-ignore rounded-full border border-white/15 px-4 py-2 text-xs text-[var(--paper)]/70 transition hover:text-white"
          >
            Save card ↓
          </button>
        </div>

        <h2 className="mt-8 max-w-3xl font-serif-kor text-5xl leading-none sm:text-7xl">
          {preset.season}
        </h2>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--paper)]/72">
          {stripAiConfidenceNote(result.archetype)} · {preset.mood}
        </p>

        <div className="mt-9 grid overflow-hidden rounded-[2rem] border border-white/10 sm:grid-cols-5">
          {heroColors.map((color) => (
            <div
              key={color.hex}
              className="flex min-h-52 flex-col justify-end p-5 text-[var(--ink)]"
              style={{ backgroundColor: color.hex }}
            >
              <p className="text-sm font-semibold">{color.name}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] opacity-70">
                {color.hex}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/8 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--paper)]/55">
              Your read
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {details.map((detail) => (
                <span
                  key={detail}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm text-[var(--paper)]/82"
                >
                  {detail}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/8 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--paper)]/55">
              Remember this
            </p>
            <p className="mt-4 text-base leading-8 text-[var(--paper)]/82">
              {stripAiConfidenceNote(result.whyItWorks[0] ?? result.summary)}
            </p>
          </div>
        </div>

        <div className={isUnlocked ? "mt-8 grid gap-4 md:grid-cols-3" : "mt-8 grid gap-4 md:grid-cols-3 opacity-45 blur-[2px]"}>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--paper)]/45">
              Best neutrals
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--paper)]/78">
              {preset.neutrals.slice(0, 4).join(", ")}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--paper)]/45">
              Makeup
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--paper)]/78">
              {result.makeup.lips}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--paper)]/45">
              Avoid
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--paper)]/78">
              {preset.avoid.slice(0, 3).join(", ")}
            </p>
          </div>
        </div>

        {showActions ? (
          <div className="mt-9 flex flex-wrap gap-3">
            {!isUnlocked ? (
              <button
                type="button"
                onClick={onUnlock}
                className="export-ignore rounded-full bg-[var(--paper)] px-5 py-3 text-sm text-[var(--ink)] transition hover:bg-white"
              >
                {isCheckingOut ? "Opening checkout..." : "Unlock full guide $5"}
              </button>
            ) : null}
            {onShowSummary ? (
              <button
                type="button"
                onClick={onShowSummary}
                className="export-ignore rounded-full bg-[var(--paper)] px-5 py-3 text-sm text-[var(--ink)] transition hover:bg-white"
              >
                Open final card
              </button>
            ) : null}
            <button
              type="button"
              onClick={onRestart}
              className="export-ignore rounded-full border border-white/15 px-5 py-3 text-sm text-[var(--paper)]/78 transition hover:text-white"
            >
              Start over
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
