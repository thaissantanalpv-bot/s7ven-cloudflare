import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Runs every minute: scheduled orders whose opening time arrived are announced to the store (push + e-mail), once. */
export const Route = createFileRoute("/api/public/jobs/release-scheduled-orders")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const nowIso = new Date().toISOString();
        const { data: due, error } = await supabaseAdmin
          .from("orders")
          .select("id")
          .not("scheduled_for", "is", null)
          .is("scheduled_notified_at", null)
          .lte("scheduled_for", nowIso)
          .limit(25);
        if (error) return Response.json({ error: "query failed" }, { status: 500 });
        const { newOrderPush } = await import("@/lib/push");
        const { notifyAdminsPush } = await import("@/lib/push.server");
        const { notifyNewOrder } = await import("@/lib/order-notifications");
        let released = 0;
        for (const { id } of due ?? []) {
          // Claim atomically so overlapping runs never notify twice.
          const { data: o } = await supabaseAdmin.from("orders").update({ scheduled_notified_at: nowIso }).eq("id", id).is("scheduled_notified_at", null).select("*").maybeSingle();
          if (!o || o.status === "cancelled") continue;
          released++;
          const items = o.items as Parameters<typeof newOrderPush>[0]["items"];
          const fulfillment = o.fulfillment === "pickup" ? "pickup" : "delivery";
          const results = await Promise.allSettled([
            notifyAdminsPush(newOrderPush({ id: o.id, number: o.number, customerName: `⏰ Agendado · ${o.customer_name}`, total: Number(o.total), fulfillment, items })),
            notifyNewOrder(o.id, { number: o.number, customerName: o.customer_name, customerPhone: o.customer_phone, fulfillment, address: o.address, payment: o.payment, changeFor: o.change_for, notes: o.notes, items, subtotal: Number(o.subtotal), deliveryFee: Number(o.delivery_fee), total: Number(o.total) }),
          ]);
          for (const r of results) if (r.status === "rejected") console.error("Falha ao avisar pedido agendado:", r.reason);
        }
        return Response.json({ released });
      },
    },
  },
});
