import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { catalogProductSchema, mergeCatalog } from "./catalog";

export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Não foi possível carregar os produtos.");
  const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
    const headers = new Headers(init?.headers);
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  } } });
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from("catalog_products").select("id,data,updated_at").order("id").range(offset, offset + 499);
    if (error) throw new Error("Não foi possível carregar os produtos.");
    rows.push(...data);
    if (data.length < 500) break;
  }
  return mergeCatalog(rows);
});

export const saveCatalogProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ product: catalogProductSchema, expected: z.string().nullable() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("Acesso restrito à administração.");
    if (data.product.image.startsWith("https://")) {
      const url = new URL(data.product.image);
      const origin = new URL(import.meta.env.VITE_SUPABASE_URL).origin;
      if (url.origin !== origin || !url.pathname.startsWith("/storage/v1/object/public/product-photos/")) throw new Error("Envie a foto pelo painel.");
    }
    const row = { id: data.product.id, data: data.product, updated_at: new Date().toISOString() };
    const query = data.expected === null
      ? context.supabase.from("catalog_products").insert(row)
      : context.supabase.from("catalog_products").update(row).eq("id", row.id).eq("updated_at", data.expected);
    const { data: saved, error } = await query.select("id,data,updated_at").maybeSingle();
    if (error || !saved) throw new Error("O produto mudou ou não foi salvo. Atualize a lista antes de tentar novamente.");
    return mergeCatalog([saved]).find(p => p.id === saved.id);
  });