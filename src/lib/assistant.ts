import { z } from "zod";
import type { UIMessage } from "ai";

// Stored history is text-only; provider reasoning and customer records never enter it.
export const storedMessageSchema = z.object({
  id: z.string().min(1).max(100),
  role: z.enum(["user", "assistant"]),
  parts: z.array(z.object({ type: z.literal("text"), text: z.string().max(60000) })).max(1),
});
export const conversationSchema = z.object({
  id: z.string().uuid(), messages: z.array(storedMessageSchema),
  blockedReason: z.string().nullable(),
});
export type AssistantConversation = z.infer<typeof conversationSchema>;
export function textHistory(messages: UIMessage[]) {
  return messages.flatMap(message => {
    if (message.role !== "user" && message.role !== "assistant") return [];
    const text = message.parts.filter(part => part.type === "text").map(part => part.text).join("\n");
    return text.trim() ? [{ id: message.id, role: message.role, parts: [{ type: "text" as const, text }] }] : [];
  });
}