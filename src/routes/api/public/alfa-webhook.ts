import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { ALFA_APP_ID, alfaEventStage } from "@/lib/alfa";

const eventSchema = z.object({
  orderId: z.string().uuid(),
  deliveryId: z.string().max(100).optional(),
  event: z.object({ type: z.string().max(40), message: z.string().max(500).optional(), rejectionInfo: z.object({ reason: z.string().max(80).optional() }).passthrough().optional() }),
  deliveryPrice: z.object({ value: z.number() }).passthrough().optional(),
  deliveryPerson: z.object({ name: z.string().max(80).optional() }).passthrough().optional(),
  externalTrackingURL: z.string().url().max(500).optional(),
}).passthrough();

const ORDER = ["received", "preparing", "ready", "out_for_delivery", "delivered"];

// Alfa Delivery status webhook: signed with the client secret, answered with 204.
export const Route = createFileRoute("/api/public/alfa-webhook")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const { validAlfaSignature } = await import("@/lib/alfa.server");
        const appId = request.headers.get("x-app-id");
        if ((appId && appId !== ALFA_APP_ID) || !(await validAlfaSignature(raw, request.headers.get("x-app-signature"))))
          return new Response("Invalid signature", { status: 401 });
        let parsed;
        try { parsed = eventSchema.parse(JSON.parse(raw)); } catch { return new Response("Bad payload", { status: 400 }); }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: order } = await supabaseAdmin.from("orders").select("id,status,courier_name,tracking_url").eq("id", parsed.orderId).maybeSingle();
        if (!order) return new Response(null, { status: 204 });
        const type = parsed.event.type;
        const update: Database["public"]["Tables"]["orders"]["Update"] = {
          alfa_status: type,
          alfa_message: parsed.event.rejectionInfo?.reason ?? parsed.event.message ?? null,
          alfa_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (parsed.deliveryId) update.alfa_delivery_id = parsed.deliveryId;
        if (parsed.deliveryPrice) update.alfa_price = parsed.deliveryPrice.value;
        if (parsed.deliveryPerson?.name) update.courier_name = parsed.deliveryPerson.name.slice(0, 60);
        if (parsed.externalTrackingURL?.startsWith("https://")) update.tracking_url = parsed.externalTrackingURL;
        const stage = alfaEventStage(type);
        // Only move forward, never out of a cancelled order.
        if (stage && order.status !== "cancelled" && ORDER.indexOf(stage) > ORDER.indexOf(order.status)) update.status = stage;
        const { error } = await supabaseAdmin.from("orders").update(update).eq("id", order.id);
        if (error) { console.error("Alfa webhook update failed", error.message); return new Response("Retry", { status: 500 }); }
        return new Response(null, { status: 204 });
      },
    },
  },
});
