This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Stripe Managed Payments

Add your Stripe keys from the Stripe Dashboard to `.env`:

```bash
STRIPE_SECRET_KEY=<your Stripe secret key from the Dashboard>
STRIPE_PUBLISHABLE_KEY=<your Stripe publishable key from the Dashboard>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Create the tax-coded product and default price required for Managed Payments:

```bash
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY npm run stripe:create-product
```

Copy the printed `STRIPE_PRICE_ID` into `.env`. The checkout route also includes
`managed_payments[enabled]=true` and sends the required `Stripe-Version:
2026-02-25.preview` request header.

### Stripe webhook (production)

1. In [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks), choose **Add endpoint**.
2. Set **Endpoint URL** to `https://<your-domain>/api/webhooks/stripe` (same path as in this repo: `src/app/api/webhooks/stripe/route.ts`).
3. Under **Events**, subscribe to **`checkout.session.completed`** (that is what the handler processes).
4. After saving, open the endpoint and reveal **Signing secret**. Set it in production (e.g. Vercel) as **`STRIPE_WEBHOOK_SECRET`**.

### Stripe webhook (local)

Use the [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward events:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the **`whsec_...`** signing secret the CLI prints and put it in `.env`:

```bash
STRIPE_WEBHOOK_SECRET=<webhook signing secret from CLI or Dashboard>
```

The webhook listens for `checkout.session.completed` and records completed
sessions in `data/stripe-checkout-events.jsonl`.

## API rate limiting

Public `POST` routes (`/api/analyze`, `/api/try-on`, `/api/checkout`, `/api/checkout/verify`, `/api/leads`) are rate-limited per client IP using a sliding window.

- **Production:** create a free [Upstash Redis](https://upstash.com/) database and set **`UPSTASH_REDIS_REST_URL`** and **`UPSTASH_REDIS_REST_TOKEN`** in your deployment env. Limits are then coordinated across all serverless instances.
- **Without Upstash:** the app falls back to an in-memory counter (suitable for local dev only; not reliable if you scale to many instances).

The Stripe webhook route is **not** rate-limited; Stripe verifies requests with the signing secret and retries on failure.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
