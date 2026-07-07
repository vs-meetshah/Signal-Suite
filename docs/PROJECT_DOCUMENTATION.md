# Pine Signal Lab — Complete Project Documentation

A premium TradingView indicators & strategies marketplace tailored for the
Indian market. This document is intended as a developer-facing reference
covering the entire system: tech stack, data model, pages, features,
business rules, REST API and admin tooling.

---

## 1. Overview

**Product:** Pine Signal Lab is a curated marketplace where retail traders can
browse, trial and subscribe to professionally built TradingView indicators
and strategies. Access is granted by inviting the customer's TradingView
username to invite-only Pine scripts after the order is approved by an
admin.

**Audience:** Indian retail traders. All pricing is shown in INR (₹).

**Core flows:**
1. Browse catalog → open indicator detail → pick version & duration → add to cart
2. Email-based sign-up / sign-in → checkout → order goes to "pending"
3. Admin reviews pending orders, approves (or rejects with reason)
4. On approval, customer dashboard shows the subscription as "active"
   with days remaining

---

## 2. Tech Stack

| Layer       | Technology |
|-------------|------------|
| Frontend    | React 18 + Vite + TypeScript |
| Routing     | wouter |
| Data fetch  | TanStack Query v5 |
| UI library  | shadcn/ui (Radix primitives + Tailwind) |
| Styling     | TailwindCSS, custom CSS vars in `index.css`, dark-mode via `class` |
| Animation   | framer-motion |
| Forms       | react-hook-form + zod |
| Icons       | lucide-react, react-icons (`si` for brand logos) |
| Backend     | Node.js + Express |
| ORM         | Drizzle ORM |
| Database    | PostgreSQL (Replit-managed; access via `DATABASE_URL`) |
| Auth        | Server-side sessions (`express-session`, secret = `SESSION_SECRET`) |
| Validation  | zod (shared schemas in `shared/schema.ts`) |

The Vite dev server and the Express API are served on the same port; routes
prefixed with `/api/*` go to Express and everything else is handled by
the React SPA.

---

## 3. Repository Layout

```
client/
  src/
    App.tsx                # Router & providers
    main.tsx               # React entrypoint
    index.css              # Theme tokens (HSL CSS vars), light & dark
    pages/
      home.tsx             # Landing page
      indicators.tsx       # Catalog
      indicator-detail.tsx # Product detail + pricing dialog
      cart.tsx             # Cart page
      checkout.tsx         # Checkout (collect TradingView username, etc.)
      dashboard.tsx        # Customer dashboard (orders, access, watchlist)
      admin.tsx            # Admin shell + sidebar
      support.tsx          # Help & Support
      about.tsx            # About Pine Signal Lab
      not-found.tsx
    components/
      navbar.tsx           # Top navigation
      auth-provider.tsx    # Session-aware auth context
      auth-modal.tsx       # Email-first sign in / sign up modal
      cart-provider.tsx    # Cart context (localStorage-backed)
      indicator-card.tsx   # Catalog card (with watchlist bookmark)
      chart-preview.tsx    # Synthetic candle chart used on cards
      theme-toggle.tsx     # Light/dark switch
      ui/*                 # shadcn primitives
      admin/
        admin-dashboard.tsx
        admin-editor.tsx
        admin-analytics.tsx
server/
  index.ts                 # Express bootstrap, session middleware
  routes.ts                # All REST endpoints
  storage.ts               # IStorage interface + Postgres implementation
  db.ts                    # Drizzle client
  seed.ts                  # Seeds default indicators & admin user
  static.ts                # Production static serving
  vite.ts                  # Dev integration with Vite
shared/
  schema.ts                # Drizzle tables + zod insert/update schemas
docs/
  PROJECT_DOCUMENTATION.md # This file
```

---

## 4. Data Model

All tables live in `shared/schema.ts`. Drizzle generates strongly-typed
`Indicator`, `User`, `Order` and `OrderItem` types that are reused on the
frontend through the `@shared/*` alias.

