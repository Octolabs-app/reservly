// src/routes/api.auth.tsx
// Server-side auth API endpoints for the Cloudflare D1 auth system.
// The client (auth.tsx) POSTs to these; they set HttpOnly session cookies.
//
// Routes:
//   POST /api/auth/signin   → { owner } + Set-Cookie
//   POST /api/auth/signup   → { owner } + Set-Cookie
//   POST /api/auth/signout  → {} + Clear-Cookie
//   GET  /api/auth/me       → { owner } | null (reads cookie)

import { createFileRoute } from "@tanstack/react-router";
import {
  signInOwner,
  signUpOwner,
  signOutOwner,
  resolveSession,
  getSessionIdFromCookieHeader,
} from "@/lib/cf/auth";

export const Route = createFileRoute("/api/auth")({
  component: Empty,
  server: {
    handlers: {
      // This single route handles sub-paths via the URL search param strategy.
      // TanStack Start file-based routing: create separate files per sub-path.
      // This file is the index; sub-paths use api.auth.signin.tsx etc.
    },
  },
});

function Empty() {
  return null;
}
