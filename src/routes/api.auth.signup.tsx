import { createFileRoute } from "@tanstack/react-router";
import { signUpOwner } from "@/lib/cf/auth";

export const Route = createFileRoute("/api/auth/signup")({
  component: Empty,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { email, password } = (await request.json()) as { email?: string; password?: string };
        if (!email || !password || password.length < 6) {
          return Response.json(
            { error: "Valid email and password (min 6 chars) required." },
            { status: 400 },
          );
        }
        try {
          const { owner, sessionCookie } = await signUpOwner(email, password);
          return Response.json({ owner }, { headers: { "Set-Cookie": sessionCookie } });
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "Sign up failed." },
            { status: 400 },
          );
        }
      },
    },
  },
});

function Empty() {
  return null;
}
