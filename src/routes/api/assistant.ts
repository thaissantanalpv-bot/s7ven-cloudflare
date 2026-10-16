import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/assistant")({ staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleAssistant } = await import("@/lib/ai/assistant.server");
        return handleAssistant(request);
      },
    },
  },
});