### 4.1 `indicators`
| Column                | Type            | Notes |
|-----------------------|-----------------|-------|
| id                    | serial PK       | |
| name, slug            | text            | slug is unique, used in URLs |
| shortDescription      | text            | listing card subtitle |
| description           | text            | long copy on detail page |
| category              | text            | e.g. "Trend Following", "Smart Money" |
| tier                  | text            | `"free"` or `"premium"` (default `premium`) |
| price                 | text (INR)      | monthly base price; `"0"` for free |
| videoUrl, imageUrl    | text            | optional media |
| features              | text[]          | bullet points |
| winRate, avgReturn, totalTrades, avgRR, profitFactor | text | display-only stats |
| trialDays             | integer         | default 7 (we display 15 in UI) |
| markets               | text[]          | "NIFTY", "Forex", "Crypto", "Stocks", "Commodities" |
| bestTimeframes        | text[]          | "1m", "5m", "15m", "1H", "4H", "1D", "1W" |
| signalLogic, entryConditions, exitConditions, stopLossStrategy, targetStrategy, recommendedSettings | text | rich description fields |
| nonRepainting         | boolean         | shown as a trust badge |
| faqs                  | jsonb           | `{q,a}[]` |
| tags                  | text[]          | |
| bestMarket, tradingViewSymbol | text    | |
| rating, reviewCount   | text / integer  | shown on the card |
| versionLabel, publishedDate, developer | text   | meta-info |

### 4.2 `users`
| Column              | Type          | Notes |
|---------------------|---------------|-------|
| id                  | serial PK     | |
| firstName, lastName | text          | |
| username            | text          | display handle (not unique) |
| email               | text UNIQUE   | login key |
| mobileNumber        | text          | E.164-ish, validated regex |
| tradingViewUsername | text          | required for invite-only access |
| isAdmin             | boolean       | bootstrapped via `ADMIN_EMAIL` env var |
| createdAt           | timestamp     | |

### 4.3 `orders`
| Column          | Type       | Notes |
|-----------------|------------|-------|
| id              | serial PK  | |
| userId          | integer FK | |
| status          | text       | `pending` (default), `approved`, `rejected` |
| totalAmount     | text (INR) | computed server-side from items |
| rejectionReason | text       | populated on reject |
| createdAt       | timestamp  | |
| approvedAt      | timestamp  | set when admin approves; access expiry is computed from this |

### 4.4 `order_items`
| Column      | Type       | Notes |
|-------------|------------|-------|
| id          | serial PK  | |
| orderId     | integer FK | |
| indicatorId | integer FK | |
| duration    | integer    | months, 1–12 (ignored when `isTrial`) |
| price       | text (INR) | server-recomputed at checkout |
| isTrial     | boolean    | trial flag (premium only, fixed price ₹5,250 / strategy = ×1.35) |
| version     | text       | `"indicator"` or `"strategy"` (the "both" UI option produces two items) |

### 4.5 `session` (managed by `connect-pg-simple`)
Created automatically by `express-session`. **Do not run `npm run db:push`
directly** because it can drop the session table; if a schema sync is
needed, use `npm run db:push --force` or alter the relevant table by hand.

---

## 5. Pricing Rules

### 5.1 Version multipliers
Defined in `client/src/components/cart-provider.tsx` and mirrored on the
server in `POST /api/orders`.

| Version    | Price formula                                      |
|------------|----------------------------------------------------|
| Indicator  | `indicator.price` (monthly)                        |
| Strategy   | `Math.round(indicator.price * 1.35)`; if free, ₹499 |
| Both       | `Indicator + Strategy`                             |

### 5.2 Trial pricing (premium only)
Fixed ₹5,250 base; Strategy variant ×1.35; "Both" trial = ₹5,250 + ₹7,088.

