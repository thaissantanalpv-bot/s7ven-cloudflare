import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/edit-photo")({ staticData: { sitemap: false }, server: { handlers: { POST: async ({ request }) => {
  const { handlePhotoEdit } = await import("@/lib/photos/edit-photo.server");
  return handlePhotoEdit(request);
} } } });