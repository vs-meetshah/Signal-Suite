# Pine Signal Lab - TradingView Indicators Marketplace

## Overview
A premium web application for browsing and subscribing to TradingView indicators. Users can browse indicators organized by All/Free/Premium tiers, view detailed pages, add to cart with configurable subscription durations, sign up or log in via email-based detection, and place orders with auto-filled details.

## Tech Stack
- **Frontend**: React + TypeScript, Wouter routing, TanStack Query, Framer Motion
- **Backend**: Express.js, Drizzle ORM, PostgreSQL, express-session + connect-pg-simple
- **Styling**: Tailwind CSS, Shadcn UI components
- **Font**: Inter (sans), Playfair Display (serif), JetBrains Mono (mono)

## Architecture
- `shared/schema.ts` - Data models (indicators, users, orders, orderItems)
- `server/db.ts` - Database connection (exports pool + db)
- `server/seed.ts` - Seed data for 8 indicators (6 premium, 2 free)
- `server/storage.ts` - DatabaseStorage class implementing IStorage
- `server/routes.ts` - API routes (indicators, auth, orders)
- `server/index.ts` - Express app setup with session middleware
- `client/src/components/auth-provider.tsx` - Auth context (user state, signup/login/logout)
- `client/src/components/auth-modal.tsx` - Signup/Login modal with email detection
- `client/src/components/cart-provider.tsx` - Cart state with localStorage persistence
- `client/src/components/navbar.tsx` - Top navigation with auth state (Sign Up / avatar)
- `client/src/components/theme-toggle.tsx` - Dark/light mode toggle
- `client/src/components/indicator-card.tsx` - Card component for indicator grid

## Pages
- `/` - Home page with hero, features, CTA
- `/indicators` - Indicators page with tier filters (All/Free/Premium)
- `/indicator/:slug` - Rich indicator detail page: hero with video, preview image, stats, about, markets & timeframes, signal logic, entry/exit rules, risk management (stop-loss + targets), recommended settings per timeframe, key features, CTA
- `/cart` - Cart with duration selection, smart proceed (auth check)
- `/checkout` - Auto-filled form for logged-in users, registration form for guests
- `/dashboard` - User dashboard with order history, active indicators, pending requests
- `/admin` - Admin console with sidebar (Dashboard / Analytics / Editor). Dashboard shows stats cards and a "Today's New Requests" panel (per-order rows with a compact Action dropdown — Grant/Reject/Hold — plus Quick View, View Details, and a CSV export). Clicking "View" on a request opens a slide-over user-detail sheet from the right edge.

## API Routes
- `GET /api/indicators` - List all indicators
- `GET /api/indicators/:slug` - Get indicator by slug
- `GET /api/auth/me` - Get current authenticated user (401 if not)
- `GET /api/auth/check-email?email=` - Check if email exists, returns user data if found
- `POST /api/auth/signup-or-login` - Create or log in user by email detection
- `POST /api/auth/update` - Update authenticated user profile
- `POST /api/auth/logout` - Destroy session
- `GET /api/dashboard` - Get user's orders with enriched items (access status, days remaining)
- `POST /api/orders` - Create order (requires auth)

## Database Tables
- `indicators` - Product catalog (name, slug, category, tier, price, features, stats, markets, bestTimeframes, signalLogic, entryConditions, exitConditions, stopLossStrategy, targetStrategy, recommendedSettings)
- `users` - User accounts (name, email unique, username, mobile, TradingView username)
- `orders` - Order records (userId, status, totalAmount, approvedAt)
- `order_items` - Individual items in orders (indicatorId, duration, price, isTrial)
- `session` - Express session store (auto-created by connect-pg-simple)

## Auth Flow
- Email-based detection: entering an existing email auto-fills the form (welcome back)
- New email creates a new account on submit
- Session-based persistence (30-day cookie)
- Navbar shows "Sign Up" for guests, avatar+dropdown for logged-in users
- Cart "Proceed" opens auth modal for guests, navigates directly for logged-in users
- Checkout auto-fills and shows read-only details for logged-in users with "Edit" option

## Dashboard
- Stats cards: Active Indicators count, Pending Requests count, Total Orders count
- Active Indicators section: shows indicators with "active" access status and days remaining
- Pending Access Requests: shows items from pending orders awaiting admin approval
- Order History: all orders with status badges (Pending/Approved/Rejected), items with access status
- Access computed from order.approvedAt + item.duration months; expired if past that date

## Key Features
- Three-tier system: Free indicators (green badge, $0) and Premium (amber badge, priced)
- Free trial option for premium indicators
- Cart with configurable duration (1-12 months)
- Smart auth: single form for signup + login
- User dashboard with order tracking and active indicator access
- Dark/light mode toggle
- Responsive design
- Framer Motion animations
