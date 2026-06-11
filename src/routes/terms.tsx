import { createFileRoute } from "@tanstack/react-router";
import { Kicker, Page, Panel, SiteHeader } from "@/components/reservly/AppShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms - Reservly" },
      { name: "description", content: "Reservly terms of service." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <>
      <SiteHeader />
      <Page width="md">
        <Kicker tone="accent">Terms</Kicker>
        <h1 className="mt-5 font-serif text-4xl text-foreground">Terms of service</h1>
        <Panel className="mt-8 space-y-5 p-6 text-sm leading-6 text-muted-foreground">
          <p>
            Reservly helps businesses collect booking requests and manage availability. Businesses
            remain responsible for service delivery, customer communication, pricing, and local
            compliance.
          </p>
          <p>
            The Free plan includes 15 bookings per calendar month. Pro and Studio plans are treated
            as unlimited inside the application.
          </p>
          <p>
            Messaging and payment integrations depend on correctly configured Twilio, Stripe, and
            Supabase environment variables.
          </p>
        </Panel>
      </Page>
    </>
  );
}
