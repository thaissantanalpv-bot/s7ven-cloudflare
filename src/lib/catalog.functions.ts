import { createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { bulkPrice, bulkPriceChangeSchema, catalogFromRows, catalogProductSchema, toDraft, type CatalogProduct } from "./catalog";

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
  return resolveCatalogPhotos(catalogFromRows(rows), client);
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
  return resolveCatalogPhotos(catalogFromRows(rows), client);
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
  // Videos can be long, so their links stay valid for six hours of playback.
  const videoPaths = [...new Set(products.map(p => p.video).filter((v): v is string => Boolean(v?.startsWith("uploads/"))))];
  if (videoPaths.length) {
    const { data: urls } = await client.storage.from("product-videos").createSignedUrls(videoPaths, 6 * 3600);
    for (const p of products) {
      if (!p.video?.startsWith("uploads/")) continue;
      const signed = urls?.find(u => u.path === p.video)?.signedUrl;
      p.videoPath = p.video;
      p.video = signed ? signed.replace(new URL(signed).origin, new URL(import.meta.env['VITE_SUPABASE_URL']).origin) : "";
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
      const catalog = catalogFromRows(components);
      if (componentIds.some(id => { const p = catalog.find(p => p.id === id); return !p || p.comboGroups?.length; }))
        throw new Error("Escolha apenas produtos existentes, sem outros combos.");
    }
    const row = { id: data.product.id, data: data.product, updated_at: new Date().toISOString() };
    const query = data.expected === null
      ? context.supabase.from("catalog_products").insert(row)
      : context.supabase.from("catalog_products").update(row).eq("id", row.id).eq("updated_at", data.expected);
    const { data: saved, error } = await query.select("id,data,updated_at").maybeSingle();
    if (error || !saved) throw new Error("O produto mudou ou não foi salvo. Atualize a lista antes de tentar novamente.");
    return catalogFromRows([saved]).find(p => p.id === saved.id);
  });

export const deleteCatalogProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().min(1).max(64) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("Acesso restrito à administração.");
    // Permanent delete: the product is also taken out of any combo; combos left with an empty group are paused.
    const { data: result, error } = await context.supabase.rpc("admin_remove_catalog_product", { _product_id: data.id });
    if (error) throw new Error(error.message?.includes("administradores") ? "Acesso restrito à administração." : "Não foi possível excluir o produto. Tente novamente.");
    const info = (result ?? {}) as { combos?: string[]; paused?: string[] };
    return { id: data.id, combos: info.combos ?? [], paused: info.paused ?? [] };
  });
// Bulk price edits only touch price fields; every other product field is re-read on the server.
export const saveBulkPrices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    ids: z.array(z.string().regex(/^[a-zA-Z0-9_-]{1,30}$/)).min(1, "Escolha pelo menos um produto.").max(1000).refine(ids => new Set(ids).size === ids.length),
    change: bulkPriceChangeSchema,
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) throw new Error("Acesso restrito à administração.");
    const rows = [];
    for (let i = 0; i < data.ids.length; i += 200) {
      const { data: chunk, error } = await context.supabase.from("catalog_products").select("id,data,updated_at").in("id", data.ids.slice(i, i + 200));
      if (error) throw new Error("Não foi possível carregar os produtos.");
      rows.push(...chunk);
    }
    const catalog = new Map(catalogFromRows(rows).map(p => [p.id, p]));
    let saved = 0;
    const failed: string[] = [];
    for (const id of data.ids) {
      const current = catalog.get(id);
      if (!current) { failed.push(id); continue; }
      const parsed = catalogProductSchema.safeParse({ ...toDraft(current), ...bulkPrice(current, data.change) });
      if (!parsed.success) { failed.push(current.name); continue; }
      const row = { id, data: parsed.data, updated_at: new Date().toISOString() };
      const query = current.updatedAt === null
        ? context.supabase.from("catalog_products").insert(row)
        : context.supabase.from("catalog_products").update(row).eq("id", id).eq("updated_at", current.updatedAt);
      const { data: written, error } = await query.select("id").maybeSingle();
      if (error || !written) failed.push(current.name); else saved++;
    }
    return { saved, failed };
  });
