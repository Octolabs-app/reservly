import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandMark, SiteHeader } from "@/components/randevou/AppShell";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & FAQ — Randevou" },
      {
        name: "description",
        content:
          "How to set up and use your Randevou booking page. Answers to common questions about bookings, WhatsApp, pricing, and settings.",
      },
    ],
  }),
  component: HelpPage,
});

const SECTIONS = [
  {
    title: "Getting started",
    items: [
      {
        q: "What is Randevou?",
        a: "Randevou gives appointment-based businesses a shareable booking link. Customers click the link, choose a service and time slot, enter their name and phone number, and get a WhatsApp confirmation. No app download required — for you or your customer.",
      },
      {
        q: "Who is it for?",
        a: "Any business that runs on appointments: salons, barbers, beauty therapists, physiotherapists, tutors, consultants, nail technicians, tattoo artists, personal trainers, and more — based in Mauritius, Réunion, and the Indian Ocean islands.",
      },
      {
        q: "How do I set up my booking page?",
        a: 'Create a free account, then complete the 3-step setup wizard: (1) enter your business name and category, (2) add your services with prices and durations, (3) set your opening hours. Your booking link goes live the moment you click "Go live".',
      },
      {
        q: "How long does setup take?",
        a: "About 5 minutes for a basic setup. You can always add more services, adjust hours, or update your WhatsApp number later from your dashboard settings.",
      },
    ],
  },
  {
    title: "Your booking link",
    items: [
      {
        q: "Where is my booking link?",
        a: "Log in to your dashboard. Your link appears at the top of the home screen — something like randevou.octolabs.app/b/your-business-name. Copy it with one click, or share it directly.",
      },
      {
        q: "Can I share it on WhatsApp or Instagram?",
        a: "Yes — that's exactly how it's designed to be used. Paste it in your WhatsApp status, your Instagram bio, a pinned story or post, a Google Business listing, or anywhere your customers will find it.",
      },
      {
        q: "Can I change my booking link?",
        a: "Your link is generated from your business name. To change it, update your business name in Settings → Business profile — the link slug updates automatically.",
      },
      {
        q: "Can customers book without a WhatsApp number?",
        a: "No. Customers must provide a WhatsApp number so they can receive their confirmation. This also helps reduce no-shows.",
      },
    ],
  },
  {
    title: "Managing bookings",
    items: [
      {
        q: "How do I see my upcoming bookings?",
        a: 'From your dashboard, click the "Bookings" tab. You can see upcoming appointments, search by customer name or booking reference, and filter by date or status.',
      },
      {
        q: "Can I cancel a booking?",
        a: "Yes. Open any booking from the Bookings tab and click Cancel. The booking reference becomes inactive and the slot opens back up.",
      },
      {
        q: "What is minimum notice, and how do I set it?",
        a: "Minimum notice is the shortest lead time you accept. If you set 2 hours, customers cannot book a slot starting in less than 2 hours from now. Set it in Settings → Booking rules. The default is 2 hours.",
      },
      {
        q: "How far ahead can customers book?",
        a: "By default, customers can book up to 30 days in advance. You can change this under Settings → Booking rules (max advance days).",
      },
      {
        q: "Can I block time off or close for a holiday?",
        a: "Toggle any day to Closed in your opening hours (Settings → Opening hours). For partial closures or one-off days off, this feature is coming soon.",
      },
      {
        q: "Can I add a walk-in booking manually?",
        a: "Yes. From your dashboard Bookings tab, use the Add booking button. Walk-in bookings bypass the minimum-notice rule.",
      },
    ],
  },
  {
    title: "WhatsApp notifications",
    items: [
      {
        q: "Who receives the WhatsApp confirmation?",
        a: "Both you (as the business owner) and the customer receive a WhatsApp message when a booking is made. The customer provides their number when they book; yours is saved in your business profile.",
      },
      {
        q: "What does the WhatsApp message say?",
        a: "The confirmation includes the booking reference (e.g. RDV-A3F2), the service name, the date and time, and your business name. Messages are sent in English, French, or both — based on your language setting.",
      },
      {
        q: "I'm not receiving WhatsApp notifications. What's wrong?",
        a: "Check that your WhatsApp number is saved correctly in Settings → Business profile. It must include the country code (e.g. +230 5700 0000 for Mauritius, +262 for Réunion). WhatsApp delivery is handled by Randevou — no action needed on your end.",
      },
      {
        q: "Can I change the language of confirmations?",
        a: "Yes. Go to Settings → Business profile and change the Booking page language. \"Both\" sends confirmations in English and French together.",
      },
    ],
  },
  {
    title: "Services and availability",
    items: [
      {
        q: "How many services can I add?",
        a: "Free plan: 1 service. Pro plan: unlimited services. You can edit or remove services any time from Settings → Services.",
      },
      {
        q: "Can I offer different durations for different services?",
        a: "Yes. Each service has its own duration (15 min, 30 min, 45 min, 1 hour, 90 min, 2 hours, full day, or custom). Available slots are calculated automatically based on each service's duration.",
      },
      {
        q: "Can I show prices on my booking page?",
        a: "Yes — add a price label (e.g. Rs 350) when you set up or edit a service. The label is shown on the booking page so customers know what to expect.",
      },
    ],
  },
  {
    title: "Plans and pricing",
    items: [
      {
        q: "Is Randevou really free?",
        a: "Yes. The Free plan gives you a booking link, WhatsApp confirmations, a dashboard, and up to 15 bookings per month — at no cost, with no credit card required.",
      },
      {
        q: "What happens when I reach 15 bookings?",
        a: "New bookings are paused until the next calendar month resets your counter. Existing bookings are not affected. Upgrade to Pro for unlimited bookings.",
      },
      {
        q: "What does Pro include?",
        a: "Pro ($9.99/month, or the equivalent in your local currency) gives you unlimited bookings, unlimited services, custom booking rules (notice period, advance window, slot interval), priority WhatsApp delivery, and priority support.",
      },
      {
        q: "How do I upgrade my plan?",
        a: "Go to Settings → Plan in your dashboard and click Upgrade to Pro. Payment is handled via PayPal or direct transfer for now — automated billing is coming soon.",
      },
      {
        q: "Can I cancel my subscription?",
        a: "Yes, contact us at hello@octolabs.app and we'll cancel your subscription and revert your account to the Free plan within one business day.",
      },
    ],
  },
];

