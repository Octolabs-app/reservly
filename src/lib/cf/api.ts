import { getCurrentOwner } from "./auth";
import type { Owner } from "@/lib/rezavu/types";

export function jsonError(error: unknown, status = 400) {
  return Response.json(
    { error: error instanceof Error ? error.message : "Request failed." },
    { status },
  );
}

export async function requireApiOwner(request: Request): Promise<Owner | Response> {
  const owner = await getCurrentOwner(request);
  if (!owner) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  return owner;
}
