import { createFileRoute } from "@tanstack/react-router";
import { getPublicBusinessBySlug } from "@/lib/cf/data";
import { jsonError } from "@/lib/cf/api";

export const Route = createFileRoute("/api/public/business")({
  component: Empty,
  server: {
    handlers: {
      GET: async ({ request }) => {
        const slug = new URL(request.url).searchParams.get("slug");
        if (!slug) return jsonError(new Error("Missing slug."), 400);
        try {
          return Response.json(await getPublicBusinessBySlug(slug));
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
