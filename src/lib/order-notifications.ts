// Server-only: envia o aviso de novo pedido para as caixas postais fixas da loja.
// Cada destinatário recebe um e-mail próprio, com um único endereço no "Para:" —
// ninguém que recebe o aviso consegue ver o endereço dos outros.
const ORDER_NOTIFICATION_RECIPIENTS = [
  "thais.santana.lpv@gmail.com",
  "7tabacariaelounge@gmail.com",
] as const;

export async function notifyNewOrder(
  orderId: string,
  templateData: Record<string, unknown>,
): Promise<void> {
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  for (const [index, recipient] of ORDER_NOTIFICATION_RECIPIENTS.entries()) {
    try {
      await sendTemplateEmail("new-order", recipient, {
        idempotencyKey: `new-order-${orderId}-${index}`,
        templateData,
      });
    } catch (error) {
      // Um destinatário com problema nunca impede o aviso de chegar aos demais.
      console.error("Falha ao enviar aviso de novo pedido:", error);
    }
  }
}
