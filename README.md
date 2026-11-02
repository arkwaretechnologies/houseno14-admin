# House No 14 Admin Dashboard

Enterprise-grade admin console for **House No 14** — smart membership, wallet, court booking, and Open Play.

Separate from the [Member PWA](https://github.com/arkwaretechnologies/houseno14), connected to the same Supabase backend.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS 4 + custom glassmorphism design system
- shadcn-style Radix UI primitives
- Framer Motion
- Supabase (Auth, Postgres, RLS, Realtime)
- TanStack Query + React Table
- React Hook Form + Zod
- Zustand
- ApexCharts
- jsPDF / SheetJS (xlsx)

## Features

- Role-based access: Super Admin, Manager, Cashier, Receptionist, Coach
- 18 operational modules (Members → Settings)
- Live dashboard widgets + ApexCharts analytics
- Open Play queue with auto match generation (4 players → court)
- RFID assign/replace + scan monitoring
- Wallet top-up approvals
- TV display manager + fullscreen lobby boards
- Audit logs, reports (PDF/CSV/Excel hooks)
- AI Insights (forecast, churn, queue optimization — demo layer)
- Multi-branch ready schema from day one
- Demo Mode (works without Supabase credentials)

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Login** → **Demo Mode**.

### Demo credentials (local UI)

When Supabase env vars are unset, the login form falls back to Demo Mode. Or use the **Demo Mode** tab and pick a role.

For live Supabase, create a staff Auth user and a matching `profiles` row with `role` = `staff` or `admin` and an `admin_role` (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).

## Environment

See `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Use the **same Supabase project** as the House No 14 member app.

## Database

The member PWA owns the core schema (`profiles`, `bookings`, `wallets`, `open_play_*`, etc.).

Apply only additive admin migrations if your project is missing admin-only objects (audit logs, TV displays, `admin_role` on `profiles`, etc.) — do not recreate member tables.

Refresh types after schema changes:

```bash
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```

> UI demo types in `src/types/index.ts` are a friendly admin view model. Live mode uses shared table names (`profiles`, `bookings`, `merchandise_products`, …).

## Architecture

```
src/
  app/                 # App Router pages (feature routes)
  components/          # UI + layout + shared
  hooks/               # Realtime + utilities
  lib/                 # Supabase, brand, permissions, validations, demo data
  services/            # Data access layer
  store/               # Zustand auth/UI
  types/               # Domain + Database types
  utils/               # Export helpers
  modules/             # Feature modules (extend here)
supabase/migrations/   # SQL schema, RLS, RPCs, realtime (when present)
```

## Roles → Modules

| Role | Access |
|------|--------|
| Super Admin | All modules |
| Manager | All except destructive system overrides as configured |
| Cashier | Dashboard, Members, Memberships, Wallet, Inventory, Promotions, Reports |
| Receptionist | Members, RFID, Attendance, Reservations, Queue, Matches, Notifications |
| Coach | Members, Attendance, Courts, Matches, Tournaments, Rankings, Queue |

## Scripts

```bash
npm run dev          # Turbopack dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Unit tests (node --test)
```

## Deployment (Vercel)

1. Push repo to GitHub
2. Import in Vercel
3. Set env vars from `.env.example`
4. Deploy
5. Ensure Supabase schema matches admin expectations
6. Enable Realtime for published tables if not already applied by migration

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Security notes

- Authorization uses `profiles.admin_role` (fine-grained staff role)
- RLS enabled on public tables
- Service role key must never be exposed to the browser
- Audit trigger captures before/after payloads for sensitive tables (extend as needed)

## License

Proprietary — Arkware / House No 14
