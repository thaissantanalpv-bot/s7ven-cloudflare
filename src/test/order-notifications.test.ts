import { beforeEach, describe, expect, it, vi } from "vitest";

interface Sent {
  template: string;
  to: string;
  options: { idempotencyKey?: string; templateData?: Record<string, unknown> };
}

const { sent } = vi.hoisted(() => ({
  sent: [] as Array<{ template: string; to: string; options: Sent["options"] }>,
}));

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("@/lib/email-templates/send-email", () => ({
  sendTemplateEmail: async (template: string, to: string, options: Sent["options"]) => {
    sent.push({ template, to, options });
    return sendMock(to);
  },
}));

import { notifyNewOrder } from "@/lib/order-notifications";

describe("aviso de novo pedido", () => {
  beforeEach(() => {
    sent.length = 0;
    sendMock.mockReset();
  });

  it("envia um e-mail separado para cada destinatário da loja", async () => {
    sendMock.mockResolvedValue({ sent: true });

    await notifyNewOrder("11111111-1111-4111-8111-111111111111", { number: 42 });

    expect(sent).toHaveLength(2);
    const thais = sent.find((s) => s.to === "thais.santana.lpv@gmail.com");
    const tabacaria = sent.find((s) => s.to === "7tabacariaelounge@gmail.com");
    expect(thais).toBeDefined();
    expect(tabacaria).toBeDefined();
    expect(thais?.template).toBe("new-order");
    expect(tabacaria?.template).toBe("new-order");
    expect(thais?.options.idempotencyKey).toBeTruthy();
    expect(thais?.options.idempotencyKey).not.toBe(tabacaria?.options.idempotencyKey);
    expect(thais?.options.templateData).toEqual({ number: 42 });
  });

  it("um destinatário com problema não impede o aviso de chegar ao outro", async () => {
    sendMock
      .mockRejectedValueOnce(new Error("domínio em verificação"))
      .mockResolvedValueOnce({ sent: true });

    await expect(
      notifyNewOrder("22222222-2222-4222-8222-222222222222", { number: 43 }),
    ).resolves.toBeUndefined();

    expect(sent).toHaveLength(2);
  });
});
