"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Color math ───────────────────────────────────────────────────────────────

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

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    Math.round(hue2rgb(h + 1 / 3) * 255),
    Math.round(hue2rgb(h) * 255),
    Math.round(hue2rgb(h - 1 / 3) * 255),
  ];
}

// ─── Core recolor algorithm ───────────────────────────────────────────────────
//
// For each pixel:
//   1. Sample mask brightness (0 = protected, 1 = fully editable, 0-1 = soft edge)
//   2. Skip achromatic pixels (near-white/black/grey graphics on the shirt)
//   3. Replace H and S with target color; keep original L (preserves shadows & highlights)
//   4. Lerp between original and recolored by mask brightness (handles anti-aliased edges)

function applyClothingMask(
  photoData: ImageData,
  maskData: ImageData,
  targetHex: string,
): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(photoData.data),
    photoData.width,
    photoData.height,
  );

  const [tr, tg, tb] = hexToRgb(targetHex);
  const [th, ts] = rgbToHsl(tr, tg, tb);

  const maskScaleX = maskData.width / photoData.width;
  const maskScaleY = maskData.height / photoData.height;

  for (let py = 0; py < photoData.height; py++) {
    for (let px = 0; px < photoData.width; px++) {
      const photoIdx = (py * photoData.width + px) * 4;

      // Map photo pixel → mask pixel (handles different resolutions)
      const mx = Math.min(maskData.width - 1, Math.round(px * maskScaleX));
      const my = Math.min(maskData.height - 1, Math.round(py * maskScaleY));
      const maskIdx = (my * maskData.width + mx) * 4;

      // Mask value: 0 = black (protected), 1 = white (fully editable)
      const maskAlpha =
        (maskData.data[maskIdx] + maskData.data[maskIdx + 1] + maskData.data[maskIdx + 2]) / 765;

      if (maskAlpha < 0.04) continue; // protected pixel

      const pr = photoData.data[photoIdx];
      const pg = photoData.data[photoIdx + 1];
      const pb = photoData.data[photoIdx + 2];

      const [, origS, origL] = rgbToHsl(pr, pg, pb);

      // Achromatic guard: white graphics, black patterns, grey elements on the shirt
      // stay unchanged so text and logos are preserved. Threshold tunable.
      if (origS < 0.08) continue;

      // Photoshop Hue/Saturation: keep L (luminance), replace H and S.
      // This makes shadows stay dark and highlights stay bright — not a flat fill.
      const [nr, ng, nb] = hslToRgb(th, ts, origL);

      // Soft-edge blend: mask gray values (anti-aliased edges) lerp proportionally
      const a = maskAlpha;
      result.data[photoIdx] = Math.round(pr * (1 - a) + nr * a);
      result.data[photoIdx + 1] = Math.round(pg * (1 - a) + ng * a);
      result.data[photoIdx + 2] = Math.round(pb * (1 - a) + nb * a);
    }
  }

  return result;
}

// ─── Test palette ─────────────────────────────────────────────────────────────

