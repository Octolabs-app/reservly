import { createFileRoute } from "@tanstack/react-router";
import { Page, Panel, SiteHeader } from "@/components/rezavu/AppShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms — Rezavu" },
      { name: "description", content: "Rezavu terms of service." },
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
            Rezavu helps businesses collect booking requests and manage availability. Businesses
            remain responsible for service delivery, customer communication, pricing, and local
            compliance.
          </p>
          <p>
            The Free plan includes 15 bookings per calendar month. Pro and Studio plans are treated
            as unlimited inside the application.
          </p>
          <p>
            WhatsApp delivery and card payments depend on third-party providers (Twilio and Stripe).
            Rezavu is not liable for outages or delivery failures of those providers.
          </p>
        </Panel>
      </Page>
    </>
  );
}