### 5.3 Duration discounts
Applied in the pricing dialog (`client/src/pages/indicator-detail.tsx`,
constant `DURATION_DISCOUNTS`) for the listed presets:

| Duration | Discount |
|----------|----------|
| 1 month  | 3%       |
| 3 months | 6%       |
| 6 months | 9%       |
| 9 months | 12%      |
| 12 months| 24%      |
| Other    | 0%       |

The pricing dialog shows the original price (strikethrough), the
discounted price and the savings. The Final Price card mirrors the same
math. **The server currently charges `monthly × duration` without these
discounts** — keep the formulas in sync if you want them honored at
checkout (see "Known Considerations").

### 5.4 Cart constraints
- Minimum duration: 1 month, maximum: 12 months.
- All items in a cart must share the same `version` (Indicator / Strategy / Both).
  The cart will refuse to add a mismatched item and prompt the user to
  clear the cart.
- One indicator can only appear once per cart.

---

## 6. Authentication & Sessions

- **Email-first**: the auth modal first calls
  `GET /api/auth/check-email` to detect returning users. Returning users
  see a confirmation step with their TradingView username pre-filled.
- **No password**: sign-up and sign-in are handled by a single endpoint
  `POST /api/auth/signup-or-login` which creates a new user or logs in
  an existing one.
- **Sessions**: `express-session` with `connect-pg-simple` persistence,
  `httpOnly` cookies, signed with `SESSION_SECRET`.
- **Admin bootstrap**: at signup/login, if the user's email matches the
  `ADMIN_EMAIL` env var, `isAdmin` is automatically set to true.
- **Logout**: `POST /api/auth/logout`.
- **Profile update**: `POST /api/auth/update` accepts the
  `updateUserProfileSchema` (first/last name, mobile, TradingView username).

---

## 7. Pages

### 7.1 `/` Home
File: `client/src/pages/home.tsx`

- Hero with call-to-action ("Explore Indicators", "Learn more").
- Trust messaging, featured indicators preview, footer CTA.

### 7.2 `/indicators` Catalog
File: `client/src/pages/indicators.tsx`

- Hero + 3 trust badges (Non-Repainting / Proven Results / Easy to Use).
- Tier tabs at top: **All / Free / Premium** (filters by `indicator.tier`).
- A **Filters** popover (icon button with `SlidersHorizontal`) replaces the
  legacy sidebar. It has two facets:
  - **Category**: Scalping / Intraday / Swing / Positional. Selection
    matches against `indicator.bestTimeframes` via regex
    (e.g. Scalping ≈ 1m/3m/5m, Intraday ≈ 15m/30m/1H/4H, etc.).
  - **Markets**: NIFTY / Forex / Crypto / Stocks / Commodities. Matches
    against `indicator.markets`.
  - The trigger button shows a badge with the active filter count.
- Indicator cards (`indicator-card.tsx`):
  - Top right corner badge:
    - `rating >= 4.8` → blue **Trending**
    - `reviewCount >= 80` → emerald **Popular**
    - `id % 5 === 0` → orange **New**
  - Synthetic candle preview chart, tier badge, name, short description.
  - Footer: rating + review count (left), "View Details →" (center),
    bookmark icon (right) which toggles the indicator into the
    `pinesignallab.watchlist` localStorage list and dispatches a
    `watchlist-updated` event.

### 7.3 `/indicator/:slug` Detail
File: `client/src/pages/indicator-detail.tsx`

- Header: breadcrumbs, name, short description, version + published date.
- Stats strip: rating, reviews, win rate, RR, profit factor.
- Action buttons: **Get Access** opens the pricing dialog;
  **Add to Watchlist** toggles `pinesignallab.watchlist`.
