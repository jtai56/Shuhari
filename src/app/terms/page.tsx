import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Shuhari",
  description: "Terms for using Shuhari wardrobe color guidance.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-10">
      <Link href="/" className="text-sm text-[var(--muted)] transition hover:text-[var(--ink)]">
        Back to Shuhari
      </Link>
      <article className="mt-8 rounded-[2rem] border border-[var(--line)] bg-white/65 p-7 sm:p-10">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
          Legal
        </p>
        <h1 className="mt-4 font-serif-kor text-4xl text-[var(--ink)]">
          Terms of Service
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          Last updated May 9, 2026
        </p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-[var(--muted)]">
          <section>
            <h2 className="text-lg text-[var(--ink)]">Service overview</h2>
            <p className="mt-2">
              Shuhari provides digital wardrobe color guidance, palette previews, styling
              notes, and outfit color previews. The service is for general style education
              and personal organization only.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-[var(--ink)]">User responsibilities</h2>
            <p className="mt-2">
              You agree to submit only information and images you have the right to use.
              You may not use the service for unlawful activity, harassment, impersonation,
              or attempts to disrupt the site.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-[var(--ink)]">Digital results</h2>
            <p className="mt-2">
              Color guidance is generated from submitted preferences and images. Results
              are informational and may vary based on lighting, image quality, display
              settings, and personal preference.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-[var(--ink)]">Paid access</h2>
            <p className="mt-2">
              Paid access unlocks the full digital guide and related previews for the
              current session or saved browser state. Pricing and checkout details are
              shown before payment.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-[var(--ink)]">No professional advice</h2>
            <p className="mt-2">
              Shuhari does not provide medical, psychological, financial, or legal advice.
              The guidance is limited to wardrobe color and styling suggestions.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
