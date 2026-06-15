import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { BrandMark, SiteHeader } from "@/components/randevou/AppShell";
import { getSiteUrl } from "@/lib/randevou/env";
import { getRegionalProPrice, type RegionalPrice } from "@/lib/randevou/pricing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Randevou — Your customers book. WhatsApp confirms." },
      {
        name: "description",
        content:
          "Randevou gives every island business a booking link that works with the tools your customers already use. No app. No friction. No no-shows.",
      },
      { property: "og:title", content: "Randevou — Your customers book. WhatsApp confirms." },
      {
        property: "og:description",
        content:
          "WhatsApp-native booking for salons, barbers, beauty and wellness businesses across Mauritius, Réunion and Seychelles.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: "📲",
    title: "Customers book via WhatsApp",
    body: "They tap your link, pick a slot, and get a WhatsApp confirmation — no app, no account.",
  },
  {
    icon: "⚡",
    title: "Set up in 5 minutes",
    body: "Add your services, set your hours, share the link. That's it. No training needed.",
  },
  {
    icon: "🗓️",
    title: "You stay in control",
    body: "Set how far ahead customers can book, minimum notice, and slot timing — from one simple settings page.",
  },
  {
    icon: "🌍",
    title: "English & French",
    body: "One toggle. Customers see your booking page in their language, confirmations arrive in theirs.",
  },
];

const FREE_FEATURES = [
  "Booking link",
  "WhatsApp confirmation",
  "EN / FR toggle",
  "Owner dashboard",
  "Up to 15 bookings / mo",
];

const PRO_FEATURES = [
  "Unlimited bookings",
  "Unlimited services",
  "Custom booking rules & notice",
  "Priority WhatsApp delivery",
  "Priority support",
];

function Landing() {
  const siteHost = getSiteUrl().replace(/^https?:\/\//, "");
  const [proPrice, setProPrice] = useState<RegionalPrice>(getRegionalProPrice());
  useEffect(() => { setProPrice(getRegionalProPrice()); }, []);
  return (
    <div className="bg-white">
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary-soft to-white px-6 pb-16 pt-20">
          {/* Animated background orbs */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="hero-orb-1 absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-primary opacity-[0.07] blur-3xl" />
            <div className="hero-orb-2 absolute -bottom-24 -right-24 h-[560px] w-[560px] rounded-full bg-[#6366f1] opacity-[0.06] blur-3xl" />
            <div className="hero-orb-3 absolute left-1/2 -top-20 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-primary opacity-[0.05] blur-2xl" />
          </div>
          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-wa/30 bg-wa-soft px-3 py-1.5">
              <span className="pulse-dot text-[10px] text-wa">●</span>
              <span className="text-xs font-medium text-success">
                WhatsApp-native · Mauritius & Islands
              </span>
            </div>
            <h1 className="font-display text-4xl leading-tight text-foreground sm:text-5xl md:text-6xl">
              Your customers book. <span className="text-primary">WhatsApp confirms.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
              Randevou gives every island business a booking link that works with the tools your
              customers already use. No app. No friction. No no-shows.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link to="/onboarding" className="btn-solid px-7 py-3.5 text-[15px]">
                Get your booking link free →
              </Link>
              <Link to="/auth" className="btn-frame px-7 py-3.5 text-[15px]">
                Sign in
              </Link>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              Free plan · No credit card · Set up in 5 minutes
            </div>
          </div>
        </section>

        {/* URL preview strip */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-ink px-6 py-3.5">
          <span className="font-mono text-xs text-white/50">{siteHost}/b/</span>
          <span className="font-mono text-sm font-bold text-primary-mid">your-business-name</span>
          <span className="text-xs text-white/35">← share this link anywhere</span>
        </div>

        {/* Features */}
        <section className="bg-white px-6 py-18">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <div className="kicker mb-2 text-primary">How it works</div>
              <h2 className="font-display text-3xl text-foreground sm:text-4xl">
                Built for the way island businesses work
              </h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-2xl border border-border bg-white p-6">
                  <div className="mb-3 text-3xl">{f.icon}</div>
                  <div className="text-sm font-semibold text-foreground">{f.title}</div>
                  <div className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {f.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The loop */}
        <section className="bg-surface px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <h2 className="font-display text-2xl text-foreground sm:text-3xl">
                A complete loop, end to end
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Owner sets up. Customer books. Confirmation flies. Owner manages.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              {[
                { n: "1", title: "Set up", desc: "Business, services, hours." },
                { n: "2", title: "Share", desc: "One link, anywhere." },
                { n: "3", title: "Booked", desc: "WhatsApp ping arrives." },
                { n: "4", title: "Manage", desc: "Run the day from one screen." },
              ].map((s) => (
                <div
                  key={s.n}
                  className="rounded-2xl border border-border bg-white p-5 text-center"
                >
                  <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                    {s.n}
                  </div>
                  <div className="mt-3 text-sm font-semibold text-foreground">{s.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-white px-6 py-18">
          <div className="mx-auto max-w-3xl">
            <div className="mb-12 text-center">
              <h2 className="font-display text-3xl text-foreground sm:text-4xl">
                Simple pricing. No surprises.
              </h2>
              <p className="mt-2 text-[15px] text-muted-foreground">
                Start free. Upgrade when you're ready. Cancel any time.
              </p>
            </div>
            <div className="grid items-stretch gap-4 sm:grid-cols-2">
              {/* Free */}
              <div className="rounded-2xl border border-border bg-white p-7 shadow-sm">
                <div className="text-sm font-bold text-muted-foreground">Free</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-display text-4xl text-foreground">$0</span>
                </div>
                <div className="text-[13px] text-muted-foreground">forever</div>
                <div className="my-4 h-px bg-border" />
                <div className="space-y-2">
                  {FREE_FEATURES.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-[13px] text-foreground">
                      <span className="font-bold text-success">✓</span> {f}
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <Link to="/onboarding" className="btn-frame-primary w-full">
                    Start free
                  </Link>
                </div>
              </div>

              {/* Pro */}
              <div className="relative rounded-2xl border-2 border-primary bg-white p-7 shadow-sm">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-3 py-0.5 text-[11px] font-bold text-white">
                  Most popular
                </div>
                <div className="text-sm font-bold text-muted-foreground">Pro</div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-display text-4xl text-foreground">
                    {proPrice.symbol}{proPrice.amount}
                  </span>
                  <span className="text-[13px] text-muted-foreground">/ mo · {proPrice.currency}</span>
                </div>
                {proPrice.note ? (
                  <div className="text-[11px] text-muted-foreground">{proPrice.note}</div>
                ) : (
                  <div className="text-[13px] text-muted-foreground">per month</div>
                )}
                <div className="my-4 h-px bg-border" />
                <div className="space-y-2">
                  {PRO_FEATURES.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-[13px] text-foreground">
                      <span className="font-bold text-success">✓</span> {f}
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <Link to="/onboarding" className="btn-solid w-full">
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

        {/* Footer */}
        <footer className="border-t border-border bg-surface px-6 py-8">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BrandMark className="h-5 w-5" />
              <span className="text-sm font-bold text-foreground">Randevou</span>
              <span className="text-xs text-muted-foreground">by Octolabs · Mauritius 🇲🇺</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link to="/guide" className="hover:text-foreground">
                Guide
              </Link>
              <span>·</span>
              <Link to="/help" className="hover:text-foreground">
                Help
              </Link>
              <span>·</span>
              <Link to="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <span>·</span>
              <Link to="/terms" className="hover:text-foreground">
                Terms
              </Link>
              <span>·</span>
              <a
                href="https://octolabs.app"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground"
              >
                octolabs.app
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
