import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Kicker, Page, Panel, SiteHeader } from "@/components/reservly/AppShell";

export const Route = createFileRoute("/b/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Book with ${prettify(params.slug)} — Reservly` },
      {
        name: "description",
        content: `Pick a service and time with ${prettify(
          params.slug,
        )}. Confirmation arrives straight on your WhatsApp.`,
      },
    ],
  }),
  component: BookingPage,
});

function prettify(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
}

const SERVICES = [
  { id: 1, name: "Haircut", duration: 45, price: "Rs 350" },
  { id: 2, name: "Colour", duration: 90, price: "Rs 800" },
  { id: 3, name: "Blowout", duration: 30, price: "Rs 250" },
  { id: 4, name: "Cut + Blow", duration: 75, price: "Rs 550" },
];

const TIMES = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30"];
const TAKEN = new Set([0, 1, 5]);

function BookingPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const bizName = prettify(slug);

  const dates = useMemo(() => {
    const today = new Date(2026, 5, 9);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i + 1);
      return {
        day: d.toLocaleDateString("en-GB", { weekday: "short" }),
        num: d.getDate(),
      };
    });
  }, []);

  const [svc, setSvc] = useState<number | null>(null);
  const [dateIdx, setDateIdx] = useState<number | null>(null);
  const [timeIdx, setTimeIdx] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const ready = svc !== null && dateIdx !== null && timeIdx !== null && name.length > 1 && phone.length > 4;
  const step = svc === null ? 1 : dateIdx === null ? 2 : timeIdx === null ? 3 : 4;

  const confirm = () => {
    if (!ready) return;
    navigate({ to: "/b/$slug/confirmed", params: { slug } });
  };

  return (
    <>
      <SiteHeader />
      <Page width="md">
        {/* Business header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <Kicker tone="accent">{`Booking · ${SERVICES.find((s) => s.id === svc)?.name ?? "Choose a service"}`}</Kicker>
            <h1 className="mt-4 font-serif text-4xl text-foreground sm:text-5xl">{bizName}</h1>
            <div className="mt-2 font-display text-[11px] tracking-[0.3em] uppercase text-muted-foreground">
              Beauty &middot; Port Louis &middot; reservly.app/b/{slug}
            </div>
          </div>
          <div className="hidden h-16 w-16 items-center justify-center border border-accent/40 text-2xl text-accent sm:flex">
            ✂
          </div>
        </div>

        {/* Step rail */}
        <div className="mb-8 grid grid-cols-4 gap-2">
          {["Service", "Date", "Time", "You"].map((label, i) => {
            const idx = i + 1;
            const done = idx < step;
            const active = idx === step;
            return (
              <div key={label}>
                <div className={`h-px ${active || done ? "bg-accent" : "bg-border-strong"}`} />
                <div
                  className={`mt-2 font-display text-[10px] tracking-[0.3em] uppercase ${
                    active ? "text-accent" : done ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  0{idx} {label}
                </div>
              </div>
            );
          })}
        </div>

        <Panel className="p-6 sm:p-8">
          <div className="space-y-10">
            {/* Services */}
            <Section label="01 — Pick a service">
              <div className="grid gap-3 sm:grid-cols-2">
                {SERVICES.map((s) => {
                  const active = svc === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSvc(s.id)}
                      className={`group relative border p-5 text-left transition-all ${
                        active
                          ? "border-primary bg-primary/10"
                          : "border-border-strong hover:border-accent/60 hover:bg-card"
                      }`}
                    >
                      <div className="font-display text-base tracking-[0.1em] uppercase text-foreground">
                        {s.name}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{s.duration} min</span>
                        <span className="font-display tracking-[0.15em] text-accent">{s.price}</span>
                      </div>
                      {active && (
                        <span className="absolute right-3 top-3 font-display text-[10px] tracking-[0.3em] uppercase text-primary">
                          ✓ Selected
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Dates */}
            <Section label="02 — Pick a date">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {dates.map((d, i) => {
                  const active = dateIdx === i;
                  return (
                    <button
                      key={i}
                      onClick={() => setDateIdx(i)}
                      className={`min-w-[64px] border p-3 text-center transition-all ${
                        active
                          ? "border-primary bg-primary/10"
                          : "border-border-strong hover:border-accent/60"
                      }`}
                    >
                      <div className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                        {d.day}
                      </div>
                      <div
                        className={`mt-1 font-display text-2xl font-light ${
                          active ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {d.num}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Times */}
            <Section label="03 — Pick a time">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {TIMES.map((t, i) => {
                  const taken = TAKEN.has(i);
                  const active = timeIdx === i;
                  return (
                    <button
                      key={t}
                      disabled={taken}
                      onClick={() => setTimeIdx(i)}
                      className={`py-2.5 text-center font-display text-sm tracking-[0.1em] transition-all ${
                        taken
                          ? "border border-border bg-muted/40 text-muted-foreground/40 line-through"
                          : active
                            ? "border border-primary bg-primary/10 text-primary"
                            : "border border-border-strong text-foreground hover:border-accent/60"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Details */}
            <Section label="04 — Your details">
              <div className="space-y-4">
                <div className="border-b border-border-strong">
                  <div className="kicker">Your name</div>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Marie Dupont"
                    className="w-full bg-transparent py-3 text-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                  />
                </div>
                <div className="border-b border-border-strong">
                  <div className="kicker">WhatsApp number</div>
                  <div className="flex items-center">
                    <span className="font-display text-base tracking-[0.1em] text-muted-foreground">
                      +230
                    </span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="5700 0000"
                      className="ml-3 w-full bg-transparent py-3 text-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                    />
                  </div>
                  <div className="pb-3 text-[11px] text-muted-foreground">
                    Your confirmation will be sent here.
                  </div>
                </div>
              </div>
            </Section>

            <button onClick={confirm} disabled={!ready} className="btn-solid w-full py-4">
              {ready ? "Confirm booking →" : "Complete all steps above"}
            </button>
          </div>
        </Panel>
      </Page>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 font-display text-[10px] tracking-[0.35em] uppercase text-accent">
        {label}
      </div>
      {children}
    </div>
  );
}
