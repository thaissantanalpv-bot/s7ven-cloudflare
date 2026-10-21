import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { pushSubscriptionSchema } from "./push";

async function assertAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Acesso restrito à administração.");
}

const MAX_DEVICES_PER_ADMIN = 10;

export const getPushPublicKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { vapidPublicKey } = await import("./push.server");
    return { publicKey: vapidPublicKey() };
  });

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => pushSubscriptionSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    // Verified admin only: a device that switched accounts is reassigned to the current admin.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("admin_push_subscriptions").upsert(
      {
        user_id: context.userId,
        endpoint: data.endpoint,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        device_label: data.deviceLabel,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error("Não foi possível ativar os avisos neste aparelho.");
    const { data: extra } = await supabaseAdmin
      .from("admin_push_subscriptions")
      .select("id")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .range(MAX_DEVICES_PER_ADMIN, MAX_DEVICES_PER_ADMIN + 49);
    if (extra?.length) await supabaseAdmin.from("admin_push_subscriptions").delete().in("id", extra.map((r) => r.id));
    return { saved: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ endpoint: z.string().url().max(2048) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("admin_push_subscriptions").delete().eq("endpoint", data.endpoint);
    if (error) throw new Error("Não foi possível desativar os avisos.");
    return { removed: true };
  });

export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ endpoint: z.string().url().max(2048) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: sub, error } = await context.supabase
      .from("admin_push_subscriptions")
      .select("id,endpoint,p256dh,auth")
      .eq("endpoint", data.endpoint)
      .maybeSingle();
    if (error || !sub) throw new Error("Ative os avisos neste aparelho antes de testar.");
    const { sendPush } = await import("./push.server");
    const result = await sendPush([sub], {
      title: "🔔 Novo pedido #0000 (teste)",
      body: "Cliente teste · R$ 45,00 · Entrega\n1x Produto de teste",
      tag: "s7ven-teste",
      url: "/painel?aba=pedidos",
    });
    if (result.expired.length) {
      await context.supabase.from("admin_push_subscriptions").delete().eq("id", sub.id);
      throw new Error("Este aparelho parou de aceitar avisos. Ative novamente.");
    }
    if (!result.sent) throw new Error("O aviso de teste não foi enviado. Tente novamente.");
    return { sent: true };
  });
