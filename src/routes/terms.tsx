import { createFileRoute } from "@tanstack/react-router";
import { Page, Panel, SiteHeader } from "@/components/randevou/AppShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms — Randevou" },
      { name: "description", content: "Randevou terms of service." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <>
      <SiteHeader />
      <Page width="md">
        <div className="kicker mb-2 text-primary">Terms</div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Terms of service</h1>
        <Panel className="mt-6 space-y-4 p-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            Randevou helps businesses collect booking requests and manage availability. Businesses
            remain responsible for service delivery, customer communication, pricing, and local
            compliance.
          </p>
          <p>
            The Free plan includes 15 bookings per calendar month. The Pro plan is treated as
            unlimited inside the application.
          </p>
          <p>
            WhatsApp delivery and card payments depend on third-party providers (Twilio and Stripe).
            Randevou is not liable for outages or delivery failures of those providers.
          </p>
        </Panel>
      </Page>
    </>
  );
}
