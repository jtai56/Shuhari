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

For local webhook testing, forward Stripe events to
`/api/webhooks/stripe`, then add the signing secret to `.env`:

```bash
STRIPE_WEBHOOK_SECRET=<your Stripe webhook signing secret>
```

The webhook listens for `checkout.session.completed` and records completed
sessions in `data/stripe-checkout-events.jsonl`.

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