const PALETTE = [
  { name: "Sage Green", hex: "#8FAF8A" },
  { name: "Navy", hex: "#2D3A6B" },
  { name: "Burgundy", hex: "#7B2D3E" },
  { name: "Camel", hex: "#C4956A" },
  { name: "Forest", hex: "#2D5A3D" },
  { name: "Dusty Rose", hex: "#C4857A" },
  { name: "Slate Blue", hex: "#5A6A8A" },
  { name: "Terracotta", hex: "#B85C38" },
  { name: "Lavender", hex: "#8A7AAF" },
  { name: "Teal", hex: "#2D7A7A" },
  { name: "Warm Black", hex: "#2A2219" },
  { name: "Ivory", hex: "#EDE3D0" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TryOnTest() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoDataRef = useRef<ImageData | null>(null);
  const maskDataRef = useRef<ImageData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let photoData: ImageData | null = null;
    let maskData: ImageData | null = null;
    let settled = false;

    function finalize() {
      if (settled || !photoData || !maskData) return;
      settled = true;

      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = photoData.width;
      canvas.height = photoData.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.putImageData(photoData, 0, 0);
      photoDataRef.current = photoData;
      maskDataRef.current = maskData;
      setLoaded(true);
    }

    function loadImage(src: string): Promise<ImageData> {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const oc = document.createElement("canvas");
          oc.width = img.naturalWidth;
          oc.height = img.naturalHeight;
          const octx = oc.getContext("2d");
          if (!octx) return reject(new Error("No 2d context"));
          octx.drawImage(img, 0, 0);
          resolve(octx.getImageData(0, 0, img.naturalWidth, img.naturalHeight));
        };
        img.onerror = () => reject(new Error(`Failed to load ${src}`));
        img.src = src;
      });
    }

    Promise.all([loadImage("/IMG_9038.png"), loadImage("/IMG_1024.png")])
      .then(([photo, mask]) => {
        photoData = photo;
        maskData = mask;
        finalize();
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : "Failed to load images");
      });
  }, []);

  const applyColor = useCallback((hex: string | null) => {
    setActiveColor(hex);
    const canvas = canvasRef.current;
    const photo = photoDataRef.current;
    const mask = maskDataRef.current;
    if (!canvas || !photo || !mask) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!hex) {
      ctx.putImageData(photo, 0, 0);
      return;
    }

    const result = applyClothingMask(photo, mask, hex);
    ctx.putImageData(result, 0, 0);
  }, []);

  return (
    <main className="min-h-screen bg-[#f5ede3] px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs uppercase tracking-[0.34em] text-[#8a7a6b]">
          Algorithm test · HSL recolor via binary matte
        </p>
        <h1 className="mt-3 font-serif text-4xl text-[#3d3027]">Clothing Color Try-On</h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-[#8a7a6b]">
          Mask layer (white = editable clothing) composited over the original photo.
          Hue + Saturation replaced by target color; Lightness preserved from original
          so fabric folds, shadows, and highlights stay realistic.
        </p>

        {loadError ? (
          <div className="mt-8 rounded-2xl border border-[#c47a6a]/30 bg-[#f9ece8] p-6 text-sm text-[#8a4f45]">
            {loadError}
          </div>
        ) : null}

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_160px]">
          {/* Canvas */}
          <div className="overflow-hidden rounded-[1.75rem] border border-black/8 bg-white shadow-[0_20px_60px_rgba(61,48,39,0.12)]">
            {!loaded && !loadError ? (
              <div className="flex h-[28rem] items-center justify-center gap-2 text-sm text-[#8a7a6b]">
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#8a7a6b] [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#8a7a6b] [animation-delay:120ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#8a7a6b] [animation-delay:240ms]" />
              </div>
            ) : null}
            <canvas
              ref={canvasRef}
              className={`w-full ${loaded ? "block" : "hidden"}`}
            />
          </div>

          {/* Palette */}
          <div className="flex flex-col gap-3">
            <p className="text-[0.65rem] uppercase tracking-[0.28em] text-[#8a7a6b]">
              Click a color
            </p>

            {/* Reset */}
            <button
              type="button"
              onClick={() => applyColor(null)}
              title="Reset to original"
              className={`h-14 w-14 rounded-full border-2 text-[0.6rem] uppercase tracking-wide transition-transform hover:scale-105 active:scale-95 ${
                !activeColor
                  ? "scale-105 border-[#3d3027] bg-[#f5ede3] shadow-lg"
                  : "border-black/10 bg-[#f5ede3] text-[#8a7a6b] shadow"
              }`}
            >
              Reset
            </button>

            {PALETTE.map((color) => (
              <button
                key={color.hex}
                type="button"
                onClick={() => applyColor(color.hex)}
                title={color.name}
                className={`h-14 w-14 rounded-full border-2 transition-transform hover:scale-105 active:scale-95 ${
                  activeColor === color.hex
                    ? "scale-110 border-[#3d3027] shadow-lg"
                    : "border-white/60 shadow"
                }`}
                style={{ backgroundColor: color.hex }}
              />
            ))}
          </div>
        </div>

        {/* Color name label */}
        {activeColor ? (
          <p className="mt-5 text-sm text-[#8a7a6b]">
            Showing{" "}
            <span className="text-[#3d3027]">
              {PALETTE.find((c) => c.hex === activeColor)?.name ?? activeColor}
            </span>
            {" "}— click another color to compare.
          </p>
        ) : (
          <p className="mt-5 text-sm text-[#8a7a6b]">
            Original photo — click a color to recolor the clothing.
          </p>
        )}
      </div>
    </main>
  );
}
