import { createFileRoute, Link } from "@tanstack/react-router";
import { Kicker, Page, Panel, SiteHeader } from "@/components/reservly/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reservly — WhatsApp-native booking for island businesses" },
      {
        name: "description",
        content:
          "The booking tool built for businesses where WhatsApp is the operating system. Set up in five minutes. Customers never install anything.",
      },
      { property: "og:title", content: "Reservly — Your bookings, sorted." },
      {
        property: "og:description",
        content:
          "WhatsApp-native booking for salons, studios and tutors across Mauritius, Reunion and Seychelles.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="grid-bg relative overflow-hidden">
          <div className="mx-auto max-w-5xl px-6 pt-24 pb-28 text-center sm:pt-32 sm:pb-36">
            <div className="mb-8 flex justify-center">
              <Kicker tone="muted">A Booking Studio</Kicker>
            </div>

            <h1 className="font-display text-6xl font-light leading-[0.95] tracking-[0.06em] sm:text-7xl md:text-[7rem]">
              <span className="text-accent">R</span>
              <span className="text-foreground">ESERVLY</span>
            </h1>

            <p className="mx-auto mt-8 max-w-2xl font-serif text-xl text-muted-foreground sm:text-2xl">
              A quiet booking tool for island businesses where WhatsApp is already the operating
              system &mdash; five-minute setup, zero apps to install, bookings that just appear.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link to="/onboarding" className="btn-frame-primary">
                Get started
              </Link>
              <Link to="/b/$slug" params={{ slug: "salon-rose" }} className="btn-frame">
                See a booking page
              </Link>
            </div>

            {/* Stat row */}
            <div className="mx-auto mt-16 grid max-w-3xl grid-cols-3 border border-border-strong">
              {[
                { val: "5 min", label: "Setup time" },
                { val: "Free", label: "To start" },
                { val: "6", label: "Island markets" },
              ].map((s, i) => (
                <div
                  key={s.label}
                  className={`px-4 py-6 ${i < 2 ? "border-r border-border-strong" : ""}`}
                >
                  <div className="font-display text-2xl font-light tracking-[0.05em] text-accent">
                    {s.val}
                  </div>
                  <div className="mt-2 font-display text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-16 flex justify-center">
              <div className="h-12 w-px bg-gradient-to-b from-accent/0 via-accent/60 to-accent/0" />
            </div>

            <div className="mt-6 font-display text-[10px] tracking-[0.4em] uppercase text-muted-foreground/60">
              Est. 2026 &middot; Mauritius &middot; An Octolabs Product
            </div>
          </div>
        </section>

        {/* Screens preview */}
        <section className="border-t border-border bg-surface/40 grid-bg-sm">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <div className="mb-12 flex flex-col items-center text-center">
              <Kicker>The Four Screens</Kicker>
              <h2 className="mt-6 font-serif text-4xl text-foreground sm:text-5xl">
                A complete loop, end to end.
              </h2>
              <p className="mt-4 max-w-xl text-sm text-muted-foreground">
                Owner sets up. Customer books. Confirmation flies. Owner manages. Open any panel to
                walk it.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  n: "01",
                  title: "Onboarding",
                  desc: "Business, services, hours.",
                  to: "/onboarding",
                },
                { n: "02", title: "Booking", desc: "Pick. Tap. Done.", to: "/b/salon-rose" },
                {
                  n: "03",
                  title: "Confirmation",
                  desc: "WhatsApp ping arrives.",
                  to: "/b/salon-rose/confirmed",
                },
                { n: "04", title: "Dashboard", desc: "Manage the day.", to: "/dashboard" },
              ].map((s) => (
                <a key={s.n} href={s.to} className="group">
                  <Panel className="h-full p-6 transition-all hover:border-accent/50 hover:bg-card">
                    <div className="font-display text-[10px] tracking-[0.4em] text-accent">
                      {s.n}
                    </div>
                    <div className="mt-6 font-display text-xl tracking-[0.08em] uppercase text-foreground">
                      {s.title}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">{s.desc}</div>
                    <div className="mt-8 font-display text-[10px] tracking-[0.3em] uppercase text-muted-foreground transition-colors group-hover:text-accent">
                      Open &rarr;
                    </div>
                  </Panel>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
            <div className="font-display text-[10px] tracking-[0.4em] uppercase text-muted-foreground/70">
              Reservly &middot; Built with care in Mauritius
            </div>
            <a
              href="https://octolabs.app"
              target="_blank"
              rel="noreferrer"
              className="font-display text-[10px] tracking-[0.4em] uppercase text-muted-foreground hover:text-accent"
            >
              An Octolabs Studio Product &rarr;
            </a>
          </div>
        </footer>
      </main>
    </>
  );
}
