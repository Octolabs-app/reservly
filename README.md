# Reservly

Reservly by Octolabs - WhatsApp-native booking for island businesses.

## Stack

- Framework: TanStack Start with TanStack Router, React 19, Vite, Nitro
- Styling: Tailwind CSS 4 with local Reservly components
- Package manager: the source package included `bun.lock`, but this workstation only has npm available
- Build command: `npm run build`
- Lint command: `npm run lint`
- Typecheck command: `npm run typecheck`
- Deployment target: Nitro/TanStack Start output, suitable for a supported Node or edge host after environment variables are configured

## Routes

- `/`
- `/auth`
- `/onboarding`
- `/b/$slug`
- `/b/$slug/confirmed`
- `/dashboard`
- `/dashboard/bookings`
- `/dashboard/settings`
- `/privacy`
- `/terms`
- `/api/twilio/inbound`
- `/api/stripe/checkout`
- `/api/stripe/webhook`

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in values.

3. Run locally:

   ```bash
   npm run dev
   ```

If Supabase env vars are missing, the app uses a local browser dev store so onboarding, booking, and dashboard flows remain usable. Production should use Supabase.

## Free Plan Rule

The Free plan allows 15 bookings per calendar month. Pro and Studio are unlimited. The migration enforces this rule with a database trigger, and the UI reads from the shared `FREE_BOOKING_LIMIT` constant.

## External Setup Status

GitHub repo creation and Supabase project creation are external provisioning steps. See `DEPLOYMENT.md` and `SUPABASE_SETUP.md`.
