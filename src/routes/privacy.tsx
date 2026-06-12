import { createFileRoute } from "@tanstack/react-router";
import { Page, Panel, SiteHeader } from "@/components/rezavu/AppShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — Rezavu" },
      { name: "description", content: "Rezavu privacy notice." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <Page width="md">
        <div className="kicker mb-2 text-primary">Privacy</div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Privacy notice</h1>
        <Panel className="mt-6 space-y-4 p-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            Rezavu stores business profile details, service details, availability, and customer
            booking details so bookings can be confirmed and managed.
          </p>
          <p>
            WhatsApp numbers are used for booking confirmations, owner alerts, cancellations, and
            customer replies. Messages are delivered through Twilio. Payment data is handled by
            Stripe and is never stored by Rezavu. Application data is hosted on Cloudflare.
          </p>
          <p>
            Business owners can delete their account and all associated data at any time from
            Settings, or request export or deletion of their data by contacting Octolabs.
          </p>
        </Panel>
      </Page>
    </>
  );
}
