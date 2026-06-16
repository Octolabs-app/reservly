# Randevou — Logo / App Icon Design Brief

**Status: NOT FINAL.** A temporary in-house mark ships with the app today
(`public/favicon.svg`, `public/logo-mark.svg`, and the inline `<Brand />`
component). It is intentionally simple so it can be replaced 1:1 by a final
design without code changes — same files, same names. **Do not treat the
current mark as the approved Randevou brand. No "official Randevou logo"
claim should be made publicly until the founder approves a final icon.**

## Brand naming rules (for the designer)

- **Product name:** Randevou (always spelled out in UI and copy).
- **Short mark:** RDVU — may appear as a compact monogram inside the icon or
  as a favicon glyph, but the product is **never renamed to "RDVU"**. RDVU is
  a mark, not the name.

## What we need

A final brand mark + small lockup for **Randevou**, a WhatsApp-native
appointment-booking tool for small businesses (salons, barbers, beauty,
wellness, tutors, small appointment-based shops) in Mauritius, Réunion and
Seychelles.

## Deliverables

1. **App icon / square mark** — must read clearly from 16px (favicon) up to
   512px. SVG + PNG exports (16, 32, 180/Apple-touch, 192, 512). Used as
   favicon, mobile home-screen shortcut icon, and social avatar.
2. **Horizontal lockup** — mark + "Randevou" wordmark for the site header and
   dashboard header. SVG.
3. **Social preview (og:image)** — 1200×630, mark + a short tagline.
4. Monochrome variants (white-on-blue, blue-on-white) for one-color contexts.

## Direction

- Feeling: **modern, simple, trustworthy, appointment-focused.** Clean enough
  that a business owner is proud to send the booking link to a customer.
  Not corporate-cold, not childish.
- Theme: booking / calendar / appointment / confirmed reservation. The current
  temp mark is a calendar tile with a check — evolving that idea is welcome
  but not required; an RDVU monogram treatment is also fair game.
- Colors (current product palette — stay within it unless proposing a
  deliberate rebrand for founder review):
  - Lagoon blue `#1B4FD8` (primary)
  - Light indigo `#EEF2FF` / `#C7D2FE`
  - Coral `#E8593C` (accent, sparingly)
  - Ink `#0F172A`
- Product typography is Inter; the wordmark may have more character but must
  sit comfortably beside Inter UI.

## Where it will be used

Favicon, dashboard header, public booking page header, WhatsApp share preview,
og:image, mobile home-screen (PWA/shortcut) icon.

## Files to replace when final art is approved

- `public/favicon.svg`
- `public/logo-mark.svg`
- `src/components/randevou/AppShell.tsx` → `<BrandMark />` (inline SVG) and the
  inline favicon data-URI in `src/routes/__root.tsx`

## Approval gate

Final icon → founder review → only then update the three files above and any
public "brand" language. Until then everything here is a working placeholder.
