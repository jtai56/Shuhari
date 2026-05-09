import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund Policy | Shuhari",
  description: "Refund and cancellation information for Shuhari digital color guides.",
};

export default function RefundsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-10">
      <Link href="/" className="text-sm text-[var(--muted)] transition hover:text-[var(--ink)]">
        Back to Shuhari
      </Link>
      <article className="mt-8 rounded-[2rem] border border-[var(--line)] bg-white/65 p-7 sm:p-10">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
          Support
        </p>
        <h1 className="mt-4 font-serif-kor text-4xl text-[var(--ink)]">
          Refund Policy
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          Last updated May 9, 2026
        </p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-[var(--muted)]">
          <section>
            <h2 className="text-lg text-[var(--ink)]">Digital purchase policy</h2>
            <p className="mt-2">
              Shuhari sells digital wardrobe color guides. Because digital access is
              delivered immediately after checkout, purchases are generally final once the
              full guide is unlocked.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-[var(--ink)]">When to contact us</h2>
            <p className="mt-2">
              Please contact us if you were charged but could not access your guide, were
              charged more than once, or believe there was a technical checkout error.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-[var(--ink)]">Cancellations</h2>
            <p className="mt-2">
              There is no subscription. If you leave checkout before payment, no purchase is
              completed. If a payment succeeds, access is handled as a one-time digital
              purchase.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
