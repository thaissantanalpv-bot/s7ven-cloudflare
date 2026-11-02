import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/describe-product")({ staticData: { sitemap: false }, server: { handlers: { POST: async ({ request }) => {
  const { handleDescribeProduct } = await import("@/lib/ai/describe-product.server");
  return handleDescribeProduct(request);
} } } });
