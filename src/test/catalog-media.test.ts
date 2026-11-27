import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminCatalog, getCatalog } from "@/lib/catalog.functions";
import { getStoreSettings } from "@/lib/store-settings.functions";
import { EMPTY_SETTINGS } from "@/lib/store-settings";
import { mergeCatalog, productPhotosFor, toDraft, variationPhoto } from "@/lib/catalog";
import { catalogDerivativePaths } from "@/lib/photos/image-derivatives";

const { createClient, requireSupabaseAuth } = vi.hoisted(() => ({
  createClient: vi.fn(),
  requireSupabaseAuth: Symbol("authenticated Supabase request"),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let authenticated = false;
    const chain = {
      middleware: (middleware: unknown[]) => {
        authenticated = middleware.includes(requireSupabaseAuth);
        return chain;
      },
      inputValidator: () => chain,
      handler:
        (fn: (args: { context?: unknown }) => unknown) =>
        async (args: { context?: unknown } = {}) => {
          if (authenticated && !args.context) throw new Error("Authentication required");
          return fn(args);
        },
    };
    return chain;
  },
}));

const host = "https://storage.example";
const publicKey = "fixture-publishable";
const serviceKey = "fixture-service";
const cover = "uploads/cover.jpg";
const paths = [
  "uploads/first.jpg",
  `uploads/v1-${"a".repeat(32)}_original_webp.png`,
  "uploads/last.jpg",
];
const optimized = paths[1]!;
const derived = catalogDerivativePaths(optimized)!;
const denied = `uploads/v1-${"b".repeat(32)}_original_webp.png`;
const activeVideo = "uploads/active.mp4";
const pausedVideo = "uploads/paused.mp4";
const deniedVideo = "uploads/denied.mp4";
const wrongLink = "uploads/wrong-link.jpg";
const signed = (bucket: string, path: string) =>
  `${host}/storage/v1/object/sign/${bucket}/${path}?token=fixture`;
const photo = (path: string) => signed("product-photos", path);
const video = (path: string) => signed("product-videos", path);
const base = toDraft(mergeCatalog([])[0]!);
const row = (id: string, data: Partial<typeof base>) => ({
  id,
  updated_at: "2026-11-27T00:00:00Z",
  data: {
    ...base,
    id,
    image: cover,
    images: paths,
    variations: [{ name: "Uva", active: true, stock: null }],
    variationPhotos: { Uva: optimized },
    ...data,
  },
});

function storageClient(rows: ReturnType<typeof row>[], allowed: string[], admin = false) {
  const sign = vi.fn(async (bucket: string, requested: string[]) => ({
    error: null,
    data: requested.map((path) => ({
      path,
      error: allowed.includes(path) ? null : "RLS denied or missing",
      signedUrl: !allowed.includes(path)
        ? null
        : path === wrongLink
          ? signed(bucket, cover)
          : signed(bucket, path),
    })),
  }));
  const client = {
    storage: {
      from: (bucket: string) => ({
        createSignedUrls: (requested: string[]) => sign(bucket, requested),
      }),
    },
    rpc: vi.fn(async (name: string) => ({ error: null, data: name === "has_role" ? admin : rows })),
    from: vi.fn(() => {
      const query = {
        select: () => query,
        order: () => query,
        range: async () => ({ data: rows, error: null }),
      };
      return query;
    }),
  };
  return { client, sign };
}

const readAdmin = getAdminCatalog as unknown as (args?: {
  context: { userId: string; supabase: unknown };
}) => ReturnType<typeof getAdminCatalog>;

beforeEach(() => {
  createClient.mockReset();
  vi.stubEnv("SUPABASE_URL", host);
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", publicKey);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", serviceKey);
});
afterEach(() => vi.unstubAllEnvs());

