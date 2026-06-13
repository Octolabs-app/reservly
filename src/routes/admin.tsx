import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Platform Admin — Randevou" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

type Tab =
  | "overview"
  | "businesses"
  | "owners"
  | "bookings"
  | "billing"
  | "messaging"
  | "system"
  | "audit";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "businesses", label: "Businesses" },
  { id: "owners", label: "Owners" },
  { id: "bookings", label: "Bookings" },
  { id: "billing", label: "Billing" },
  { id: "messaging", label: "Messaging" },
  { id: "system", label: "System" },
  { id: "audit", label: "Audit Log" },
];

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { credentials: "include", ...init });
  if (res.status === 401 || res.status === 403) {
    throw new Error("FORBIDDEN");
  }
  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(payload?.error ?? "Request failed.");
  return payload;
}

// ─── Payload shapes (loose, read-only views) ───────────────────────────────
type MsgRow = {
  id: string;
  created_at: string;
  recipient_phone: string;
  status: string;
  body: string;
  direction?: string;
  business_name?: string | null;
};
type BookingRow = {
  id: string;
  booking_ref: string | null;
  customer_name: string;
  customer_phone?: string;
  business_name: string | null;
  status: string;
  start_at: string;
  service_name?: string | null;
};
type BizRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  owner_email?: string | null;
  booking_limit_monthly?: number | null;
  booking_count?: number;
};
type OwnerRow = {
  id: string;
  email: string;
  full_name: string | null;
  business_count: number;
  created_at: string;
};
type AuditRow = {
  id: string;
  created_at: string;
  admin_email: string | null;
  admin_owner_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata_json: string | null;
};
type OverviewData = {
  devMode?: boolean;
  totals: { owners: number; businesses: number; bookings: number };
  bookingsToday: number;
  bookingsThisMonth: number;
  planCounts: Record<string, number>;
  recentFailedMessages: MsgRow[];
  recentBookings: BookingRow[];
  recentBusinesses: BizRow[];
};
type SystemData = {
  twilioConfigured: boolean;
  paddleConfigured: boolean;
  dodoConfigured: boolean;
  paypalManualConfigured: boolean;
  stripeConfigured: boolean;
  d1Available: boolean;
  kvAvailable: boolean;
  siteUrl: string | null;
  adminCount: number;
};

function AdminPage() {
  const [authState, setAuthState] = useState<"checking" | "ok" | "denied">("checking");
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    api("/api/admin/overview")
      .then(() => setAuthState("ok"))
      .catch((err) => setAuthState(err.message === "FORBIDDEN" ? "denied" : "ok"));
  }, []);

  if (authState === "checking") {
    return <div className="min-h-screen bg-surface" />;
  }

  if (authState === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mb-3 text-4xl">🔒</div>
          <h1 className="text-lg font-bold text-foreground">Platform admins only</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            This area is restricted to Randevou platform administrators.
          </p>
          <a href="/dashboard" className="btn-solid mt-5 inline-flex">
            Go to your dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-30 bg-ink">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2 text-white">
            <span className="rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-bold">RDVU</span>
            <span className="text-[15px] font-bold">Platform Admin</span>
          </div>
          <a href="/dashboard" className="text-xs text-white/50 hover:text-white">
            Owner dashboard →
          </a>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2 sm:px-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                tab === t.id
                  ? "bg-white/15 font-medium text-white"
                  : "text-white/50 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6">
        {tab === "overview" && <OverviewTab />}
        {tab === "businesses" && <BusinessesTab />}
        {tab === "owners" && <OwnersTab />}
        {tab === "bookings" && <BookingsTab />}
        {tab === "billing" && <BillingTab />}
        {tab === "messaging" && <MessagingTab />}
        {tab === "system" && <SystemTab />}
        {tab === "audit" && <AuditTab />}
      </main>
    </div>
  );
}

/* ─── Shared UI ──────────────────────────────────────────────────────────── */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>{children}</div>
  );
}
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="text-center">
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </Card>
  );
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-sm font-bold text-foreground">{children}</h2>;
}
function useEndpoint<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setError(null);
    api(path)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [path]);
  useEffect(() => load(), [load]);
  return { data, error, reload: load };
}
function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[640px] text-left text-[13px]">{children}</table>
    </div>
  );
}
const TH = ({ children }: { children: React.ReactNode }) => (
  <th className="border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
    {children}
  </th>
);
const TD = ({ children }: { children: React.ReactNode }) => (
  <td className="border-b border-border/60 px-3 py-2 text-foreground">{children}</td>
);

