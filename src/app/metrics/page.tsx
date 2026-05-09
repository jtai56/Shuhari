import type { Metadata } from "next";
import Link from "next/link";
import { getMetricsSnapshot } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Metrics | Shuhari",
  description: "Live Shuhari validation metrics.",
};

const metricLabels: Record<string, string> = {
  page_view: "Page views",
  guide_generated: "Guides generated",
  unlock_clicked: "Unlock clicks",
  guide_unlocked: "Guides unlocked",
  survey_submitted: "Survey responses",
};
const defaultTotals: Array<[string, number]> = [
  ["page_view", 0],
  ["guide_generated", 0],
  ["unlock_clicked", 0],
  ["guide_unlocked", 0],
  ["survey_submitted", 0],
];
const defaultToday: Array<[string, number]> = [["No events yet", 0]];

function formatLabel(key: string) {
  return metricLabels[key] ?? key.replaceAll("_", " ");
}

export default async function MetricsPage() {
  const snapshot = await getMetricsSnapshot();
  const totals = Object.entries(snapshot.totals);
  const today = Object.entries(snapshot.today);

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-16 sm:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
            Validation
          </p>
          <h1 className="mt-3 font-serif-kor text-5xl text-[var(--ink)]">
            Live metrics
          </h1>
        </div>
        <Link
          href="/"
          className="rounded-full border border-[var(--line)] bg-white/60 px-5 py-2 text-sm text-[var(--muted)] transition hover:text-[var(--ink)]"
        >
          Back to site
        </Link>
      </div>

      <section className="mt-10 grid gap-4 md:grid-cols-5">
        {(totals.length ? totals : defaultTotals).map(([key, value]) => (
          <div
            key={key}
            className="rounded-[1.75rem] border border-[var(--line)] bg-white/65 p-5"
          >
            <p className="text-3xl text-[var(--ink)]">{value}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              {formatLabel(key)}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[2rem] border border-[var(--line)] bg-white/65 p-6">
          <h2 className="font-serif-kor text-3xl text-[var(--ink)]">Today</h2>
          <div className="mt-5 space-y-3">
            {(today.length ? today : defaultToday).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between border-b border-[var(--line)] pb-3 text-sm"
              >
                <span className="text-[var(--muted)]">{formatLabel(key)}</span>
                <span className="text-[var(--ink)]">{value}</span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
            Storage: {snapshot.storage === "upstash" ? "Upstash Redis" : "local fallback"}
          </p>
        </div>

        <div className="rounded-[2rem] border border-[var(--line)] bg-white/65 p-6">
          <h2 className="font-serif-kor text-3xl text-[var(--ink)]">Recent events</h2>
          <div className="mt-5 space-y-3">
            {snapshot.recent.length ? (
              snapshot.recent.map((event, index) => (
                <div
                  key={`${event.createdAt}-${event.event}-${index}`}
                  className="rounded-[1rem] bg-[var(--paper)] px-4 py-3 text-sm"
                >
                  <p className="text-[var(--ink)]">{formatLabel(event.event)}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    {[event.source, event.season, event.createdAt].filter(Boolean).join(" · ")}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">
                No events recorded yet. Open the landing page and generate a guide to start
                collecting metrics.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
