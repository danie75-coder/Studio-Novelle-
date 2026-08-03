# First Test Pass

None of this code has been run. Go through it in this order — each
step assumes the ones before it work, so stop and fix rather than
skip ahead if something breaks.

## 0. Install & boot

```bash
npm install
cp .env.example .env.local
npm run dev
```

Expect TypeScript/build errors on the first run — this was written
without a compiler checking it. Fix what `npm run dev` or
`npm run build` surfaces before testing anything below.

## 1. Static pages (no env vars needed)

Visit each and check it renders without console errors:

- [ ] `/` — Home
- [ ] `/about`
- [ ] `/services`
- [ ] `/work` — archive index
- [ ] `/work/veloura`, `/work/hollow-moon`, `/work/aurelia-hotels`
- [ ] `/notebook` and one entry, e.g. `/notebook/negative-space`

Check: the loading screen on Home, hover states on buttons/cards, the
footer's hidden-quote hover, the seal rotating on hover in the nav.

## 2. Contact form (needs `RESEND_API_KEY`, `CONTACT_TO_EMAIL`)

- [ ] Submit `/contact` with all fields filled in
- [ ] Confirm the "Sending…" → success-card transition
- [ ] Confirm the email actually arrives at `CONTACT_TO_EMAIL`
- [ ] Submit with `RESEND_API_KEY` unset (comment it out) — confirm
      it fails with a visible error, not a silent hang or crash

## 3. Booking (needs `NEXT_PUBLIC_CAL_LINK`)

- [ ] `/book` loads the Cal.com embed with your real event type
- [ ] Book a test slot, confirm it lands on your calendar

## 4. Fixed-price checkout (needs Paystack + Flutterwave keys)

For each of the four fixed-price services
(`linkedin-branding`, `social-media-design`, `advertising-design`,
`copywriting` under `/checkout/[slug]`):

- [ ] Pay with **Paystack** using their test card, confirm the
      success screen appears
- [ ] Pay with **Flutterwave** using their test card, confirm the
      success screen appears
- [ ] After each: check Supabase `orders` table has a new row
- [ ] Check you received the "New Paid Order" email
- [ ] Check the test email address received "Payment Confirmed"

**Close-the-tab test (important — this is what the webhooks exist
for):** start a payment, complete it on the processor's page, then
close the tab *before* it redirects back. Confirm the webhook still
records the order within a minute or two (check `orders` in
Supabase). If it doesn't, the webhook URL likely isn't configured
correctly in the Paystack/Flutterwave dashboard — see README.

## 5. Deposit-based quotes (needs Supabase + `ADMIN_EMAILS`)

- [ ] Sign in at `/admin/login` with an email in `ADMIN_EMAILS`
- [ ] Confirm an email **not** in `ADMIN_EMAILS` gets rejected (401)
      even after successfully signing in — this is the actual
      security boundary, worth confirming it holds
- [ ] Create a test quote from `/admin/quotes`
- [ ] Confirm the client received the quote-link email
- [ ] Open the checkout link, pay the deposit (try one with Paystack,
      a separate quote with Flutterwave)
- [ ] Confirm the page flips to "pay remaining balance"
- [ ] Pay the balance, confirm it shows "fully paid"
- [ ] Check Supabase: `quotes.deposit_paid` and `quotes.balance_paid`
      are both `true`, and two rows exist in `orders` tagged with
      that `quote_id`

**Same close-the-tab test as above, but for a quote deposit** — this
is the specific bug that got fixed in this session, so it's worth
deliberately trying to break: pay a deposit, close the tab before the
page updates, then check Supabase directly to confirm
`deposit_paid` became `true` anyway via the webhook.

## 6. The Vault (needs Supabase + email auth enabled)

- [ ] Request a magic link at `/vault/login` using the same email you
      used in a test order or quote above
- [ ] Confirm `/vault` shows that order/quote
- [ ] Sign in with a **different** email that has no orders — confirm
      it shows an empty state, not someone else's data (this is the
      RLS policy actually working, not just the UI filtering)

## 7. Loose ends worth deciding on, not just testing

- The five custom-scope services still say "Request a Quote" and
  route to `/contact` — decide whether that's the permanent flow or
  whether you want it to point at `/admin/quotes` messaging instead.
- `/admin/quotes` has no rate limiting beyond Supabase Auth itself —
  fine at low volume, worth revisiting if this becomes a daily tool.
- No automated tests exist anywhere in this project. That's a
  reasonable tradeoff for a marketing site + light commerce layer,
  less so if the checkout logic keeps growing in complexity.

## 8. Hidden collectibles (client-side only, no env vars)

- [ ] Click the small gold dot next to "Studio Novelle — Creative
      Direction..." on Home — confirm the "Found ✦" toast and that a
      tracker pill appears bottom-right
- [ ] Find the rest: About (near "The Studio"), each of the three
      case studies (near "The Decision That Changed Everything"),
      What If (near "Your Turn"), Materials (near the page title) —
      7 total
- [ ] Confirm the tracker count updates and persists across a page
      refresh (it's in localStorage — clearing site data resets it)
- [ ] Find all 7 and confirm the "All Found" unlock message appears
