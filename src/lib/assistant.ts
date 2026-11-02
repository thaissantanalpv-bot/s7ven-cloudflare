import { z } from "zod";
import type { UIMessage } from "ai";

// Stored history is text-only; provider reasoning and customer records never enter it.
export const storedMessageSchema = z.object({
  id: z.string().min(1).max(100),
  role: z.enum(["user", "assistant"]),
  parts: z.array(z.object({ type: z.literal("text"), text: z.string().max(60000) })).max(1),
});
export const conversationSchema = z.object({
  id: z.string().uuid(),
  messages: z.array(storedMessageSchema),
  blockedReason: z.string().nullable(),
});
export type AssistantConversation = z.infer<typeof conversationSchema>;
export function textHistory(messages: UIMessage[]) {
  return messages.flatMap((message) => {
    if (message.role !== "user" && message.role !== "assistant") return [];
    const text = message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");
    return text.trim()
      ? [
          {
            id: message.id || crypto.randomUUID(),
            role: message.role,
            parts: [{ type: "text" as const, text }],
          },
        ]
      : [];
  });
}

type CatalogRow = { id: string; data: unknown; updated_at: string };
/** Compact, allowlisted product view for the assistant: store-owned fields only, never customer data. */
export function catalogForAssistant(rows: CatalogRow[]) {
  return rows.flatMap((row) => {
    const d = (row.data ?? {}) as Record<string, unknown>;
    if (typeof d.name !== "string" || typeof d.price !== "number") return [];
    const variations = Array.isArray(d.variations) ? d.variations.length : 0;
    const combo = Array.isArray(d.comboGroups) && d.comboGroups.length > 0;
    return [{
      name: d.name.slice(0, 150),
      category: typeof d.category === "string" ? d.category.slice(0, 100) : "",
      price: d.price,
      oldPrice: typeof d.compareAtPrice === "number" ? d.compareAtPrice : null,
      active: d.active !== false,
      stock: typeof d.stock === "number" ? d.stock : null,
      variations,
      ...(combo ? { combo: true } : {}),
      ...(d.featured === true ? { featured: true } : {}),
    }];
  });
}
