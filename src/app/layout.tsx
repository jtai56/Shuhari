import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const notoSerifKr = Noto_Serif_KR({
  variable: "--font-noto-serif-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const tiktokPixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID ?? "D7VLVHJC77U02PKA26FG";
const googleAnalyticsId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export const metadata: Metadata = {
  title: "Shuhari | Wardrobe Color Guide",
  description:
    "A polished wardrobe color guide with palette previews and styling notes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${notoSansKr.variable} ${notoSerifKr.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};


  ttq.load('${tiktokPixelId}');
  ttq.page();
}(window, document, 'ttq');
`,
          }}
        />
        {googleAnalyticsId ? (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${googleAnalyticsId}');
`,
              }}
            />
          </>
        ) : null}
      </head>
      <body className="min-h-full flex flex-col">
        <div className="flex-1">{children}</div>
        <footer className="mx-auto w-full max-w-6xl px-5 pb-8 text-xs text-[var(--muted)] sm:px-10">
          <div className="flex flex-col gap-4 border-t border-[var(--line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Shuhari. Wardrobe color guidance for everyday styling.</p>
            <nav
              aria-label="Legal and support links"
              className="flex flex-wrap gap-x-5 gap-y-2"
            >
              <Link href="/privacy" className="transition hover:text-[var(--ink)]">
                Privacy Policy
              </Link>
              <Link href="/terms" className="transition hover:text-[var(--ink)]">
                Terms
              </Link>
              <Link href="/refunds" className="transition hover:text-[var(--ink)]">
                Refund Policy
              </Link>
              <Link href="/contact" className="transition hover:text-[var(--ink)]">
                Contact
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
