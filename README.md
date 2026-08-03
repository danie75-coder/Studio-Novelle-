# Studio Novelle

Next.js 14 (App Router) + TypeScript + Tailwind CSS + Framer Motion.

## Setup

This project was written without network access, so no `node_modules`
are included. To run it locally:

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

Then open http://localhost:3000

## Environment variables

- `RESEND_API_KEY` — from resend.com. Powers the Contact form's email
  send in `app/api/contact/route.ts`. You'll also need a verified
  sending domain in Resend, and to update the `from` address in that
  file to match it.
- `CONTACT_TO_EMAIL` — where inquiry emails get sent.
- `NEXT_PUBLIC_CAL_LINK` — your Cal.com username/event slug (e.g.
  `studio-novelle/discovery-call`), used by the `/book` page.
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` + `PAYSTACK_SECRET_KEY` — from
  your Paystack dashboard. Powers `/checkout/[slug]` for the
  fixed-price services (LinkedIn Branding, Social Media Design,
  Advertising Design, Copywriting). Verification happens server-side
  in `app/api/paystack/verify/route.ts`.
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — from your Supabase
  project settings (API section). Used only server-side to persist
  paid orders. Before this works, run `supabase/schema.sql` once in
  your Supabase project's SQL editor to create the `orders` table.
- `NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY` + `FLUTTERWAVE_SECRET_KEY` +
  `FLUTTERWAVE_SECRET_HASH` — from your Flutterwave dashboard. Powers
  the second payment option on `/checkout/[slug]`, alongside
  Paystack. `FLUTTERWAVE_SECRET_HASH` is a value you set yourself in
  the Flutterwave dashboard under Settings → Webhooks — it's not
  generated for you like Paystack's signature.
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the
  public counterparts to the two Supabase vars above (same project,
  different keys). Used only by `/vault` in the browser; safe to
  expose since row access is enforced by RLS, not by this key.
- `NEXT_PUBLIC_SITE_URL` — your real domain in production. Used to
  build the checkout link in quote emails and as the magic-link
  redirect target for `/vault`.
- `ADMIN_EMAILS` — comma-separated list of emails allowed to use
  `/admin/quotes`. Checked server-side against a real Supabase Auth
  session — see "Admin access" below.

### What happens on a successful payment

Each processor has two paths in. For fixed-price checkout
(`/checkout/[slug]`), both call the same `recordPaidOrder()`
(`lib/orders.ts`). For quote deposits/balances
(`/checkout/quote/[id]`), both call `recordQuoteStagePayment()`
(`lib/quotePayments.ts`) instead — the webhooks tell the two apart by
checking for `metadata.quote_id` on the transaction before deciding
which one to call:

1. **Client-triggered** (`/api/paystack/verify`,
   `/api/flutterwave/verify` for fixed-price;
   `/api/quotes/[id]/pay` for quotes) — called the moment the payment
   popup closes, so the checkout page can show a confirmation screen
   immediately.
2. **Webhook** (`/api/paystack/webhook`, `/api/flutterwave/webhook`)
   — the real source of truth for both flows. Fires from the
   processor's servers regardless of whether the client's browser
   stayed open, and routes to whichever recorder the payment's
   metadata indicates.

`recordPaidOrder()` and `recordQuoteStagePayment()` each:

1. Write to Supabase (`orders`, or `quotes` + a matching `orders` row).
2. Email the client a confirmation.
3. Email you a notification at `CONTACT_TO_EMAIL`.

**To set up the webhooks:**
- Paystack: Settings → API Keys & Webhooks →
  `https://yourdomain.com/api/paystack/webhook`
- Flutterwave: Settings → Webhooks →
  `https://yourdomain.com/api/flutterwave/webhook`, plus a
  self-chosen "Secret Hash" that must match `FLUTTERWAVE_SECRET_HASH`

**On duplicate delivery:** if both paths fire for the same payment
(the common case), both recorders check Supabase for existing state
first (an `orders` row by reference, or a quote's `deposit_paid`/
`balance_paid` flag) and skip re-sending emails if it's already
recorded. This dedupe only works when Supabase is configured —
without it, both paths will each send their own emails.

Without these set, the Contact form will fail gracefully with an
error message, and `/book` will fall back to a placeholder Cal.com
link that won't resolve to a real calendar.

## Deposit-based quotes (custom-scope services)

Brand Identity, Creative Direction, Packaging, Marketing Campaigns,
and Landing Pages don't have fixed prices, so there's no public "pay"
button for them — a client requests a quote via `/contact`, you agree
a total, then you generate a payment link from `/admin/quotes`.

This creates a `quotes` row, splits it 50/50 per your stated deposit
terms, and emails the client a link to `/checkout/quote/[id]`. That
page collects the deposit first (Paystack or Flutterwave), then — once
paid — reveals a second payment for the remaining balance. Every
payment on it also lands in the `orders` table, tagged with the
`quote_id`, so it shows up in `/vault` alongside fixed-price orders.

### Admin access

`/admin/quotes` requires signing in at `/admin/login` — the same
Supabase magic-link pattern as `/vault`, but with a second check:
`lib/adminAuth.ts` verifies the signed-in session server-side and
confirms the email is in `ADMIN_EMAILS` before any admin API route
does anything. Signing in isn't enough on its own — an email not on
that list gets a 401 even with a valid session, so the enforcement
lives in the API routes, not just in what the page shows you.

