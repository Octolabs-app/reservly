import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stripe/webhook")({
  component: Empty,
  server: {
    handlers: {
      POST: async () =>
        Response.json({ error: "Stripe webhook is not available." }, { status: 410 }),
    },
  },
});

function Empty() {
  return null;
}
