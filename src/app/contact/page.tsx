import type { Metadata } from "next";
import Link from "next/link";

const supportEmail = "shuharihelp@gmail.com";

export const metadata: Metadata = {
  title: "Contact | Shuhari",
  description: "Contact Shuhari support for wardrobe color guide questions.",
};

export default function ContactPage() {
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
          Contact
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          For support, privacy questions, checkout issues, or refund requests, email us at{" "}
          <a href={`mailto:${supportEmail}`} className="text-[var(--ink)] underline">
            {supportEmail}
          </a>
          .
        </p>

        <div className="mt-8 space-y-5 text-sm leading-7 text-[var(--muted)]">
          <section>
            <h2 className="text-lg text-[var(--ink)]">What to include</h2>
            <p className="mt-2">
              Please include the email used at checkout, the approximate purchase time, and
              a short description of the issue. Do not send payment card details.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-[var(--ink)]">Response time</h2>
            <p className="mt-2">
              We aim to respond to support messages as soon as possible during normal
              business days.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
