import { createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { catalogProductSchema, mergeCatalog, type CatalogProduct } from "./catalog";

// Only the allowlisted, read-only sales projection is available to visitors.
export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Não foi possível carregar os produtos.");
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.rpc("list_catalog_sales", { _offset: offset });
    if (error) throw new Error("Não foi possível carregar os produtos.");
    rows.push(...data);
    if (data.length < 500) break;
  }
  return resolveCatalogPhotos(mergeCatalog(rows), client);
});

export const getAdminCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
  const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (roleError || !admin) throw new Error("Acesso restrito à administração.");
  const client = context.supabase;
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from("catalog_products").select("id,data,updated_at").order("id").range(offset, offset + 499);
    if (error) throw new Error("Não foi possível carregar os produtos.");
    rows.push(...data);
    if (data.length < 500) break;
  }
  return resolveCatalogPhotos(mergeCatalog(rows), client);
});

async function resolveCatalogPhotos(products: CatalogProduct[], client: SupabaseClient<Database>) {
  const paths = [...new Set(products.flatMap(p => [p.image, ...(p.images ?? [])]).filter((p): p is string => Boolean(p?.startsWith("uploads/"))))];
  if (paths.length) {
    const { data: urls, error } = await client.storage.from("product-photos").createSignedUrls(paths, 3600);
    if (error) throw new Error("Não foi possível carregar as fotos.");
    const resolvePhoto = (path: string) => {
      if (!path.startsWith("uploads/")) return path;
      const signed = urls.find(u => u.path === path)?.signedUrl;
      return signed ? signed.replace(new URL(signed).origin, new URL(import.meta.env['VITE_SUPABASE_URL']).origin) : "";
    };
    for (const p of products) {
      p.imagePaths = p.images ?? [];
      p.images = p.imagePaths.map(resolvePhoto).filter(Boolean);
      if (p.image?.startsWith("uploads/")) {
        p.imagePath = p.image;
        p.image = resolvePhoto(p.image);
      }
      if (p.variationPhotos) {
        const resolvedVariationPhotos: Record<string, string> = {};
        for (const [name, path] of Object.entries(p.variationPhotos)) {
          const resolved = resolvePhoto(path);
          if (resolved) resolvedVariationPhotos[name] = resolved;
        }
        p.variationPhotos = resolvedVariationPhotos;
      }
    }
  }
  return products;
}

export const saveCatalogProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ product: catalogProductSchema, expected: z.string().nullable() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("Acesso restrito à administração.");
    const componentIds = [...new Set(data.product.comboGroups.flatMap(g => g.productIds))];
    if (componentIds.length) {
      const { data: components, error: componentError } = await context.supabase.from("catalog_products").select("id,data,updated_at").in("id", componentIds);
      if (componentError) throw new Error("Não foi possível conferir os itens do combo.");
      const catalog = mergeCatalog(components);
      if (componentIds.some(id => { const p = catalog.find(p => p.id === id); return !p || p.comboGroups?.length; }))
        throw new Error("Escolha apenas produtos existentes, sem outros combos.");
    }
    const row = { id: data.product.id, data: data.product, updated_at: new Date().toISOString() };
    const query = data.expected === null
      ? context.supabase.from("catalog_products").insert(row)
      : context.supabase.from("catalog_products").update(row).eq("id", row.id).eq("updated_at", data.expected);
    const { data: saved, error } = await query.select("id,data,updated_at").maybeSingle();
    if (error || !saved) throw new Error("O produto mudou ou não foi salvo. Atualize a lista antes de tentar novamente.");
    return mergeCatalog([saved]).find(p => p.id === saved.id);
  });