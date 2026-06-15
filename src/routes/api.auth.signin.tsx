import { createFileRoute } from "@tanstack/react-router";
import { passwordLengthError, signInOwner } from "@/lib/cf/auth";
import { requireSameOriginMutation } from "@/lib/cf/api";
import { allowRequest, clientIp } from "@/lib/cf/rate-limit";

export const Route = createFileRoute("/api/auth/signin")({
  component: Empty,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const originError = requireSameOriginMutation(request);
        if (originError) return originError;

        const { email, password } = (await request.json()) as { email?: string; password?: string };
        if (!email || !password) {
          return Response.json({ error: "Email and password required." }, { status: 400 });
        }
        const lengthError = passwordLengthError(password);
        if (lengthError) {
          return Response.json({ error: lengthError }, { status: 400 });
        }

        // Throttle per IP and per target email to slow credential brute force.
        const ip = clientIp(request);
        const [ipOk, emailOk] = await Promise.all([
          allowRequest("signin-ip", ip, 20, 300),
          allowRequest("signin-email", email.trim().toLowerCase(), 10, 300),
        ]);
        if (!ipOk || !emailOk) {
          return Response.json(
            { error: "Too many attempts. Please wait a few minutes and try again." },
            { status: 429 },
          );
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

function Empty() {
  return null;
}