/* ─── Overview ───────────────────────────────────────────────────────────── */
function OverviewTab() {
  const { data } = useEndpoint<OverviewData>("/api/admin/overview");
  if (!data) return <Loading />;
  if (data.devMode) return <DevNote />;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Owners" value={data.totals.owners} />
        <Stat label="Businesses" value={data.totals.businesses} />
        <Stat label="Bookings" value={data.totals.bookings} />
        <Stat label="Today" value={data.bookingsToday} />
        <Stat label="This month" value={data.bookingsThisMonth} />
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="Free" value={data.planCounts.free ?? 0} />
        <Stat label="Pro" value={data.planCounts.pro ?? 0} />
        <Stat label="Studio" value={data.planCounts.studio ?? 0} />
      </div>

      <div>
        <SectionTitle>Recent failed messages</SectionTitle>
        {data.recentFailedMessages.length === 0 ? (
          <Card className="text-[13px] text-muted-foreground">No failed message events. ✓</Card>
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <TH>When</TH>
                <TH>To</TH>
                <TH>Status</TH>
                <TH>Body</TH>
              </tr>
            </thead>
            <tbody>
              {data.recentFailedMessages.map((m) => (
                <tr key={m.id}>
                  <TD>{new Date(m.created_at + "Z").toLocaleString("en-GB")}</TD>
                  <TD>{m.recipient_phone}</TD>
                  <TD>
                    <span className="text-destructive">{m.status}</span>
                  </TD>
                  <TD>{m.body?.slice(0, 60)}</TD>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <SectionTitle>Recent bookings</SectionTitle>
          <TableWrap>
            <thead>
              <tr>
                <TH>Ref</TH>
                <TH>Customer</TH>
                <TH>Business</TH>
                <TH>Status</TH>
              </tr>
            </thead>
            <tbody>
              {data.recentBookings.map((b) => (
                <tr key={b.id}>
                  <TD>{b.booking_ref ?? "—"}</TD>
                  <TD>{b.customer_name}</TD>
                  <TD>{b.business_name ?? "—"}</TD>
                  <TD>{b.status}</TD>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </div>
        <div>
          <SectionTitle>Recent businesses</SectionTitle>
          <TableWrap>
            <thead>
              <tr>
                <TH>Name</TH>
                <TH>Slug</TH>
                <TH>Plan</TH>
              </tr>
            </thead>
            <tbody>
              {data.recentBusinesses.map((b) => (
                <tr key={b.id}>
                  <TD>{b.name}</TD>
                  <TD>{b.slug}</TD>
                  <TD>{b.plan}</TD>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </div>
      </div>
    </div>
  );
}

/* ─── Businesses ─────────────────────────────────────────────────────────── */
function BusinessesTab() {
  const [q, setQ] = useState("");
  const { data, reload } = useEndpoint<{ businesses: BizRow[] }>(
    `/api/admin/businesses?q=${encodeURIComponent(q)}`,
  );

  async function act(body: Record<string, unknown>) {
    try {
      await api("/api/admin/businesses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      reload();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="space-y-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, slug or owner email…"
        className="input-field max-w-md"
      />
      {!data ? (
        <Loading />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <TH>Business</TH>
              <TH>Owner</TH>
              <TH>Plan</TH>
              <TH>Limit</TH>
              <TH>Bookings</TH>
              <TH>Link</TH>
              <TH>Actions</TH>
            </tr>
          </thead>
          <tbody>
            {data.businesses.map((b) => (
              <tr key={b.id}>
                <TD>{b.name}</TD>
                <TD>{b.owner_email ?? "—"}</TD>
                <TD>
                  <span className="font-semibold capitalize">{b.plan}</span>
                </TD>
                <TD>{b.booking_limit_monthly ?? "∞"}</TD>
                <TD>{b.booking_count}</TD>
                <TD>
                  <a
                    href={`/b/${b.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    /b/{b.slug}
                  </a>
                </TD>
                <TD>
                  <div className="flex flex-wrap gap-1">
                    <select
                      defaultValue={b.plan}
                      onChange={(e) =>
                        act({ action: "update_plan", businessId: b.id, plan: e.target.value })
                      }
                      className="rounded border border-border bg-white px-1.5 py-1 text-xs"
                    >
                      <option value="free">free</option>
                      <option value="pro">pro</option>
                      <option value="studio">studio</option>
                    </select>
                    <button
                      onClick={() => {
                        const v = prompt("Monthly booking limit (blank = unlimited):", "");
                        if (v === null) return;
                        act({
                          action: "update_limit",
                          businessId: b.id,
                          limit: v.trim() === "" ? null : Number(v),
                        });
                      }}
                      className="rounded border border-border px-2 py-1 text-xs hover:bg-surface"
                    >
                      Limit
                    </button>
                    <button
                      onClick={() => {
                        const plan = prompt("Mark paid — plan (pro/studio/free):", "pro");
                        if (!plan) return;
                        const note = prompt("Payment note (e.g. PayPal ref):", "") ?? "";
                        act({
                          action: "manual_pay",
                          businessId: b.id,
                          plan,
                          provider: "paypal_manual",
                          note,
                        });
                      }}
                      className="rounded border border-success/40 bg-success-soft px-2 py-1 text-xs text-success"
                    >
                      Mark paid
                    </button>
                  </div>
                </TD>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}

/* ─── Owners ─────────────────────────────────────────────────────────────── */
function OwnersTab() {
  const [q, setQ] = useState("");
  const { data } = useEndpoint<{ owners: OwnerRow[] }>(
    `/api/admin/owners?q=${encodeURIComponent(q)}`,
  );
  return (
    <div className="space-y-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by email or name…"
        className="input-field max-w-md"
      />
      {!data ? (
        <Loading />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <TH>Email</TH>
              <TH>Name</TH>
              <TH>Businesses</TH>
              <TH>Joined</TH>
            </tr>
          </thead>
          <tbody>
            {data.owners.map((o) => (
              <tr key={o.id}>
                <TD>{o.email}</TD>
                <TD>{o.full_name ?? "—"}</TD>
                <TD>{o.business_count}</TD>
                <TD>{new Date(o.created_at + "Z").toLocaleDateString("en-GB")}</TD>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}

/* ─── Bookings ───────────────────────────────────────────────────────────── */
function BookingsTab() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const { data, reload } = useEndpoint<{ bookings: BookingRow[] }>(
    `/api/admin/bookings?q=${encodeURIComponent(q)}&status=${status}`,
  );
  async function act(bookingId: string, action: "confirm" | "cancel") {
    if (action === "cancel" && !confirm("Cancel this booking? The customer is notified.")) return;
    try {
      await api("/api/admin/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, bookingId }),
      });
      reload();
    } catch (e) {
      alert((e as Error).message);
    }
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, phone, ref, business…"
          className="input-field max-w-md"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-border bg-white px-2 text-sm"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      {!data ? (
        <Loading />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <TH>Ref</TH>
              <TH>When</TH>
              <TH>Customer</TH>
              <TH>Business</TH>
              <TH>Status</TH>
              <TH>Actions</TH>
            </tr>
          </thead>
          <tbody>
            {data.bookings.map((b) => (
              <tr key={b.id}>
                <TD>{b.booking_ref ?? "—"}</TD>
                <TD>{new Date(b.start_at).toLocaleString("en-GB")}</TD>
                <TD>
                  {b.customer_name}
                  <div className="text-[11px] text-muted-foreground">{b.customer_phone}</div>
                </TD>
                <TD>{b.business_name ?? "—"}</TD>
                <TD>{b.status}</TD>
                <TD>
                  <div className="flex gap-1">
                    {b.status === "pending" && (
                      <button
                        onClick={() => act(b.id, "confirm")}
                        className="rounded border border-success/40 bg-success-soft px-2 py-1 text-xs text-success"
                      >
                        Confirm
                      </button>
                    )}
                    {b.status !== "cancelled" && (
                      <button
                        onClick={() => act(b.id, "cancel")}
                        className="rounded border border-destructive/40 px-2 py-1 text-xs text-destructive"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </TD>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}

/* ─── Billing ────────────────────────────────────────────────────────────── */
function BillingTab() {
  const { data } = useEndpoint<SystemData>("/api/admin/system");
  if (!data) return <Loading />;
  const rows: [string, boolean][] = [
    ["Paddle (individual)", data.paddleConfigured],
    ["Dodo Payments (individual)", data.dodoConfigured],
    ["PayPal manual mode", data.paypalManualConfigured],
    ["Stripe (future)", data.stripeConfigured],
  ];
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Billing providers</SectionTitle>
        <p className="mb-3 text-[13px] text-muted-foreground">
          Randevou bills business owners for SaaS subscriptions only — no BRN required, no
          customer→business appointment payments. Mark owners paid from the{" "}
          <strong>Businesses</strong> tab → “Mark paid”.
        </p>
        <ul className="space-y-1.5 text-[13px]">
          {rows.map(([label, ok]) => (
            <li
              key={label}
              className="flex items-center justify-between border-b border-border/60 pb-1.5"
            >
              <span>{label}</span>
              <Badge ok={ok} />
            </li>
          ))}
        </ul>
      </Card>
      <Card className="text-[13px] text-muted-foreground">
        Until an automated provider (Paddle/Dodo) is approved and configured, upgrades are handled
        as <strong>manual / PayPal</strong> payments recorded here. No live automated billing is
        claimed.
      </Card>
    </div>
  );
}

/* ─── Messaging ──────────────────────────────────────────────────────────── */
function MessagingTab() {
  const { data } = useEndpoint<{ events: MsgRow[] }>("/api/admin/messaging");
  if (!data) return <Loading />;
  return (
    <TableWrap>
      <thead>
        <tr>
          <TH>When</TH>
          <TH>Dir</TH>
          <TH>To/From</TH>
          <TH>Status</TH>
          <TH>Body</TH>
          <TH>Business</TH>
        </tr>
      </thead>
      <tbody>
        {data.events.map((m) => (
          <tr key={m.id}>
            <TD>{new Date(m.created_at + "Z").toLocaleString("en-GB")}</TD>
            <TD>{m.direction}</TD>
            <TD>{m.recipient_phone}</TD>
            <TD>
              <span className={m.status.startsWith("failed") ? "text-destructive" : ""}>
                {m.status}
              </span>
            </TD>
            <TD>{m.body?.slice(0, 50)}</TD>
            <TD>{m.business_name ?? "—"}</TD>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

/* ─── System ─────────────────────────────────────────────────────────────── */
function SystemTab() {
  const { data } = useEndpoint<SystemData>("/api/admin/system");
  if (!data) return <Loading />;
  const rows: [string, boolean][] = [
    ["Twilio (WhatsApp) configured", data.twilioConfigured],
    ["Paddle configured", data.paddleConfigured],
    ["Dodo configured", data.dodoConfigured],
    ["PayPal manual mode", data.paypalManualConfigured],
    ["Stripe configured (legacy/future)", data.stripeConfigured],
    ["D1 binding available", data.d1Available],
    ["KV binding available", data.kvAvailable],
  ];
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Configuration health</SectionTitle>
        <ul className="space-y-1.5 text-[13px]">
          {rows.map(([label, ok]) => (
            <li
              key={label}
              className="flex items-center justify-between border-b border-border/60 pb-1.5"
            >
              <span>{label}</span>
              <Badge ok={ok} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12px] text-muted-foreground">
          Site URL: <span className="font-mono">{data.siteUrl ?? "—"}</span> · Admins:{" "}
          {data.adminCount}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Config flags only — secret values are never shown.
        </p>
      </Card>
    </div>
  );
}

/* ─── Audit ──────────────────────────────────────────────────────────────── */
function AuditTab() {
  const { data } = useEndpoint<{ events: AuditRow[] }>("/api/admin/audit");
  if (!data) return <Loading />;
  if (data.events.length === 0)
    return (
      <Card className="text-[13px] text-muted-foreground">No admin actions recorded yet.</Card>
    );
  return (
    <TableWrap>
      <thead>
        <tr>
          <TH>When</TH>
          <TH>Admin</TH>
          <TH>Action</TH>
          <TH>Target</TH>
          <TH>Details</TH>
        </tr>
      </thead>
      <tbody>
        {data.events.map((e) => (
          <tr key={e.id}>
            <TD>{new Date(e.created_at + "Z").toLocaleString("en-GB")}</TD>
            <TD>{e.admin_email ?? e.admin_owner_id}</TD>
            <TD>{e.action}</TD>
            <TD>
              {e.target_type ?? "—"}
              {e.target_id ? `:${e.target_id.slice(0, 8)}` : ""}
            </TD>
            <TD>{e.metadata_json ?? "—"}</TD>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

/* ─── bits ───────────────────────────────────────────────────────────────── */
function Loading() {
  return <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>;
}
function DevNote() {
  return (
    <Card className="text-[13px] text-muted-foreground">
      Local dev mode — no D1 database is bound, so platform metrics are empty. Deploy to Cloudflare
      (with ADMIN_EMAILS set) to see live data.
    </Card>
  );
}
function Badge({ ok }: { ok: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        ok ? "bg-success-soft text-success" : "bg-surface-2 text-muted-foreground"
      }`}
    >
      {ok ? "Yes" : "No"}
    </span>
  );
}
