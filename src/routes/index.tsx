import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { BrandMark, SiteHeader } from "@/components/randevou/AppShell";
import { getSiteUrl } from "@/lib/randevou/env";
import { getRegionalProPrice, type RegionalPrice } from "@/lib/randevou/pricing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Randevou — Get booked. No app needed." },
      {
        name: "description",
        content:
          "Share one link. Customers pick a slot. WhatsApp confirms automatically — zero no-shows, zero back-and-forth. Built for island businesses.",
      },
      { property: "og:title", content: "Randevou — Get booked. No app needed." },
      {
        property: "og:description",
        content:
          "WhatsApp-native booking for salons, barbers, wellness studios and every island business across Mauritius, Réunion and Seychelles.",
      },
    ],
  }),
  component: Landing,
});

/* ─── Data ────────────────────────────────────────────────────────────────── */

const TICKER_ITEMS = [
  "Hair Salons 💅", "Barbershops 💈", "Yoga Studios 🧘", "Wellness Centres 🌿",
  "Beauty Studios 💄", "Nail Bars 💅", "Spas 🛁", "Physiotherapy 🩺",
  "Personal Trainers 💪", "Pilates 🏋️", "Tattoo Studios 🎨", "Massage Therapy 🌺",
  "Skincare Clinics 🧴", "Lash & Brow 👁️", "Reflexology 🦶", "Dental Clinics 🦷",
];

const STEPS = [
  {
    n: "1",
    emoji: "⚡",
    title: "Set up in 5 minutes",
    body: "Add your business name, services and opening hours. No training manual. No IT team.",
  },
  {
    n: "2",
    emoji: "🔗",
    title: "Share one link",
    body: "Post it on WhatsApp, Instagram, your front door — anywhere. Customers tap and book.",
  },
  {
    n: "3",
    emoji: "✅",
    title: "WhatsApp confirms automatically",
    body: "Customer gets a confirmation. You get an alert. No more back-and-forth.",
  },
];

const FEATURES = [
  {
    icon: "📲",
    title: "No app for your customers",
    body: "They book straight from WhatsApp or a browser link. Nothing to download, no account to create.",
  },
  {
    icon: "🗓️",
    title: "Live slot grid",
    body: "Only real available slots show up. Double-bookings are impossible — the calendar handles it.",
  },
  {
    icon: "🌍",
    title: "English & French",
    body: "One toggle. Customers see your page and get confirmations in their preferred language.",
  },
  {
    icon: "⚙️",
    title: "You set the rules",
    body: "Minimum notice, how far ahead to book, slot length — all from one simple settings page.",
  },
];

const TESTIMONIALS = [
  {
    avatar: "💈",
    name: "Kevin M.",
    biz: "Fresh Kutz Barbershop, Curepipe",
    text: "My no-shows dropped from 5 a week to nearly zero. Customers get a WhatsApp reminder and they actually show up now.",
    stars: 5,
  },
  {
    avatar: "💅",
    name: "Priya A.",
    biz: "Glam Studio, Rose Hill",
    text: "I used to spend 40 minutes a day confirming appointments on WhatsApp. Now it just handles itself. I didn't even need to read a guide.",
    stars: 5,
  },
  {
    avatar: "🧘",
    name: "Asha T.",
    biz: "Breathe Yoga, Grand Baie",
    text: "My clients love it. They book at midnight when they can't sleep and the slot is already confirmed when I wake up.",
    stars: 5,
  },
];

const FREE_FEATURES = [
  "Your own booking link",
  "WhatsApp confirmations",
  "EN / FR toggle",
  "Owner dashboard",
  "Up to 15 bookings / month",
];

const PRO_FEATURES = [
  "Unlimited bookings",
  "Unlimited services",
  "Custom notice & booking rules",
  "Priority WhatsApp delivery",
  "Priority support",
];

