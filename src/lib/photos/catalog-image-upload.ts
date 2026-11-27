import { supabase } from "@/integrations/supabase/client";
import {
  catalogImageId,
  prepareCatalogImage,
  type CatalogImageVariants,
} from "./image-derivatives";

export type UploadedCatalogImage = {
  originalPath: string;
  variants: CatalogImageVariants;
  previewUrl: string;
};

function isExistingObject(error: {
  message?: string | undefined;
  statusCode?: string | number | undefined;
  error?: string | undefined;
}) {
  return (
    String(error.statusCode) === "409" ||
    /already exists|duplicate/i.test(`${error.error ?? ""} ${error.message ?? ""}`)
  );
}

/** Uploads every immutable object before returning a path that may be saved in catalog data. */
export async function uploadCatalogImage(file: File): Promise<UploadedCatalogImage> {
  const prepared = await prepareCatalogImage(file, await catalogImageId(file));
  const bucket = supabase.storage.from("product-photos");
  // The `_original_` object is the completion marker consumed by the catalog resolver.
  // Upload it last so an interrupted pipeline can never advertise missing derivatives.
  const ordered = [...prepared.uploads].sort(
    (left, right) =>
      Number(left.path.includes("_original_")) - Number(right.path.includes("_original_")),
  );
  for (const item of ordered) {
    const { error } = await bucket.upload(item.path, item.blob, {
      contentType: item.contentType,
      cacheControl: "31536000",
      upsert: false,
    });
    // Content-addressed paths make a retry safe after a partial upload. Existing
    // objects from this pipeline version are immutable and need no replacement.
    if (error && !isExistingObject(error)) {
      throw new Error(
        "Não foi possível enviar todos os tamanhos da foto. O catálogo não foi alterado.",
      );
    }
  }
  const { data, error } = await bucket.createSignedUrl(prepared.variants.gallery, 3600);
  if (error || !data?.signedUrl) throw new Error("Não foi possível conferir a foto otimizada.");
  return {
    originalPath: prepared.originalPath,
    variants: prepared.variants,
    previewUrl: data.signedUrl,
  };
}