describe("catalog media authorization", () => {
  it("uses anonymous RLS for public originals and active videos, and only signs authorized siblings with the service client", async () => {
    const rows = [
      row("active", { video: activeVideo, images: [...paths, denied] }),
      row("paused", { active: false, video: pausedVideo, image: denied, images: [] }),
      row("paused-shared", { active: false, video: activeVideo }),
      row("missing", { video: deniedVideo, image: wrongLink }),
    ];
    const anon = storageClient(rows, [cover, optimized, activeVideo, wrongLink]);
    const privileged = storageClient(
      [],
      [denied, pausedVideo, deniedVideo, ...Object.values(derived)],
    );
    createClient.mockImplementation((_url, key) =>
      key === serviceKey ? privileged.client : anon.client,
    );

    const [active, paused, pausedShared, missing] = await getCatalog();
    expect(active).toMatchObject({
      image: photo(cover),
      video: video(activeVideo),
      photoVariants: {
        [optimized]: {
          thumb: photo(derived.thumb),
          card: photo(derived.card),
          gallery: photo(derived.gallery),
        },
      },
    });
    expect(active?.photoVariants).not.toHaveProperty(denied);
    expect(paused).toMatchObject({ image: "", video: "" });
    expect(pausedShared?.video).toBe("");
    expect(missing).toMatchObject({ image: "", video: "" });
    expect(anon.sign).toHaveBeenCalledWith("product-videos", [activeVideo, deniedVideo]);
    expect(privileged.sign.mock.calls).toEqual([["product-photos", Object.values(derived)]]);
  });

  it("keeps authorized originals when derivative signing fails or there is no service key", async () => {
    const anon = storageClient([row("active", { image: optimized })], [optimized]);
    const privileged = storageClient([], [derived.thumb, derived.card]);
    createClient.mockImplementation((_url, key) =>
      key === serviceKey ? privileged.client : anon.client,
    );
    const [incomplete] = await getCatalog();
    expect(incomplete?.image).toBe(photo(optimized));
    expect(incomplete?.photoVariants).toEqual({});

    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    createClient.mockClear();
    const [anonymousOnly] = await getCatalog();
    expect(anonymousOnly?.image).toBe(photo(optimized));
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it("requires authentication and admin role, then uses the authenticated client's media permissions", async () => {
    const rows = [row("paused", { active: false, image: optimized, video: pausedVideo })];
    const visitor = storageClient(rows, []);
    const admin = storageClient(rows, [optimized, pausedVideo, ...Object.values(derived)], true);
    await expect(readAdmin()).rejects.toThrow("Authentication required");
    await expect(
      readAdmin({ context: { userId: "non-admin", supabase: visitor.client } }),
    ).rejects.toThrow("Acesso restrito");
    expect(visitor.sign).not.toHaveBeenCalled();

    const [product] = await readAdmin({ context: { userId: "admin", supabase: admin.client } });
    expect(admin.client.rpc).toHaveBeenCalledWith("has_role", {
      _user_id: "admin",
      _role: "admin",
    });
    expect(product?.video).toBe(video(pausedVideo));
    expect(product?.photoVariants?.[optimized]?.gallery).toBe(photo(derived.gallery));
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe("public banner authorization", () => {
  it.each([
    ["forbidden original", false, false, ""],
    ["missing derivative", true, false, photo(optimized)],
    ["authorized derivative", true, true, photo(derived.gallery)],
  ] as const)("%s", async (_label, originalAllowed, derivativeAllowed, expected) => {
    const signOriginal = vi.fn(async () => ({
      data: originalAllowed ? { signedUrl: photo(optimized) } : null,
      error: originalAllowed ? null : "RLS denied",
    }));
    const signDerivative = vi.fn(async () => ({
      data: derivativeAllowed ? { signedUrl: photo(derived.gallery) } : null,
    }));
    const query = {
      select: () => query,
      eq: () => query,
      maybeSingle: async () => ({
        data: { ...EMPTY_SETTINGS, catalog_appearance: { bannerImage: optimized } },
        error: null,
      }),
    };
    createClient.mockImplementation((_url, key) =>
      key === serviceKey
        ? { storage: { from: () => ({ createSignedUrl: signDerivative }) } }
        : { from: () => query, storage: { from: () => ({ createSignedUrl: signOriginal }) } },
    );
    expect((await getStoreSettings()).banner_image_url).toBe(expected);
    expect(signOriginal).toHaveBeenCalledWith(optimized, 21600);
    if (originalAllowed) expect(signDerivative).toHaveBeenCalledWith(derived.gallery, 21600);
    else expect(signDerivative).not.toHaveBeenCalled();
  });
});

describe("gallery identity by stored path", () => {
  it.each([
    ["first missing", [0]],
    ["middle missing", [1]],
    ["last missing", [2]],
    ["multiple missing", [0, 2]],
    ["all missing", [0, 1, 2]],
    ["all present", []],
  ] as const)("%s", async (_label, absent) => {
    const missing = new Set<number>(absent);
    const present = paths.filter((_, index) => !missing.has(index));
    const anon = storageClient([row("active", {})], [cover, ...present]);
    const signer = storageClient([], Object.values(derived));
    createClient.mockImplementation((_url, key) =>
      key === serviceKey ? signer.client : anon.client,
    );
    const [product] = await getCatalog();
    if (!product) throw new Error("Missing catalog product");

    expect(product.images).toEqual(present.map(photo));
    expect(product.galleryPhotoUrls).toEqual(
      Object.fromEntries(paths.map((path) => [path, present.includes(path) ? photo(path) : ""])),
    );
    for (const kind of ["thumb", "card", "gallery"] as const) {
      expect(productPhotosFor(product, kind)).toEqual([
        photo(cover),
        ...present.map((path) => photo(path === optimized ? derived[kind] : path)),
      ]);
    }
    expect(variationPhoto(product, "Uva")).toBe(missing.has(1) ? "" : photo(derived.gallery));
    expect(toDraft(product).images).toEqual(paths);
    expect(toDraft(product).variationPhotos).toEqual({ Uva: optimized });
  });
});
