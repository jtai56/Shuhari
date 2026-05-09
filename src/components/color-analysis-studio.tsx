"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";

import type { AnalysisResult, UploadedProfile } from "@/lib/color-analysis";
import { getSeasonPreset, seasonPresets } from "@/lib/season-presets";

type UploadedPhoto = {
  id: string;
  name: string;
  preview: string;
  dataUrl: string;
};

type AppStage = "landing" | "loading" | "slides" | "summary";

const STORAGE_RESULT_KEY = "shuhari:lastResult";
const STORAGE_EMAIL_KEY = "shuhari:email";
const STORAGE_UNLOCKED_KEY = "shuhari:unlocked";

const initialProfile: UploadedProfile = {
  name: "",
  styleGoal: "",
  jewelryTone: "mixed",
  contrastLevel: "balanced",
  makeupPreference: "",
};

const landingSwatches = ["#D3BEA3", "#B27D72", "#7B8575", "#8B796B", "#3D3027"];

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
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-[72vh] snap-center rounded-[2.25rem] border border-[var(--line)] bg-white/70 p-7 shadow-[0_30px_90px_rgba(72,53,41,0.08)] sm:p-10">
      <p className="text-xs uppercase tracking-[0.34em] text-[var(--muted)]">
        {eyebrow}
      </p>
      <h2 className="mt-4 max-w-3xl font-serif-kor text-4xl leading-tight text-[var(--ink)] sm:text-6xl">
        {title}
      </h2>
      <div className="mt-8">{children}</div>
    </section>
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
  onUnlock,
  loading,
}: {
  onUnlock: () => void;
  loading: boolean;
}) {
  return (
    <div className="sticky top-6 z-10 mb-8 rounded-[2rem] border border-[var(--line-strong)] bg-[var(--paper)]/95 p-6 text-center shadow-[0_24px_80px_rgba(72,53,41,0.16)] backdrop-blur">
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
        Free preview ready
      </p>
      <h2 className="mx-auto mt-3 max-w-2xl font-serif-kor text-3xl leading-tight text-[var(--ink)]">
        Unlock the full guide for the detailed report, beauty direction, and
        shopping list.
      </h2>
      <button
        type="button"
        onClick={onUnlock}
        className="mt-5 rounded-full bg-[var(--ink)] px-7 py-3 text-sm uppercase tracking-[0.18em] text-[var(--paper)] transition hover:bg-[#57473c]"
      >
        {loading ? "Opening checkout..." : "Unlock full guide $5"}
      </button>
    </div>
  );
}

