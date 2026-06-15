import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stripe/checkout")({
  component: Empty,
  server: {
    handlers: {
      POST: async () =>
        Response.json({ error: "Stripe checkout is not available." }, { status: 410 }),
    },
  },
});

function Empty() {
  return null;
}