This means real people, not a shared password: add teammates by
adding their email to `ADMIN_EMAILS`, remove access by taking it out
— no secret to rotate or leak.

## The Studio Vault (client login)

`/vault` is a lightweight client portal — magic-link login (no
passwords) via Supabase Auth, then a dashboard showing that client's
own orders and quotes.

- `/vault/login` — client enters their email, gets a one-time sign-in
  link.
- `/vault` — protected; redirects to login if there's no session.
  Queries `orders` and `quotes` directly from the browser using
  Supabase's row-level security, so a client only ever sees rows
  where `customer_email` / `client_email` matches their own login
  email. No custom "get my orders" API route needed — the policies in
  `supabase/schema.sql` do that enforcement at the database level.

For this to work, your Supabase project needs **email auth enabled**
(it is by default) and the redirect URL
(`{NEXT_PUBLIC_SITE_URL}/vault`) allow-listed under Authentication →
URL Configuration → Redirect URLs.

This is intentionally an MVP — it covers "see what I've paid for and
pay what I still owe," not the fuller Studio Vault from the original
brief (messages, file downloads, brand asset library). Those would
each be a real addition on top of this foundation, not a quick one.

## Structure

- `app/page.tsx` — Home
- `app/about/page.tsx` — Manifesto
- `app/services/page.tsx` — Services & pricing
- `app/work/` — Selected Work archive (`/work`) + case files driven by
  `lib/projects.ts` via the shared `CaseStudy` component
- `app/contact/page.tsx` — General inquiry form (wired to `/api/contact`)
- `app/book/page.tsx` — Cal.com scheduling (Phase 2 booking flow)
- `app/checkout/[slug]/page.tsx` — Fixed-price checkout (Paystack + Flutterwave)
- `app/checkout/quote/[id]/page.tsx` — Deposit → balance checkout for a quote
- `app/vault/` — Client login (`/vault/login`) + dashboard (`/vault`)
- `app/notebook/` — Studio Notebook (index + entries), from `lib/notebook.ts`
- `app/what-if/page.tsx` — Speculative branding explorations, from `lib/whatIf.ts`
- `app/materials/page.tsx` — Material Library, from `lib/materials.ts`
  (linked in the footer, cross-referenced with the case studies)
- `components/HiddenMark.tsx` + `components/CollectibleTracker.tsx` —
  hidden clickable marks scattered across the site (Home, About,
  each case study, What If, Materials); `CollectibleTracker` in the
  root layout shows progress once the first one's found. State is
  localStorage-only — see `lib/useCollectibles.ts`, `lib/collectibles.ts`.
- `app/api/contact/route.ts` — Sends inquiry emails via Resend (includes
  the Brand Feeling Scale selections from `/contact`)
- `app/api/paystack/verify/route.ts` — Client-triggered payment check
- `app/api/paystack/webhook/route.ts` — Paystack webhook (source of truth)
- `app/api/flutterwave/verify/route.ts` — Client-triggered payment check
- `app/api/flutterwave/webhook/route.ts` — Flutterwave webhook (source of truth)
- `app/api/quotes/create/route.ts` — Admin-only: generates a deposit-based quote
- `app/api/quotes/route.ts` — Admin-only: lists all quotes
- `app/api/quotes/[id]/route.ts` — Public read of one quote (for checkout)
- `app/api/quotes/[id]/pay/route.ts` — Verifies + records a deposit/balance payment
- `app/admin/login/page.tsx` — Admin magic-link sign-in
- `app/admin/quotes/page.tsx` — Internal UI for creating quotes + seeing status
- `lib/orders.ts` — Shared, dedupe-aware order recording logic
- `lib/quotes.ts` — Quote create/read/mark-paid helpers
- `lib/quotePayments.ts` — Shared quote deposit/balance payment recorder,
  called by both `/api/quotes/[id]/pay` and the two payment webhooks
- `lib/adminAuth.ts` — Server-side admin session + ADMIN_EMAILS check
- `lib/projects.ts`, `lib/services.ts`, `lib/notebook.ts` — content data
- `lib/supabase.ts` — server-only Supabase admin client (service role)
- `lib/supabaseClient.ts` — browser Supabase client (anon key, for
  `/vault` and `/admin`)
- `lib/email.ts` — order, quote, and studio notification emails
- `supabase/schema.sql` — `orders` + `quotes` tables and RLS policies
- `components/` — Nav, Footer, Seal, Button, Reveal, MenuRow,
  ProjectCard, CaseFileHeader, CaseStudy, CalEmbed, PaystackButton,
  FlutterwaveButton

## Design tokens

Colors, fonts, and easing live in `tailwind.config.ts` and
`app/globals.css`. Fonts (Fraunces, Manrope, JetBrains Mono) load via
`next/font/google` in `app/layout.tsx` — no external font requests at
runtime.

## Next steps (Phase 2, continued)

- Studio Vault, fuller version: messages between you and the client,
  downloadable brand assets, invoice PDFs. The current `/vault` reads
  `orders` and `quotes` directly — a `deliverables` table (files,
  links) would slot in the same way.
- Analytics on top of `orders`/`quotes`: monthly revenue, most-booked
  service, conversion rate — all queryable now that real payment data
  is flowing into Supabase.
