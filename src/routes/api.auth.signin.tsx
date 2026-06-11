import { createFileRoute } from "@tanstack/react-router";
import { signInOwner } from "@/lib/cf/auth";

export const Route = createFileRoute("/api/auth/signin")({
  component: Empty,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { email, password } = (await request.json()) as { email?: string; password?: string };
        if (!email || !password) {
          return Response.json({ error: "Email and password required." }, { status: 400 });
        }
        try {
          const { owner, sessionCookie } = await signInOwner(email, password);
          return Response.json({ owner }, { headers: { "Set-Cookie": sessionCookie } });
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "Sign in failed." },
            { status: 401 },
          );
        }
      },
    },
  },
});

function Empty() { return null; }
