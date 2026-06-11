# Supabase Setup

## Create Project

Create a Supabase project named `reservly` in the preferred region. For Mauritius, `ap-southeast-1` is a good default.

Current blocker: the available organization has reached the free active project limit, so project creation needs one active project paused/deleted or an org upgrade.

## Apply Migrations

Migration files live in `supabase/migrations/`.

Apply:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

If using the Supabase MCP connector, apply:

```text
20260611000000_reservly_core.sql
```

## Schema

The migration creates:

- `profiles`
- `businesses`
- `services`
- `availability`
- `bookings`
- `message_events`
- `subscriptions`

## Security Rules

- RLS is enabled on every public table.
- Owners can manage only their own businesses, services, availability, bookings, message events, and subscriptions.
- Public users can read booking-page business details, active services, availability, and taken slot times.
- Public booking creation is limited to pending public bookings and is validated by a database trigger.
- Double booking is blocked with a GiST exclusion constraint.
- Free businesses default to `booking_limit_monthly = 15`.

## Advisors and Types

After migrations are applied:

```bash
supabase db lint
supabase gen types typescript --linked > src/lib/database.types.ts
```

Or use the Supabase connector advisors and type generation tools for the selected project.
