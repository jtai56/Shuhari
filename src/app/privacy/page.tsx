import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Shuhari",
  description: "How Shuhari handles account, image, payment, and usage information.",
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          Last updated May 9, 2026
        </p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-[var(--muted)]">
          <section>
            <h2 className="text-lg text-[var(--ink)]">Information we collect</h2>
            <p className="mt-2">
              Shuhari may collect the name, style preferences, uploaded reference images,
              generated color guide results, checkout status, and basic technical information
              needed to run the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-[var(--ink)]">How we use information</h2>
            <p className="mt-2">
              We use submitted information to create wardrobe color guidance, provide paid
              access to the full guide, improve reliability, prevent abuse, and respond to
              support requests.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-[var(--ink)]">Images and AI services</h2>
            <p className="mt-2">
              Uploaded reference images may be processed by third-party AI providers to
              generate palette guidance and outfit color previews. Do not upload images you
              do not have permission to use.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-[var(--ink)]">Payments</h2>
            <p className="mt-2">
              Payments are handled by Stripe. Shuhari does not store full card numbers.
              Stripe may process payment details according to its own privacy policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-[var(--ink)]">Data choices</h2>
            <p className="mt-2">
              You can contact us to request help with privacy questions, data access, or
              deletion requests. Some information may be retained when required for security,
              fraud prevention, tax, accounting, or legal obligations.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
