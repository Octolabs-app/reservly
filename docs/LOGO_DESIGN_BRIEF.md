# Reservly — Logo / App Icon Design Brief

**Status:** A temporary in-house mark ships with the app today
(`public/favicon.svg`, `public/logo-mark.svg`, and the inline `<Brand />`
component). It is intentionally simple so it can be replaced 1:1 by a final
design without code changes — same files, same names.

## What we need

A final brand mark + small lockup for Reservly, a booking tool for small
island businesses (salons, barbers, beauty, wellness, tutors, small
appointment-based shops) in Mauritius, Réunion and Seychelles.

## Deliverables

1. **App icon / square mark** — works at 16px (favicon) up to 512px
   (PWA / social avatar). SVG + PNG exports (16, 32, 180, 192, 512).
2. **Horizontal lockup** — mark + "Reservly" wordmark for the site header
   and dashboard. SVG.
3. **Social preview (og:image)** — 1200×630, mark + tagline
   "Your customers book. WhatsApp confirms."
4. Monochrome variants (white on blue, blue on white).

## Direction

- Feeling: simple, professional, friendly, trustworthy. Not corporate-cold,
  not playful-childish. A business owner should be proud to send this link
  to customers.
- Theme: booking / calendar / appointment / confirmed reservation.
  The current temp mark is a calendar tile with a check — evolving that idea
  is welcome, but not required.
- Colors (existing product palette, please stay in it):
  - Lagoon blue `#1B4FD8` (primary)
  - Light indigo `#EEF2FF` / `#C7D2FE`
  - Coral `#E8593C` (accent, use sparingly)
  - Ink `#0F172A`
- Typography in product: Inter. The wordmark may use something with more
  character but must sit comfortably next to Inter UI.
- Must read clearly at 16×16 px.

## Where it will be used

Favicon, dashboard header, public booking page header, WhatsApp share
preview, og:image, future Android/iOS shortcut icon.

## Files to replace when final art arrives

- `public/favicon.svg`
- `public/logo-mark.svg`
- `src/components/reservly/AppShell.tsx` → `<Brand />` (inline SVG)
