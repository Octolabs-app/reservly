# Deployment

## Preflight

Run:

```bash
npm install
npm run lint
npm run typecheck
npm run build
```

## Provider Setup

1. Create the private GitHub repository `octolabs-app/reservly`.
2. Push this repository.
3. Create or select a deployment project for the TanStack Start app.
4. Add all variables from `ENVIRONMENT_VARIABLES.md`.
5. Apply Supabase migrations.
6. Configure Twilio and Stripe webhooks after the deployment URL exists.

Do not configure the final custom domain yet.

## Manual Checks

- Create an owner account.
- Complete onboarding.
- Open the public booking link.
- Create a booking.
- Confirm the dashboard shows the booking.
- Cancel and manually confirm bookings from `/dashboard/bookings`.
- Verify Free plan usage reads `15 / 15 bookings used` when full.
- Test Twilio with env vars missing first; messages should log.
- Test Stripe with env vars missing first; checkout should not crash.

## Current Blockers

- Supabase project creation is blocked by the active free project limit in the available organization.
- GitHub repo creation is blocked because `gh` is not installed/authenticated, SSH auth is denied, and the connector does not expose org repo creation.