function HelpPage() {
  return (
    <div className="bg-white">
      <SiteHeader />
      <main className="px-6 py-12">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-10">
            <div className="kicker mb-2 text-primary">Help & FAQ</div>
            <h1 className="font-display text-3xl text-foreground">How can we help?</h1>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Everything you need to set up and run your Randevou booking page.
            </p>
          </div>

          {/* Quick links */}
          <div className="mb-10 flex flex-wrap gap-2">
            {SECTIONS.map((s) => (
              <a
                key={s.title}
                href={`#${s.title.toLowerCase().replace(/\s+/g, "-")}`}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-foreground"
              >
                {s.title}
              </a>
            ))}
          </div>

          {/* Sections */}
          <div className="space-y-12">
            {SECTIONS.map((section) => (
              <div key={section.title} id={section.title.toLowerCase().replace(/\s+/g, "-")}>
                <h2 className="mb-4 font-display text-xl font-bold text-foreground">
                  {section.title}
                </h2>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <details
                      key={item.q}
                      className="group rounded-xl border border-border bg-white open:border-primary-mid"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-foreground">
                        {item.q}
                        <span className="ml-auto shrink-0 text-muted-foreground transition-transform group-open:rotate-45">
                          +
                        </span>
                      </summary>
                      <div className="border-t border-border px-5 pb-4 pt-3 text-[13px] leading-relaxed text-muted-foreground">
                        {item.a}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Contact CTA */}
          <div className="mt-14 rounded-2xl border border-border bg-surface p-7 text-center">
            <div className="text-sm font-bold text-foreground">Still need help?</div>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Email us at{" "}
              <a href="mailto:hello@octolabs.app" className="text-primary hover:underline">
                hello@octolabs.app
              </a>{" "}
              and we'll get back to you within one business day.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link to="/onboarding" className="btn-solid px-6 py-2.5 text-sm">
                Get started free →
              </Link>
              <Link to="/auth" className="btn-frame px-6 py-2.5 text-sm">
                Sign in
              </Link>
            </div>
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
            <Link to="/help" className="text-foreground">
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
