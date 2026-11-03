import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { EMPTY_SETTINGS, settingsSchema } from "./store-settings";
import { appearanceSchema } from "./catalog-appearance";

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
  const { data, error } = await client.from("store_settings").select("delivery_enabled,fixed_delivery_fee,pickup_address,delivery_zones,hours_enabled,opening_hours,order_cutoff,special_days,delivery_distance_enabled,delivery_origin,delivery_distance_tiers,coupons,promoBanner,paused,catalog_appearance").eq("id", "main").maybeSingle();
  if (error) throw new Error("Não foi possível carregar as configurações da loja.");
  if (!data) return { ...EMPTY_SETTINGS, banner_image_url: "" };
  const settings = settingsSchema.parse(data);
  // A foto do banner fica no armazenamento privado; o catálogo recebe um link temporário (o caminho é que fica salvo).
  let banner_image_url = "";
  const bannerPath = settings.catalog_appearance?.bannerImage;
  if (bannerPath) {
    const { data: signed } = await client.storage.from("product-photos").createSignedUrl(bannerPath, 6 * 3600);
    if (signed?.signedUrl) banner_image_url = signed.signedUrl.replace(new URL(signed.signedUrl).origin, new URL(url).origin);
  }
  return { ...settings, banner_image_url };
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
    // A aparência tem seu próprio salvamento, para que salvar taxas/horários não desfaça uma troca de cores.
    const { catalog_appearance: _appearance, ...rest } = data;
    const { error } = await context.supabase.from("store_settings").upsert({ id: "main", ...rest, updated_at: new Date().toISOString() });
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

/** Salva só a aparência do catálogo (cores, letras, cantos e textos do banner). */
export const saveCatalogAppearance = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => appearanceSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("Apenas a administradora pode alterar a aparência do catálogo.");
    const { error } = await context.supabase.from("store_settings").update({ catalog_appearance: data, updated_at: new Date().toISOString() }).eq("id", "main");
    if (error) throw new Error("Não foi possível salvar a aparência. Tente novamente.");
    return { saved: true };
  });
