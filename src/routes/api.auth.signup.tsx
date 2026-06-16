import { createFileRoute } from "@tanstack/react-router";
import { signUpOwner } from "@/lib/cf/auth";
import { allowRequest, clientIp } from "@/lib/cf/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const Route = createFileRoute("/api/auth/signup")({
  component: Empty,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const allowed = await allowRequest("signup", clientIp(request), 5, 600);
        if (!allowed) {
          return Response.json(
            { error: "Too many attempts. Please wait a few minutes and try again." },
            { status: 429 },
          );
        }

        const { email, password, name } = (await request.json()) as {
          email?: string;
          password?: string;
          name?: string;
        };
        if (!email || !EMAIL_RE.test(email.trim())) {
          return Response.json({ error: "Enter a valid email address." }, { status: 400 });
        }
        if (!password || password.length < 8) {
          return Response.json(
            { error: "Password must be at least 8 characters." },
            { status: 400 },
          );
        }
        if (new TextEncoder().encode(password).length > 72) {
          return Response.json(
            { error: "Password is too long (max 72 characters)." },
            { status: 400 },
          );
        }
        try {
          const { owner, sessionCookie } = await signUpOwner(email, password, name);
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
