import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("@/lib/email-templates/send-email", () => ({
  sendTemplateEmail: (...args: unknown[]) => sendMock(...args),
}));

import { notifyNewOrder } from "@/lib/order-notifications";

describe("aviso de novo pedido", () => {
  beforeEach(() => sendMock.mockReset());

  it("envia um e-mail separado para cada destinatário da loja", async () => {
    sendMock.mockResolvedValue({ sent: true });

    await notifyNewOrder("11111111-1111-4111-8111-111111111111", { number: 42 });

    expect(sendMock).toHaveBeenCalledTimes(2);
    const [first, second] = sendMock.mock.calls;
    expect(first[1]).toBe("thais.santana.lpv@gmail.com");
    expect(second[1]).toBe("7tabacariaelounge@gmail.com");
    expect(first[2].idempotencyKey).not.toBe(second[2].idempotencyKey);
    expect(first[2].templateData).toEqual({ number: 42 });
  });

  it("um destinatário com problema não impede o aviso de chegar ao outro", async () => {
    sendMock
      .mockRejectedValueOnce(new Error("domínio em verificação"))
      .mockResolvedValueOnce({ sent: true });

    await expect(notifyNewOrder("22222222-2222-4222-8222-222222222222", { number: 43 })).resolves.toBeUndefined();

    expect(sendMock).toHaveBeenCalledTimes(2);
  });
});