export function ColorAnalysisStudio() {
  const [profile, setProfile] = useState<UploadedProfile>(initialProfile);
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return window.localStorage.getItem(STORAGE_EMAIL_KEY) ?? "";
  });
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const savedResult = window.localStorage.getItem(STORAGE_RESULT_KEY);

    if (!savedResult) {
      return null;
    }

    try {
      return JSON.parse(savedResult) as AnalysisResult;
    } catch {
      window.localStorage.removeItem(STORAGE_RESULT_KEY);
      return null;
    }
  });
  const [stage, setStage] = useState<AppStage>("landing");
  const [error, setError] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(STORAGE_UNLOCKED_KEY) === "true";
  });
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const heroPhoto = photos[0]?.preview;
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
    const savedResult = window.localStorage.getItem(STORAGE_RESULT_KEY);
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("checkout");

    if (checkoutStatus === "success") {
      queueMicrotask(() => {
        window.localStorage.setItem(STORAGE_UNLOCKED_KEY, "true");
        setIsUnlocked(true);
        setStage("slides");
        window.history.replaceState({}, "", "/");
      });
      return;
    }

    if (checkoutStatus === "cancelled") {
      queueMicrotask(() => {
        setStage(savedResult ? "summary" : "landing");
        setError("Checkout was cancelled. Your free preview is still saved.");
        window.history.replaceState({}, "", "/");
      });
    }
  }, []);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, 3);

    if (files.length === 0) {
      return;
    }

    const nextPhotos = await Promise.all(
      files.map(async (file, index) => {
        const dataUrl = await fileToDataUrl(file);

        return {
          id: `${file.name}-${index}-${Date.now()}`,
          name: file.name,
          preview: dataUrl,
          dataUrl,
        };
      }),
    );

    setPhotos(nextPhotos);
    setError(null);
  }

  async function handleSubmit() {
    if (!canSubmit) {
      setError("Upload at least one photo first.");
      return;
    }

    if (!email.includes("@")) {
      setError("Add your email so we can save your guide.");
      return;
    }

    setStage("loading");
    setError(null);
    window.localStorage.setItem(STORAGE_EMAIL_KEY, email);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          photos: photos.map((photo) => photo.dataUrl),
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
      setIsUnlocked(false);
      void fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "guide_generated",
          email,
          name: profile.name,
          season: data.season,
          source: "analysis_form",
        }),
      });
      setStage("summary");
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
    window.localStorage.setItem(STORAGE_EMAIL_KEY, email);

    try {
      void fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "unlock_clicked",
          email,
          name: profile.name,
          season: activePreset.season,
          source: "stripe_cta",
        }),
      });

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
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
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
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
            <button
              type="button"
              onClick={() => setStage("summary")}
              className="rounded-full border border-[var(--line)] bg-white/60 px-5 py-2 text-sm text-[var(--muted)] transition hover:text-[var(--ink)]"
            >
              Final palette
            </button>
          </div>
        </div>

        {!isUnlocked ? (
          <LockedPreview onUnlock={() => void handleCheckout()} loading={isCheckingOut} />
        ) : null}

        <div className={isUnlocked ? "grid snap-y gap-12" : "grid snap-y gap-12 blur-sm"}>
          <SectionCard eyebrow="01 result" title={result.archetype}>
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--panel)]">
                {heroPhoto ? (
                  <div
                    className="h-[24rem] bg-cover bg-center"
                    style={{ backgroundImage: `url(${heroPhoto})` }}
                  />
                ) : null}
              </div>
              <div>
                <p className="font-serif-kor text-5xl text-[var(--ink)]">
                  {activePreset.season}
                </p>
                <p className="mt-3 text-sm uppercase tracking-[0.26em] text-[var(--muted)]">
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

          <SectionCard
            eyebrow="02 palette"
            title={`${activePreset.season} has a clear color logic.`}
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

          <SectionCard eyebrow="03 face effect" title="Why these shades work.">
            <div className="grid gap-4 md:grid-cols-2">
              {result.whyItWorks.slice(0, 4).map((item) => (
                <p
                  key={item}
                  className="rounded-[1.5rem] border border-[var(--line)] bg-white/65 p-5 text-base leading-8 text-[var(--ink)]"
                >
                  {item}
                </p>
              ))}
            </div>
          </SectionCard>

          <SectionCard eyebrow="04 beauty" title="Makeup and hair direction.">
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

          <SectionCard eyebrow="05 final" title="The one screen that matters.">
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
          />
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
              Upload a few daylight photos, get a free palette preview, then
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
            {["Hue", "Value", "Chroma"].map((item) => (
              <div
                key={item}
                className="rounded-[1.35rem] border border-[var(--line)] bg-white/55 p-4"
              >
                <p className="text-sm text-[var(--ink)]">{item}</p>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                  Interpreted into simple color choices.
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
              <span className="text-sm text-[var(--muted)]">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-[1rem] border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--line-strong)]"
                placeholder="you@example.com"
              />
            </label>

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
                placeholder="I want to look more effortless and polished."
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
                <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
                  1 to 3 clear daylight photos work best.
                </p>
              </div>
            </label>

            {photos.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="h-28 w-24 shrink-0 rounded-[1.1rem] border border-[var(--line)] bg-cover bg-center"
                    style={{ backgroundImage: `url(${photo.preview})` }}
                    title={photo.name}
                  />
                ))}
              </div>
            ) : null}

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

function FinalSummary({
  result,
  preset,
  isUnlocked,
  isCheckingOut,
  onUnlock,
  onRestart,
  onShowSummary,
}: {
  result: AnalysisResult;
  preset: NonNullable<ReturnType<typeof getSeasonPreset>>;
  isUnlocked: boolean;
  isCheckingOut: boolean;
  onUnlock: () => void;
  onRestart: () => void;
  onShowSummary?: () => void;
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
      className="overflow-hidden rounded-[2.5rem] border border-[var(--line)] text-[var(--paper)] shadow-[0_36px_120px_rgba(61,48,39,0.25)]"
      style={{ backgroundColor: preset.appInk }}
    >
      <div className="p-7 sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs uppercase tracking-[0.36em] text-[var(--paper)]/60">
            Final palette
          </p>
          <p className="rounded-full border border-white/15 px-4 py-2 text-xs text-[var(--paper)]/70">
            {result.confidence} confidence
          </p>
        </div>

        <h2 className="mt-8 max-w-3xl font-serif-kor text-5xl leading-none sm:text-7xl">
          {preset.season}
        </h2>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--paper)]/72">
          {result.archetype} · {preset.mood}
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
              {result.whyItWorks[0] ?? result.summary}
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

        <div className="mt-9 flex flex-wrap gap-3">
          {!isUnlocked ? (
            <button
              type="button"
              onClick={onUnlock}
              className="rounded-full bg-[var(--paper)] px-5 py-3 text-sm text-[var(--ink)] transition hover:bg-white"
            >
              {isCheckingOut ? "Opening checkout..." : "Unlock full guide $5"}
            </button>
          ) : null}
          {onShowSummary ? (
            <button
              type="button"
              onClick={onShowSummary}
              className="rounded-full bg-[var(--paper)] px-5 py-3 text-sm text-[var(--ink)] transition hover:bg-white"
            >
              Open final card
            </button>
          ) : null}
          <button
            type="button"
            onClick={onRestart}
            className="rounded-full border border-white/15 px-5 py-3 text-sm text-[var(--paper)]/78 transition hover:text-white"
          >
            Start over
          </button>
        </div>
      </div>
    </div>
  );
}
