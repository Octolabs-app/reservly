import { createFileRoute } from "@tanstack/react-router";
import { Kicker, Page, Panel, SiteHeader } from "@/components/reservly/AppShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy - Reservly" },
      { name: "description", content: "Reservly privacy notice." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <Page width="md">
        <Kicker tone="accent">Privacy</Kicker>
        <h1 className="mt-5 font-serif text-4xl text-foreground">Privacy notice</h1>
        <Panel className="mt-8 space-y-5 p-6 text-sm leading-6 text-muted-foreground">
          <p>
            Reservly stores business profile details, service details, availability, and customer
            booking details so bookings can be confirmed and managed.
          </p>
          <p>
            WhatsApp numbers are used for booking confirmations, owner alerts, cancellations, and
            customer replies. Payment data is handled by Stripe and is not stored directly by
            Reservly.
          </p>
          <p>
            Business owners can request export or deletion of their data by contacting Octolabs.
          </p>
        </Panel>
      </Page>
    </>
  );
}
