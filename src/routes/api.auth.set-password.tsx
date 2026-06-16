import { createFileRoute } from "@tanstack/react-router";
import { setPasswordOwner, MAX_BCRYPT_PASSWORD_BYTES, passwordByteLength } from "@/lib/cf/auth";
import { jsonError, requireApiOwner, requireSameOriginMutation } from "@/lib/cf/api";

export const Route = createFileRoute("/api/auth/set-password")({
  component: Empty,
  server: {
    handlers: {
      POST: async ({ request }) => {
        const owner = await requireApiOwner(request);
        if (owner instanceof Response) return owner;
        const originError = requireSameOriginMutation(request);
        if (originError) return originError;
        let body: { newPassword?: unknown };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid request body." }, { status: 400 });
        }
        const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
        if (!newPassword) return Response.json({ error: "Password is required." }, { status: 400 });
        if (passwordByteLength(newPassword) > MAX_BCRYPT_PASSWORD_BYTES) {
          return Response.json(
            { error: `Password is too long. Use ${MAX_BCRYPT_PASSWORD_BYTES} bytes or fewer.` },
            { status: 400 },
          );
        }
        try {
          return Response.json({ owner: await setPasswordOwner(owner.id, newPassword) });
        } catch (error) {
          return jsonError(error);
        }
      },
    },
  },
});

function Empty() {
  return null;
}
