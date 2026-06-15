import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandMark, SiteHeader } from "@/components/randevou/AppShell";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "Owner Guide — Randevou" },
      {
        name: "description",
        content:
          "Step-by-step guide to setting up your Randevou booking page and managing appointments from your dashboard.",
      },
    ],
  }),
  component: GuidePage,
});

const STEPS = [
  {
    icon: "👤",
    title: "Create your free account",
    body: "Click Get your booking link free on the homepage. Enter your email address and a password. No credit card needed — the free plan never expires.",
    tip: "Already have an account? Sign in and jump straight to step 3.",
  },
  {
    icon: "🏢",
    title: "Tell us about your business",
    body: 'The setup wizard starts automatically after sign-up. Enter your business name (this becomes your booking URL), choose your category — salon, barber, wellness, and more — and set the language your customers will see: English, Français, or both.',
    tip: "Your booking link will look like: randevou.octolabs.app/b/your-business-name",
  },
  {
    icon: "✂️",
    title: "Add your services",
    body: "Add each service you offer: give it a name, set the duration (15 min up to full day), and optionally add a price label such as Rs 350. Customers pick from this list when they book.",
    tip: "Free plan: up to 3 services. Pro plan: unlimited — add seasonal or specialty services any time from Settings.",
  },
  {
    icon: "🕐",
    title: "Set your opening hours",
    body: "Choose which days you work and your start and end times. Randevou automatically calculates available slots based on your hours and each service's duration — no manual slot entry needed.",
    tip: "You can adjust hours or block specific dates such as public holidays or leave days at any time from your dashboard.",
  },
  {
    icon: "🔗",
    title: "Go live and share your link",
    body: 'Click Go live to publish your booking page. Your link is immediately active. Share it everywhere customers might find you: WhatsApp status, Instagram bio, Facebook page, Google Business listing, or printed on a business card.',
    tip: "Your WhatsApp status alone can fill your calendar — most owners say that is where the majority of bookings come from.",
  },
  {
    icon: "📱",
    title: "Customers book — both sides get notified",
    body: "When a customer fills in your booking page, they receive an instant WhatsApp confirmation with their appointment details. The new booking appears on your dashboard immediately.",
    tip: "Customers must enter a valid WhatsApp number. This is what makes confirmations reliable and reduces no-shows.",
  },
  {
    icon: "📋",
    title: "Manage your day from the dashboard",
    body: "Your dashboard shows today's schedule, upcoming bookings, and quick action buttons. Confirm, cancel, or mark a booking as completed — the customer gets a WhatsApp update either way.",
    tip: "Use Settings → Booking rules to control how far ahead customers can book, the minimum notice time, and the slot interval between appointments.",
  },
];

function GuidePage() {
  return (
    <div className="bg-white">
      <SiteHeader />
      <main className="px-6 py-12">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-12">
            <div className="kicker mb-2 text-primary">Owner guide</div>
            <h1 className="font-display text-3xl text-foreground">
              Set up in 5 minutes. Run it from your phone.
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              Follow these steps to get your booking page live and start accepting appointments
              through WhatsApp.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/onboarding" className="btn-solid px-6 py-2.5 text-sm">
                Get started free →
              </Link>
              <Link to="/auth" className="btn-frame px-6 py-2.5 text-sm">
                Sign in
              </Link>
            </div>
          </div>

          {/* Steps */}
          <ol className="space-y-6">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-5">
                {/* Step number */}
                <div className="flex shrink-0 flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-sm">
                    {i + 1}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="mt-2 w-px flex-1 bg-border" />
                  )}
                </div>

                {/* Content */}
                <div className="pb-8">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{step.icon}</span>
                    <h2 className="text-base font-semibold text-foreground">{step.title}</h2>
                  </div>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                  <div className="mt-3 rounded-xl border border-primary-mid bg-primary-soft px-4 py-3">
                    <p className="text-[13px] leading-relaxed text-primary">
                      <span className="font-semibold">Tip: </span>
                      {step.tip}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>

          {/* CTA */}
          <div className="mt-4 rounded-2xl border border-border bg-surface p-7 text-center">
            <div className="mb-1 text-2xl">🎉</div>
            <div className="text-sm font-bold text-foreground">You're all set</div>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Your booking page is live. Share your link and watch appointments roll in.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link to="/onboarding" className="btn-solid px-6 py-2.5 text-sm">
                Create my booking page →
              </Link>
              <Link to="/help" className="btn-frame px-6 py-2.5 text-sm">
                FAQ
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Questions? Email{" "}
              <a href="mailto:hello@octolabs.app" className="text-primary hover:underline">
                hello@octolabs.app
              </a>
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-surface px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BrandMark className="h-5 w-5" />
            <span className="text-sm font-bold text-foreground">Randevou</span>
            <span className="text-xs text-muted-foreground">by Octolabs · Mauritius 🇲🇺</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              Home
            </Link>
            <Link to="/guide" className="text-foreground">
              Guide
            </Link>
            <Link to="/help" className="hover:text-foreground">
              Help
            </Link>
            <Link to="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
