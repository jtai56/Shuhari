const STRIPE_MANAGED_PAYMENTS_VERSION = "2026-02-25.preview";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error("Set STRIPE_SECRET_KEY before creating the Stripe product.");
  process.exit(1);
}

const params = new URLSearchParams();
params.set("name", "Hamlet (e-book)");
params.set("description", "A Shakespearean tragedy");
params.set("tax_code", "txcd_10103100");
params.set("default_price_data[unit_amount]", "1000");
params.set("default_price_data[currency]", "usd");

const response = await fetch("https://api.stripe.com/v1/products", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${stripeSecretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
    "Stripe-Version": STRIPE_MANAGED_PAYMENTS_VERSION,
  },
  body: params,
});

if (!response.ok) {
  const detail = await response.text();
  console.error("Stripe rejected the product creation request.");
  console.error(detail);
  process.exit(1);
}

const product = await response.json();

console.log("Created Stripe product for Managed Payments.");
console.log(`STRIPE_PRODUCT_ID=${product.id}`);
console.log(`STRIPE_PRICE_ID=${product.default_price}`);
