import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { ALFA_APP_ID, alfaEventStage } from "@/lib/alfa";

const eventSchema = z.object({
  orderId: z.string().max(100),
  deliveryId: z.string().max(100).optional(),
  event: z.object({ type: z.string().max(40), message: z.string().max(2000).nullish(), rejectionInfo: z.object({ reason: z.string().max(80).nullish() }).passthrough().nullish() }).passthrough(),
  // Alfa nests the price as deliveryPrice.price.value (Open Delivery newLogisticEvent).
  deliveryPrice: z.object({ value: z.number().optional(), price: z.object({ value: z.number() }).passthrough().optional() }).passthrough().nullish(),
  deliveryPerson: z.object({ name: z.string().max(200).nullish() }).passthrough().nullish(),
  externalTrackingURL: z.string().max(1000).nullish(),
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
        try { parsed = eventSchema.parse(JSON.parse(raw)); } catch (e) { console.error("Alfa webhook bad payload", e instanceof z.ZodError ? JSON.stringify(e.issues.map(i => [i.path.join("."), i.code])) : "invalid json"); return new Response("Bad payload", { status: 400 }); }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const uuid = z.string().uuid().safeParse(parsed.orderId).success;
        let { data: order } = uuid ? await supabaseAdmin.from("orders").select("id,status").eq("id", parsed.orderId).maybeSingle() : { data: null };
        if (!order && parsed.deliveryId) ({ data: order } = await supabaseAdmin.from("orders").select("id,status").eq("alfa_delivery_id", parsed.deliveryId).maybeSingle());
        // Unknown or cancelled orders are acknowledged so Alfa stops retrying; cancelled rows are immutable.
        if (!order || order.status === "cancelled") return new Response(null, { status: 204 });
        const type = parsed.event.type;
        const update: Database["public"]["Tables"]["orders"]["Update"] = {
          alfa_status: type,
          alfa_message: parsed.event.rejectionInfo?.reason ?? parsed.event.message ?? null,
          alfa_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (parsed.deliveryId) update.alfa_delivery_id = parsed.deliveryId;
        const price = parsed.deliveryPrice?.price?.value ?? parsed.deliveryPrice?.value;
        if (typeof price === "number") update.alfa_price = price;
        if (parsed.deliveryPerson?.name) update.courier_name = parsed.deliveryPerson.name.slice(0, 60);
        if (parsed.externalTrackingURL?.startsWith("https://")) update.tracking_url = parsed.externalTrackingURL;
        const stage = alfaEventStage(type);
        // Only move forward, never out of a cancelled order.
        if (stage && ORDER.indexOf(stage) > ORDER.indexOf(order.status)) update.status = stage;
        const { error } = await supabaseAdmin.from("orders").update(update).eq("id", order.id);
        if (error) { console.error("Alfa webhook update failed", error.message); return new Response("Retry", { status: 500 }); }
        return new Response(null, { status: 204 });
      },
    },
  },
});