- Tabbed content: Overview / Quick Start / Reviews / FAQ.
- A live-feel chart preview component renders synthetic candles.
- **Pricing dialog** (`Dialog` from shadcn):
  - Version selector: Indicator / Strategy / Indicator + Strategy.
  - Trial toggle in the dialog header.
  - Duration slider (1–12 months) with preset buttons (1, 3, 6, 9, 12).
    Each preset displays the original total (struck through) and the
    discounted total per the duration discount table.
  - Final Price card: shows original total, discounted total, "Save ₹X
    (Y% off)" line.
  - Add-to-cart button (or "Go to Cart" if already in cart).
  - **15 Days Trial banner** at the bottom: shows the trial price for
    the currently selected version; clicking it switches the dialog
    into trial mode.

### 7.4 `/cart` Cart
File: `client/src/pages/cart.tsx`

- Lists each cart item: indicator name, version label, duration stepper,
  price.
- Trial items are read-only (fixed duration).
- Shows a running total and a "Proceed to Checkout" button.
- Empty state with CTA to browse the catalog.

### 7.5 `/checkout` Checkout
File: `client/src/pages/checkout.tsx`

- If logged out, opens the auth modal first.
- Collects/confirms profile fields used for delivery
  (first/last name, mobile, TradingView username).
- Submits cart to `POST /api/orders`. The server re-validates each
  item's price (anti-tampering) and writes one row per item.
- On success: clears cart and routes to `/dashboard`.

### 7.6 `/dashboard` Customer Dashboard
File: `client/src/pages/dashboard.tsx`

- Greeting with first name.
- **Stat cards (also act as filter tabs)**:
  - Active Indicators (count of items with `accessStatus === "active"`)
  - Pending Requests (count of items with `accessStatus === "pending"`)
  - Total Orders (count of orders)
  - Saved Indicators (size of `pinesignallab.watchlist` resolved against
    `/api/indicators`)
- Selecting a card filters the detail panel to only that section.
- Sections:
  - **Active Indicators** — grid of cards showing indicator name, tier
    badge, days remaining (or "Lifetime" if no `approvedAt` recorded).
  - **Pending Requests** — list of pending items. If the parent order is
    older than **24 hours**, the card displays a "Contact Support Team"
    button that opens WhatsApp (`https://wa.me/918920167711`) with a
    pre-filled message containing the order id and indicator name.
  - **Saved Indicators** — bookmark list (synced via `storage` and
    `watchlist-updated` events).
  - **Order History** — every order with status badge and total. Each
    item row links to its indicator. Rejected orders show the rejection
    reason and a "Contact Support Team" WhatsApp button. Pending orders
    older than 24 hours show the same support strip.

### 7.7 `/support` Help & Support
File: `client/src/pages/support.tsx`

- Hero, three contact cards (Email, WhatsApp, Onboarding).
- 5-question FAQ accordion (access, trial, version switching, refunds,
  supported markets).
- Frontend-only contact form (name, email, subject, message) with toast
  confirmation. **Wire to a real channel before launch.**

### 7.8 `/about` About Pine Signal Lab
File: `client/src/pages/about.tsx`

- Hero, stats strip (10K+ Active Traders, 50+ Indicators, 24/7 Support,
  100% Non-Repainting), Mission / How-we-build cards, four "What we
  stand for" pillars, CTA back to `/indicators`.

### 7.9 `/admin` Admin (gated)
Files: `client/src/pages/admin.tsx`, `client/src/components/admin/*`

Visible only when `user.isAdmin === true`. Sidebar with three sections:

1. **User Management Dashboard** (`admin-dashboard.tsx`)
   - Tabs: All / Active / Pending / Free.
   - Search, sort, and a slide-in detail panel.
   - Per-user view of orders, total spent, approve/reject controls.
   - Reject dialog requires a reason; that reason appears on the
     customer dashboard.
2. **Indicator Editor** (`admin-editor.tsx`)
   - CRUD for `indicators` (create, edit, delete). Lists existing items;
     editor handles all the long-form fields, FAQs, markets,
     timeframes, etc.
3. **Analytics** (`admin-analytics.tsx`)
   - Aggregate KPIs from `GET /api/admin/analytics`.

