import { describe, expect, it } from "vitest";
import { conversationSchema, textHistory } from "@/lib/assistant";
import type { UIMessage } from "ai";

describe("administrative assistant history", () => {
  it("persists text without provider reasoning or hidden metadata", () => {
    const messages: UIMessage[] = [{ id: "msg_a", role: "assistant", parts: [
      { type: "reasoning", text: "private reasoning" }, { type: "text", text: "Resposta" },
    ] }, { id: "msg_b", role: "user", parts: [{ type: "text", text: "E hoje?" }] }];
    expect(textHistory(messages)).toEqual([
      { id: "msg_a", role: "assistant", parts: [{ type: "text", text: "Resposta" }] },
      { id: "msg_b", role: "user", parts: [{ type: "text", text: "E hoje?" }] },
    ]);
  });
  it("drops empty interrupted assistant turns", () => {
    expect(textHistory([{ id: "empty", role: "assistant", parts: [{ type: "reasoning", text: "Thinking" }] }])).toEqual([]);
  });
  it("supplies stable persisted IDs when an SDK stream has no ID", () => {
    const saved = textHistory([{ id: "", role: "assistant", parts: [{ type: "text", text: "Resposta" }] }]);
    expect(saved[0]?.id).toBeTruthy();
    expect(conversationSchema.safeParse({ id: crypto.randomUUID(), blockedReason: null, messages: saved }).success).toBe(true);
  });
  it("rejects non-text saved records", () => {
    expect(conversationSchema.safeParse({ id: crypto.randomUUID(), blockedReason: null, messages: [{ id: "msg", role: "assistant", parts: [{ type: "reasoning", text: "not stored" }] }] }).success).toBe(false);
  });
});