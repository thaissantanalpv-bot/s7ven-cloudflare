import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { EMPTY_SETTINGS, settingsSchema } from "./store-settings";

export const getStoreSettings = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Não foi possível carregar as configurações da loja.");
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  const { data, error } = await client.from("store_settings").select("delivery_enabled,fixed_delivery_fee,pickup_address,delivery_zones,hours_enabled,opening_hours,order_cutoff,special_days,delivery_distance_enabled,delivery_origin,delivery_distance_tiers,coupons,promoBanner,paused").eq("id", "main").maybeSingle();
  if (error) throw new Error("Não foi possível carregar as configurações da loja.");
  return data ? settingsSchema.parse(data) : EMPTY_SETTINGS;
});
export const checkStoreAdmin = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error) throw new Error("Não foi possível conferir sua permissão.");
  return data === true;
});
export const saveStoreSettings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => settingsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("Apenas a administradora pode alterar as configurações.");
    const { error } = await context.supabase.from("store_settings").upsert({ id: "main", ...data, updated_at: new Date().toISOString() });
    if (error) throw new Error("Não foi possível salvar. Tente novamente.");
    return { saved: true };
  });
/** Pausa ou retoma os pedidos do catálogo na hora, sem mexer nas outras configurações. */
export const setStorePaused = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ paused: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("Apenas a administradora pode pausar a loja.");
    const { error } = await context.supabase.from("store_settings").update({ paused: data.paused, updated_at: new Date().toISOString() }).eq("id", "main");
    if (error) throw new Error("Não foi possível alterar. Tente novamente.");
    return { paused: data.paused };
  });