---

## 8. REST API

All endpoints return JSON. Mutations expect a JSON body. Cookies carry
the session.

### 8.1 Public
| Method | Path                       | Purpose |
|--------|----------------------------|---------|
| GET    | `/api/indicators`          | List all indicators |
| GET    | `/api/indicators/:slug`    | Single indicator (404 if missing) |
| GET    | `/api/auth/check-email`    | `?email=` returns `{exists, user?}` |
| POST   | `/api/auth/signup-or-login`| Body validated by `insertUserSchema`; sets session cookie. Returns `{user, isNewUser}` |

### 8.2 Authenticated (session required)
| Method | Path                       | Purpose |
|--------|----------------------------|---------|
| GET    | `/api/auth/me`             | Current user (401 if no session) |
| POST   | `/api/auth/update`         | Update profile (`updateUserProfileSchema`) |
| POST   | `/api/auth/logout`         | Destroys session |
| GET    | `/api/access/:indicatorId` | `{hasAccess: boolean}` — true while an approved order's `approvedAt + duration months` is in the future |
| GET    | `/api/dashboard`           | All of the user's orders with item details and computed `accessStatus` (`pending`/`active`/`expired`/`rejected`) and `daysRemaining` |
| POST   | `/api/orders`              | Create a new order from a cart payload. Server re-validates prices, writes one `order_items` row per cart item; returns the order |

### 8.3 Admin (session + `isAdmin === true`)
| Method | Path                                | Purpose |
|--------|-------------------------------------|---------|
| GET    | `/api/admin/users`                  | All users with aggregated stats |
| GET    | `/api/admin/analytics`              | KPIs |
| POST   | `/api/admin/orders/:id/approve`     | Approve an order; sets `approvedAt = now()` |
| POST   | `/api/admin/orders/:id/reject`      | Body `{reason}`; sets status `rejected` |
| POST   | `/api/admin/indicators`             | Create indicator |
| PATCH  | `/api/admin/indicators/:id`         | Update indicator |
| DELETE | `/api/admin/indicators/:id`         | Delete indicator |

The admin guard middleware lives in `server/routes.ts` (`requireAdmin`).

### 8.4 Order item `accessStatus`
Computed in `GET /api/dashboard`:
- `rejected` — parent order rejected
- `pending` — parent order still pending
- `active` — order approved AND `approvedAt + duration months` is in the future (or no `approvedAt` recorded → treated as lifetime)
- `expired` — order approved but the computed window has passed

`daysRemaining` is `null` for lifetime/no-expiry items.

---

## 9. Frontend Patterns

- **TanStack Query v5** is the default data layer. `queryClient` lives in
  `client/src/lib/queryClient.ts`. The default `queryFn` reads the URL
  from `queryKey[0]`, so most queries are written as
  `useQuery({ queryKey: ["/api/foo", id] })`. Mutations use `apiRequest`
  and must invalidate the relevant `queryKey`.
- **Forms** use `useForm` + `zodResolver` against the `insertUserSchema`
  (or other shared zod schemas) and the `<Form>` wrapper from
  `components/ui/form.tsx`.
- **Routing** uses `wouter`. All routes are registered in `App.tsx`
  inside `<Switch>`; new pages must be added there.
- **Dark mode**: a `class="dark"` toggle on `documentElement`; theme
  state is persisted in `localStorage` by `theme-toggle.tsx`. Tailwind
  config sets `darkMode: ["class"]` and the CSS vars in `index.css`
  define both palettes (HSL components only, no `hsl()` wrapper).
- **Test IDs**: every interactive element and meaningful display element
  has a `data-testid` (pattern: `action-target` or `type-content`, with
  a stable id suffix on dynamic items). This convention is enforced for
  testability.

---

## 10. Local Storage Keys