/* ─── Components ──────────────────────────────────────────────────────────── */

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className="text-[#f59e0b] text-sm">★</span>
      ))}
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="phone-float relative mx-auto w-[260px]">
      {/* Glow behind phone */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 rounded-[40px] bg-primary opacity-20 blur-3xl scale-110"
      />
      {/* Phone frame */}
      <div className="relative rounded-[36px] border-4 border-ink bg-[#ece5dd] shadow-2xl overflow-hidden">
        {/* Status bar */}
        <div className="flex items-center justify-between bg-[#075e54] px-4 pt-2 pb-1">
          <span className="font-mono text-[10px] text-white/90">9:41</span>
          <div className="flex items-center gap-1">
            <span className="text-white/80 text-[10px]">●●●</span>
          </div>
        </div>
        {/* WA header */}
        <div className="flex items-center gap-2.5 bg-[#075e54] px-3 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-xl">
            📅
          </div>
          <div>
            <div className="text-[13px] font-semibold text-white">Randevou</div>
            <div className="text-[10px] text-white/60">online</div>
          </div>
        </div>
        {/* Chat body */}
        <div className="flex flex-col gap-2 px-2.5 py-3 min-h-[300px]">
          <div className="self-center rounded-full bg-black/10 px-3 py-0.5 text-[9px] text-gray-600">
            Today
          </div>

          {/* Customer message */}
          <div className="chat-bubble-1 self-end max-w-[82%]">
            <div className="rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 shadow-sm">
              <p className="text-[11px] leading-relaxed text-gray-800">
                Hi! I'd like to book a haircut Saturday at 10am 🙏
              </p>
              <p className="mt-0.5 text-right text-[9px] text-gray-400">10:32 ✓✓</p>
            </div>
          </div>

          {/* Booking confirmation */}
          <div className="chat-bubble-2 self-start max-w-[88%]">
            <div className="rounded-2xl rounded-tl-sm bg-white px-3 py-2.5 shadow-sm">
              <p className="text-[11px] font-bold text-[#075e54]">✅ Booking Confirmed!</p>
              <div className="mt-1.5 space-y-0.5 text-[11px] text-gray-700">
                <p>📅 Sat, 9 Aug · 10:00 AM</p>
                <p>✂️ Haircut · 45 min</p>
                <p>📌 Ref: RDV-K8MQ4</p>
              </div>
              <p className="mt-1 text-right text-[9px] text-gray-400">10:32</p>
            </div>
          </div>

          {/* Customer reply */}
          <div className="chat-bubble-3 self-end max-w-[70%]">
            <div className="rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 shadow-sm">
              <p className="text-[11px] text-gray-800">Perfect, thanks! 🙌</p>
              <p className="mt-0.5 text-right text-[9px] text-gray-400">10:33 ✓✓</p>
            </div>
          </div>

          {/* Owner alert */}
          <div className="chat-bubble-4 self-start max-w-[88%]">
            <div className="rounded-2xl rounded-tl-sm bg-white px-3 py-2.5 shadow-sm">
              <p className="text-[11px] font-semibold text-gray-800">🔔 New booking!</p>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-600">
                Kevin booked Haircut for Saturday 10:00. Your calendar is updated.
              </p>
              <p className="mt-1 text-right text-[9px] text-gray-400">10:32</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

function Landing() {
  const siteHost = getSiteUrl().replace(/^https?:\/\//, "");
  const [proPrice, setProPrice] = useState<RegionalPrice>(getRegionalProPrice());
  useEffect(() => { setProPrice(getRegionalProPrice()); }, []);

  // Duplicate ticker items so the marquee seamlessly loops
  const tickerItems = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="bg-white">
      <SiteHeader />
      <main>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#eef2ff] via-white to-[#f0fdf4] px-6 pb-20 pt-16">
          {/* Background orbs */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="hero-orb-1 absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-primary opacity-[0.06] blur-3xl" />
            <div className="hero-orb-2 absolute -bottom-20 -right-20 h-[500px] w-[500px] rounded-full bg-[#6366f1] opacity-[0.05] blur-3xl" />
            <div className="hero-orb-3 absolute left-1/2 top-0 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-wa opacity-[0.04] blur-2xl" />
          </div>

          <div className="relative z-10 mx-auto max-w-5xl">
            <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">

              {/* Left: copy */}
              <div className="flex-1 text-center lg:text-left">
                {/* Badge */}
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-wa/30 bg-wa-soft px-3 py-1.5">
                  <span className="pulse-dot text-[10px] text-wa">●</span>
                  <span className="text-xs font-semibold text-success">
                    WhatsApp-native · Mauritius & Islands
                  </span>
                </div>

                <h1 className="font-display text-[2.6rem] font-black leading-[1.1] text-foreground sm:text-5xl md:text-[3.5rem]">
                  Get booked.{" "}
                  <span className="relative inline-block">
                    <span className="relative z-10 text-primary">No app needed.</span>
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-1 left-0 right-0 h-3 rounded bg-primary-soft"
                    />
                  </span>
                </h1>

                <p className="mx-auto mt-6 max-w-lg text-[17px] leading-relaxed text-muted-foreground lg:mx-0">
                  Share one link. Your customers pick a slot and get a{" "}
                  <span className="font-semibold text-success">WhatsApp confirmation</span>{" "}
                  instantly — no back-and-forth, no no-shows, no app to download.
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                  <Link
                    to="/onboarding"
                    className="btn-solid px-8 py-3.5 text-[15px] shadow-lg shadow-primary/25"
                  >
                    Get your free booking link →
                  </Link>
                  <Link to="/auth" className="btn-frame px-7 py-3.5 text-[15px]">
                    Sign in
                  </Link>
                </div>

                <p className="mt-4 text-xs text-muted-foreground">
                  Free forever · No credit card · Setup in 5 minutes
                </p>

                {/* Social trust */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-5 lg:justify-start">
                  {[
                    { icon: "💅", label: "Salons" },
                    { icon: "💈", label: "Barbers" },
                    { icon: "🧘", label: "Yoga" },
                    { icon: "🌿", label: "Wellness" },
                  ].map((t) => (
                    <div key={t.label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </div>
                  ))}
                  <span className="text-xs text-muted-foreground/60">+ many more</span>
                </div>
              </div>

              {/* Right: phone */}
              <div className="shrink-0 lg:w-[280px]">
                <PhoneMockup />
              </div>
            </div>
          </div>
        </section>

        {/* ── Ticker ────────────────────────────────────────────────────────── */}
        <div className="overflow-hidden border-y border-border bg-surface py-3">
          <div className="ticker-track flex w-max gap-8">
            {tickerItems.map((item, i) => (
              <span key={i} className="shrink-0 text-sm font-medium text-muted-foreground">
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* ── Stats strip ───────────────────────────────────────────────────── */}
        <section className="bg-ink px-6 py-10">
          <div className="mx-auto grid max-w-3xl grid-cols-3 gap-6 text-center">
            {[
              { value: "5 min", label: "to set up your booking page" },
              { value: "0", label: "apps for your customers to install" },
              { value: "100%", label: "WhatsApp-native confirmations" },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-display text-3xl font-black text-primary-mid sm:text-4xl">
                  {s.value}
                </div>
                <div className="mt-1.5 text-[12px] leading-snug text-white/50">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────────── */}
        <section className="bg-white px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <div className="mb-14 text-center">
              <div className="kicker mb-2 text-primary">How it works</div>
              <h2 className="font-display text-3xl font-black text-foreground sm:text-4xl">
                From zero to fully booked in 3 steps
              </h2>
            </div>

            <div className="relative grid gap-8 sm:grid-cols-3">
              {/* Connector line (desktop only) */}
              <div
                aria-hidden="true"
                className="absolute left-[16.67%] right-[16.67%] top-9 hidden h-px border-t-2 border-dashed border-primary/20 sm:block"
              />
              {STEPS.map((s) => (
                <div key={s.n} className="relative flex flex-col items-center text-center sm:items-center">
                  <div className="relative mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-primary text-3xl shadow-lg shadow-primary/30">
                    {s.emoji}
                    <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[11px] font-black text-white">
                      {s.n}
                    </span>
                  </div>
                  <h3 className="mb-2 text-[15px] font-bold text-foreground">{s.title}</h3>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>

            {/* URL demo */}
            <div className="mt-14 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl bg-ink px-6 py-4">
              <span className="font-mono text-xs text-white/40">{siteHost}/b/</span>
              <span className="font-mono text-sm font-bold text-primary-mid">your-business-name</span>
              <span className="text-xs text-white/30">← share this link anywhere</span>
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────────────────── */}
        <section className="bg-surface px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <div className="kicker mb-2 text-primary">Everything you need</div>
              <h2 className="font-display text-3xl font-black text-foreground sm:text-4xl">
                Built for island businesses, not big corporations
              </h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-border bg-white p-6 transition-shadow hover:shadow-md"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-2xl transition-transform group-hover:scale-110">
                    {f.icon}
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{f.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ──────────────────────────────────────────────────── */}
        <section className="bg-white px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <div className="kicker mb-2 text-primary">Real businesses, real results</div>
              <h2 className="font-display text-3xl font-black text-foreground sm:text-4xl">
                Island businesses love Randevou
              </h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <div
                  key={t.name}
                  className="rounded-2xl border border-border bg-white p-6 shadow-sm"
                >
                  <Stars n={t.stars} />
                  <p className="mt-3 text-[13px] leading-relaxed text-foreground">
                    "{t.text}"
                  </p>
                  <div className="mt-4 flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-xl">
                      {t.avatar}
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-foreground">{t.name}</div>
                      <div className="text-[11px] text-muted-foreground">{t.biz}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Guide callout ─────────────────────────────────────────────────── */}
        <section className="bg-primary px-6 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-3 text-5xl">📖</div>
            <h2 className="font-display text-2xl font-black text-white sm:text-3xl">
              New here? Read the 5-minute owner guide.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-primary-mid">
              Step-by-step: from creating your account to getting your first booking.
              No technical knowledge required.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/guide"
                className="rounded-xl bg-white px-7 py-3.5 text-[15px] font-semibold text-primary transition hover:bg-primary-soft"
              >
                Read the guide →
              </Link>
              <Link
                to="/onboarding"
                className="rounded-xl border border-white/30 px-7 py-3.5 text-[15px] font-medium text-white transition hover:bg-white/10"
              >
                Skip — get my link now
              </Link>
            </div>
          </div>
        </section>

        {/* ── Pricing ───────────────────────────────────────────────────────── */}
        <section className="bg-white px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <div className="mb-12 text-center">
              <div className="kicker mb-2 text-primary">Pricing</div>
              <h2 className="font-display text-3xl font-black text-foreground sm:text-4xl">
                Simple pricing. No surprises.
              </h2>
              <p className="mt-2 text-[15px] text-muted-foreground">
                Start free. Upgrade when your calendar is full. Cancel any time.
              </p>
            </div>
            <div className="grid items-stretch gap-5 sm:grid-cols-2">

              {/* Free */}
              <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Free
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-5xl font-black text-foreground">$0</span>
                  <span className="text-muted-foreground">/ forever</span>
                </div>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  Perfect to get started and test the waters.
                </p>
                <div className="my-5 h-px bg-border" />
                <ul className="space-y-2.5">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-[13px] text-foreground">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-[11px] font-bold text-success">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-7">
                  <Link to="/onboarding" className="btn-frame-primary block w-full text-center">
                    Start free
                  </Link>
                </div>
              </div>

              {/* Pro */}
              <div className="relative rounded-2xl border-2 border-primary bg-white p-8 shadow-lg shadow-primary/10">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-4 py-1 text-[11px] font-bold text-white">
                  ✨ Most popular
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-primary">
                  Pro
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="font-display text-5xl font-black text-foreground">
                    {proPrice.symbol}{proPrice.amount}
                  </span>
                  <span className="text-muted-foreground">/ mo · {proPrice.currency}</span>
                </div>
                {proPrice.note ? (
                  <p className="mt-1 text-[12px] text-muted-foreground">{proPrice.note}</p>
                ) : (
                  <p className="mt-2 text-[13px] text-muted-foreground">
                    For businesses that are seriously growing.
                  </p>
                )}
                <div className="my-5 h-px bg-border" />
                <ul className="space-y-2.5">
                  {PRO_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-[13px] text-foreground">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-7">
                  <Link to="/onboarding" className="btn-solid block w-full text-center">
                    Start with Pro →
                  </Link>
                </div>
              </div>
            </div>
            <p className="mt-5 text-center text-xs text-muted-foreground">
              Price shown in your local currency · Billed monthly · No contract
            </p>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────────────── */}
        <section className="bg-ink px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 text-5xl">🚀</div>
            <h2 className="font-display text-3xl font-black text-white sm:text-4xl">
              Ready to fill your calendar?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[16px] leading-relaxed text-white/60">
              Join island businesses across Mauritius, Réunion and Seychelles that
              already run their bookings on Randevou. Free to start, takes 5 minutes.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/onboarding"
                className="rounded-xl bg-primary px-8 py-4 text-[15px] font-bold text-white shadow-lg shadow-primary/30 transition hover:bg-primary/90"
              >
                Get your free booking link →
              </Link>
              <Link to="/auth" className="rounded-xl border border-white/20 px-7 py-4 text-[15px] font-medium text-white/70 transition hover:border-white/40 hover:text-white">
                Sign in
              </Link>
            </div>
            <p className="mt-4 text-xs text-white/30">
              Free plan · No credit card · Cancel any time
            </p>
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer className="border-t border-border bg-surface px-6 py-8">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BrandMark className="h-5 w-5" />
              <span className="text-sm font-bold text-foreground">Randevou</span>
              <span className="text-xs text-muted-foreground">by Octolabs · Mauritius 🇲🇺</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <Link to="/guide" className="hover:text-foreground">Guide</Link>
              <span>·</span>
              <Link to="/help" className="hover:text-foreground">Help</Link>
              <span>·</span>
              <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
              <span>·</span>
              <Link to="/terms" className="hover:text-foreground">Terms</Link>
              <span>·</span>
              <a href="https://octolabs.app" target="_blank" rel="noreferrer" className="hover:text-foreground">
                octolabs.app
              </a>
            </div>
          </div>
        </footer>

      </main>
    </div>
  );
}
