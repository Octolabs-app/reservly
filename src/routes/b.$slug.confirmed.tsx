import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Kicker, Page, Panel, SiteHeader } from "@/components/reservly/AppShell";

export const Route = createFileRoute("/b/$slug/confirmed")({
  head: () => ({
    meta: [
      { title: "Booking confirmed — Reservly" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfirmedPage,
});

function ConfirmedPage() {
  const { slug } = Route.useParams();
  const bizName = slug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 80);
    return () => clearTimeout(t);
  }, []);

  const rows: Array<[string, string]> = [
    ["Business", bizName],
    ["Service", "Haircut · 45 min"],
    ["Date", "Wed 10 June 2026"],
    ["Time", "10:30 AM"],
    ["Price", "Rs 350"],
  ];

  return (
    <>
      <SiteHeader />
      <Page width="sm">
        <div className="text-center">
          <Kicker tone="accent">Booking Confirmed</Kicker>
        </div>

        <div className="mt-10 flex justify-center">
          <div
            className={`relative flex h-24 w-24 items-center justify-center border border-success text-4xl text-success transition-all duration-500 ${
              show ? "scale-100 opacity-100" : "scale-75 opacity-0"
            }`}
          >
            <span className="pulse-dot">✓</span>
          </div>
        </div>

        <h1 className="mt-8 text-center font-serif text-4xl text-foreground sm:text-5xl">
          You're booked in.
        </h1>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          See you soon at {bizName}.
        </p>

        <Panel className="mt-10 p-6">
          <div className="divide-y divide-border">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-3">
                <span className="font-display text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                  {k}
                </span>
                <span className="font-display text-sm tracking-[0.05em] text-foreground">
                  {v}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <div className="mt-6 flex items-center justify-center gap-2 border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          <span className="font-display text-[10px] tracking-[0.3em] uppercase">
            ✓ WhatsApp confirmation sent
          </span>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <button className="btn-frame">Add to calendar</button>
          <Link to="/b/$slug" params={{ slug }} className="btn-frame-primary">
            New booking
          </Link>
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/"
            className="font-display text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-accent"
          >
            ← Back to Reservly
          </Link>
        </div>
      </Page>
    </>
  );
}
