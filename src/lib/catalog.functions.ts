import { logCatalogFetch } from "./catalog-request-log";
import { createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  bulkPrice,
  bulkPriceChangeSchema,
  catalogFromRows,
  catalogProductSchema,
  toDraft,
  type CatalogProduct,
} from "./catalog";
import { catalogDerivativePaths, publicCatalogDerivativePaths } from "./photos/image-derivatives";

// Only the allowlisted, read-only sales projection is available to visitors.
export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    console.error("[S7VEN]", "produtos", "configuracao ausente", {
      urlPresente: Boolean(url),
      chavePresente: Boolean(key),
    });
    throw new Error("Não foi possível carregar os produtos.");
  }
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`)
          headers.delete("Authorization");
        headers.set("apikey", key);
        const path = new URL(input instanceof Request ? input.url : String(input)).pathname;
        const operation = path.startsWith("/storage/v1/")
          ? path.includes("/product-videos")
            ? "videos"
            : "fotos"
          : "produtos";
        return logCatalogFetch(input, { ...init, headers }, operation);
      },
    },
  });
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  const derivativeClient = serviceKey
    ? createClient<Database>(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input, init) => {
            const headers = new Headers(init?.headers);
            if (
              serviceKey.startsWith("sb_") &&
              headers.get("Authorization") === `Bearer ${serviceKey}`
            ) {
              headers.delete("Authorization");
            }
            headers.set("apikey", serviceKey);
            return logCatalogFetch(input, { ...init, headers }, "fotos");
          },
        },
      })
    : undefined;
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.rpc("list_catalog_sales", { _offset: offset });
    if (error) throw new Error("Não foi possível carregar os produtos.");
    rows.push(...data);
    if (data.length < 500) break;
  }
  return resolveCatalogMedia(catalogFromRows(rows), client, { access: "public", derivativeClient });
});

export const getAdminCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !admin) throw new Error("Acesso restrito à administração.");
    const client = context.supabase;
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await client
        .from("catalog_products")
        .select("id,data,updated_at")
        .order("id")
        .range(offset, offset + 499);
      if (error) throw new Error("Não foi possível carregar os produtos.");
      rows.push(...data);
      if (data.length < 500) break;
    }
    return resolveCatalogMedia(catalogFromRows(rows), client, { access: "admin" });
  });

function signedMediaUrl(url: string, bucket: string, path: string) {
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      parsed.pathname === `/storage/v1/object/sign/${bucket}/${path}` &&
      Boolean(parsed.searchParams.get("token"))
    );
  } catch {
    return false;
  }
}

async function signedPhotoUrls(
  client: SupabaseClient<Database>,
  paths: string[],
  optional = false,
) {
  const result = new Map<string, string>();
  for (let offset = 0; offset < paths.length; offset += 100) {
    const batch = paths.slice(offset, offset + 100);
    const { data, error } = await client.storage
      .from("product-photos")
      .createSignedUrls(batch, 3600);
    if (error) {
      if (optional) continue;
      throw new Error("Não foi possível carregar as fotos.");
    }
    for (const item of data ?? []) {
      if (item.error || !item.path || !item.signedUrl || !batch.includes(item.path)) continue;
      if (signedMediaUrl(item.signedUrl, "product-photos", item.path)) {
        result.set(item.path, item.signedUrl);
      }
    }
  }
  return result;
}

type CatalogMediaAccess =
  | { access: "public"; derivativeClient: SupabaseClient<Database> | undefined }
  | { access: "admin" };

async function resolveCatalogMedia(
  products: CatalogProduct[],
  client: SupabaseClient<Database>,
  mediaAccess: CatalogMediaAccess,
) {
  const originals = [
    ...new Set(
      products
        .flatMap((product) => [
          product.image,
          ...(product.images ?? []),
          ...Object.values(product.variationPhotos ?? {}),
        ])
        .filter((path): path is string => Boolean(path?.startsWith("uploads/"))),
    ),
  ];
  const originalUrls = await signedPhotoUrls(client, originals);
  const derivativeClient = mediaAccess.access === "admin" ? client : mediaAccess.derivativeClient;
  const derivativePaths = new Map(
    derivativeClient
      ? [...originalUrls.keys()].flatMap((path) => {
          // A successful original signature under the caller's RLS is the authorization
          // gate. Only deterministic siblings of that authorized original may be signed.
          const variants =
            mediaAccess.access === "public"
              ? publicCatalogDerivativePaths(path)
              : catalogDerivativePaths(path);
          return variants ? [[path, variants] as const] : [];
        })
      : [],
  );
  const derivativeUrls = derivativeClient
    ? await signedPhotoUrls(
        derivativeClient,
        [...new Set([...derivativePaths.values()].flatMap((variants) => Object.values(variants)))],
        true,
      )
    : new Map<string, string>();
  const resolvePhoto = (path: string) =>
    path.startsWith("uploads/") ? (originalUrls.get(path) ?? "") : path;

  for (const product of products) {
    const galleryPaths = product.images ?? [];
    const coverPath = product.image;
    product.imagePaths = galleryPaths;
    product.galleryPhotoUrls = Object.fromEntries(
      galleryPaths.map((path) => [path, resolvePhoto(path)]),
    );
    product.images = galleryPaths.map(resolvePhoto).filter(Boolean);
    if (coverPath?.startsWith("uploads/")) {
      product.imagePath = coverPath;
      product.image = resolvePhoto(coverPath);
    }
    if (product.variationPhotos) {
      product.variationPhotoPaths = { ...product.variationPhotos };
      product.variationPhotos = Object.fromEntries(
        Object.entries(product.variationPhotoPaths).flatMap(([name, path]) => {
          const url = resolvePhoto(path);
          return url ? [[name, url]] : [];
        }),
      );
    }
    const paths = [coverPath, ...galleryPaths, ...Object.values(product.variationPhotoPaths ?? {})];
    product.photoVariants = Object.fromEntries(
      paths.flatMap((path) => {
        const variants = path && derivativePaths.get(path);
        if (!variants) return [];
        const thumb = derivativeUrls.get(variants.thumb);
        const card = derivativeUrls.get(variants.card);
        const gallery = derivativeUrls.get(variants.gallery);
        return thumb && card && gallery ? [[path, { thumb, card, gallery }]] : [];
      }),
    );
  }

  // Public videos are signed by the anonymous client and must belong to an active item.
  // Admins continue to use the authenticated client after the role check.
  const videoPaths = [
    ...new Set(
      products
        .filter((product) => mediaAccess.access === "admin" || product.active)
        .map((product) => product.video)
        .filter((path): path is string => Boolean(path?.startsWith("uploads/"))),
    ),
  ];
  const videoUrls = videoPaths.length
    ? (await client.storage.from("product-videos").createSignedUrls(videoPaths, 6 * 3600)).data
    : [];
  for (const product of products) {
    const path = product.video;
    if (!path?.startsWith("uploads/")) continue;
    product.videoPath = path;
    const signed =
      mediaAccess.access === "admin" || product.active
        ? videoUrls?.find((item) => item.path === path && !item.error)?.signedUrl
        : undefined;
    product.video = signed && signedMediaUrl(signed, "product-videos", path) ? signed : "";
  }
  return products;
}

export const saveCatalogProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ product: catalogProductSchema, expected: z.string().nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !admin) throw new Error("Acesso restrito à administração.");
    const componentIds = [...new Set(data.product.comboGroups.flatMap((g) => g.productIds))];
    if (componentIds.length) {
      const { data: components, error: componentError } = await context.supabase
        .from("catalog_products")
        .select("id,data,updated_at")
        .in("id", componentIds);
      if (componentError) throw new Error("Não foi possível conferir os itens do combo.");
      const catalog = catalogFromRows(components);
      if (
        componentIds.some((id) => {
          const p = catalog.find((p) => p.id === id);
          return !p || p.comboGroups?.length;
        })
      )
        throw new Error("Escolha apenas produtos existentes, sem outros combos.");
    }
    const row = { id: data.product.id, data: data.product, updated_at: new Date().toISOString() };
    const query =
      data.expected === null
        ? context.supabase.from("catalog_products").insert(row)
        : context.supabase
            .from("catalog_products")
            .update(row)
            .eq("id", row.id)
            .eq("updated_at", data.expected);
    const { data: saved, error } = await query.select("id,data,updated_at").maybeSingle();
    if (error || !saved)
      throw new Error(
        "O produto mudou ou não foi salvo. Atualize a lista antes de tentar novamente.",
      );
    return catalogFromRows([saved]).find((p) => p.id === saved.id);
  });

export const deleteCatalogProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().min(1).max(64) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !admin) throw new Error("Acesso restrito à administração.");
    // Permanent delete: the product is also taken out of any combo; combos left with an empty group are paused.
    const { data: result, error } = await context.supabase.rpc("admin_remove_catalog_product", {
      _product_id: data.id,
    });
    if (error)
      throw new Error(
        error.message?.includes("administradores")
          ? "Acesso restrito à administração."
          : "Não foi possível excluir o produto. Tente novamente.",
      );
    const info = (result ?? {}) as { combos?: string[]; paused?: string[] };
    return { id: data.id, combos: info.combos ?? [], paused: info.paused ?? [] };
  });
// Bulk price edits only touch price fields; every other product field is re-read on the server.
export const saveBulkPrices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        ids: z
          .array(z.string().regex(/^[a-zA-Z0-9_-]{1,30}$/))
          .min(1, "Escolha pelo menos um produto.")
          .max(1000)
          .refine((ids) => new Set(ids).size === ids.length),
        change: bulkPriceChangeSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !admin) throw new Error("Acesso restrito à administração.");
    const rows = [];
    for (let i = 0; i < data.ids.length; i += 200) {
      const { data: chunk, error } = await context.supabase
        .from("catalog_products")
        .select("id,data,updated_at")
        .in("id", data.ids.slice(i, i + 200));
      if (error) throw new Error("Não foi possível carregar os produtos.");
      rows.push(...chunk);
    }
    const catalog = new Map(catalogFromRows(rows).map((p) => [p.id, p]));
    let saved = 0;
    const failed: string[] = [];
    for (const id of data.ids) {
      const current = catalog.get(id);
      if (!current) {
        failed.push(id);
        continue;
      }
      const parsed = catalogProductSchema.safeParse({
        ...toDraft(current),
        ...bulkPrice(current, data.change),
      });
      if (!parsed.success) {
        failed.push(current.name);
        continue;
      }
      const row = { id, data: parsed.data, updated_at: new Date().toISOString() };
      const query =
        current.updatedAt === null
          ? context.supabase.from("catalog_products").insert(row)
          : context.supabase
              .from("catalog_products")
              .update(row)
              .eq("id", id)
              .eq("updated_at", current.updatedAt);
      const { data: written, error } = await query.select("id").maybeSingle();
      if (error || !written) failed.push(current.name);
      else saved++;
    }
    return { saved, failed };
  });
