import { createFileRoute } from "@tanstack/react-router";
import { Kicker, Panel } from "@/components/reservly/AppShell";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsTab,
});

const ROWS = [
  { label: "Business name", val: "Salon Rose" },
  { label: "Category", val: "Beauty" },
  { label: "City", val: "Port Louis" },
  { label: "WhatsApp", val: "+230 5700 1234" },
  { label: "Booking link", val: "reservly.app/b/salon-rose" },
  { label: "Language", val: "EN + FR" },
];

function SettingsTab() {
  return (
    <div className="space-y-8">
      <div>
        <Kicker>Account &middot; Plan &middot; Profile</Kicker>
        <h1 className="mt-4 font-serif text-4xl text-foreground sm:text-5xl">
          Settings
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your business profile and your plan.
        </p>
      </div>

      {/* Plan */}
      <Panel className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="kicker text-accent">Current plan</div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="font-display text-3xl font-light tracking-[0.05em] text-foreground">
              Free
            </span>
            <span className="text-xs text-muted-foreground">
              18 / 30 bookings used this month
            </span>
          </div>
          <div className="mt-3 h-1 w-full max-w-xs bg-muted">
            <div className="h-full bg-accent" style={{ width: "60%" }} />
          </div>
        </div>
        <button className="btn-solid">Upgrade to Pro · $5/mo</button>
      </Panel>

      {/* Profile */}
      <div>
        <Kicker>Business profile</Kicker>
        <Panel className="mt-4 overflow-hidden">
          {ROWS.map((r, i) => (
            <div
              key={r.label}
              className={`flex items-center justify-between gap-4 px-5 py-4 ${
                i < ROWS.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div>
                <div className="font-display text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                  {r.label}
                </div>
                <div className="mt-1 font-display text-base tracking-[0.05em] text-foreground">
                  {r.val}
                </div>
              </div>
              <button className="font-display text-[10px] tracking-[0.3em] uppercase text-muted-foreground hover:text-accent">
                Edit
              </button>
            </div>
          ))}
        </Panel>
      </div>

      <div className="flex justify-end">
        <button className="font-display text-[10px] tracking-[0.3em] uppercase text-destructive hover:opacity-80">
          Sign out
        </button>
      </div>
    </div>
  );
}