| Key                    | Owner                    | Shape          |
|------------------------|--------------------------|----------------|
| `cart`                 | `cart-provider.tsx`      | `CartItem[]`   |
| `pinesignallab.watchlist` | `indicator-card.tsx`, `indicator-detail.tsx`, `dashboard.tsx` | `number[]` (indicator IDs) |
| `theme`                | `theme-toggle.tsx`       | `"light"` / `"dark"` |

Custom events:
- `watchlist-updated` — dispatched on `window` whenever the watchlist
  changes; listeners (catalog, dashboard) re-read from localStorage.
- `cart-item-added` — used by the navbar to bounce the cart icon.

---

## 11. Environment & Configuration

| Variable        | Required | Purpose |
|-----------------|----------|---------|
| `DATABASE_URL`  | yes      | Postgres connection string. Provided by Replit. |
| `SESSION_SECRET`| yes      | Cookie signing secret for `express-session`. |
| `ADMIN_EMAIL`   | optional | Email that should be auto-promoted to `isAdmin = true` on first login. |

Secrets must be managed through the platform's secret store, never
committed.

---

## 12. Running & Deployment

- **Dev**: workflow `Start application` runs `npm run dev`, which boots
  Express and Vite together on a single port. Editing source files
  triggers HMR.
- **Build**: `npm run build` produces a Vite client bundle and an
  Express server bundle. `npm start` serves the production build.
- **DB sync**: `npm run db:push` (use `--force` if it warns). Avoid
  destructive runs that drop the `session` table.
- **Deploy**: standard Replit deployment. The deployed app uses the
  production database; verify `ADMIN_EMAIL` and `SESSION_SECRET` are set
  in the production environment.

---

## 13. Support & Contact Channels

These are surfaced in the Help & Support page and on the dashboard
support buttons. Update centrally if they change.

- **Email**: support@pinesignallab.in
- **WhatsApp**: +91 89201 67711 (used in `dashboard.tsx` as
  `https://wa.me/918920167711` with a pre-filled message)
- **Hours**: Mon–Sat, 10 AM – 7 PM IST

---

## 14. Known Considerations / Follow-ups

1. **Discount enforcement on the server**: the duration discounts
   (3 / 6 / 9 / 12 / 24 %) are applied client-side in the pricing
   dialog. `POST /api/orders` currently re-prices items as
   `monthly × duration` without the discount, so the customer ends up
   paying the un-discounted total. To honor discounts at checkout, port
   `DURATION_DISCOUNTS` from `indicator-detail.tsx` into `routes.ts`
   and apply it in the price-recompute loop.
2. **Trial display vs schema**: the schema default for
   `indicators.trialDays` is 7, but the UI always speaks of a "15 Days
   Trial". Either backfill `trialDays = 15` in the seeder or change the
   UI copy to read the real value.
3. **Support form**: the contact form on `/support` only shows a toast.
   Wire it to an email service or ticketing system before launch.
4. **Hard-coded contact details**: WhatsApp number and email are
   inlined; consider extracting to a small `lib/contact.ts` so they can
   be updated in one place.
5. **Payments**: there is no payment gateway integration today. Orders
   move from `pending` → `approved` purely through admin review. If
   you wire Razorpay / Stripe, add a `paymentStatus` column on
   `orders` and verify it before allowing approval.
6. **Tests**: there is no automated test suite checked in. Component
   `data-testid`s are in place to make Playwright/RTL coverage easy to
   add.

---

## 15. Glossary

- **Indicator**: a visual TradingView script that draws signals on the
  chart but does not auto-trade.
- **Strategy**: the executable variant of an indicator that triggers
  alerts/orders. Priced at 1.35× the indicator base price (₹499 floor
  for free-tier strategies).
- **Trial**: a 15-day, fixed-price (₹5,250 base) preview of a premium
  indicator/strategy.
- **Tier**: `free` or `premium`. Free indicators have `price = "0"`.
- **Access**: the period during which an approved subscription grants
  the user invite-only access to the script on TradingView. Computed
  from `approvedAt + duration months`.
