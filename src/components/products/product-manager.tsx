import { uploadCatalogImage } from "@/lib/photos/catalog-image-upload";
import { useRef, useState, useId, type ReactNode } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Plus,
  Pencil,
  Pause,
  Play,
  Search,
  Save,
  Upload,
  Trash2,
  Package,
  Star,
  Percent,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { adminCatalogQuery, useCatalogUpdates } from "@/lib/catalog.query";
import { deleteCatalogProduct, saveCatalogProduct } from "@/lib/catalog.functions";
import {
  available,
  catalogProductSchema,
  cleanVariationPhotos,
  discountPercent,
  lowStockItems,
  productPhotosFor,
  toDraft,
  type CatalogProduct,
  type ProductDraft,
} from "@/lib/catalog";
import { brl } from "@/lib/products";
import { matchesSearch } from "@/lib/product-search";
import { ComboGroupsEditor } from "./combo-groups-editor";
import { AiPhotoEditor } from "./ai-photo-editor";
import { BulkPriceDialog } from "./bulk-price-dialog";
import { BulkSharpenDialog } from "./bulk-sharpen-dialog";
import { ProductVideoField } from "./product-video-field";
import { AiDescription } from "./ai-description";

export function ProductManager() {
  const { data: products } = useSuspenseQuery(adminCatalogQuery);
  useCatalogUpdates();
  const client = useQueryClient();
  const save = useServerFn(saveCatalogProduct);
  const remove = useServerFn(deleteCatalogProduct);
  const [deleting, setDeleting] = useState<CatalogProduct[] | null>(null);
  // Keeps the dialog text stable while it animates closed.
  const lastDeleting = useRef<CatalogProduct[]>([]);
  if (deleting) lastDeleting.current = deleting;
  const shownDeleting = deleting ?? lastDeleting.current;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState<{
    draft: ProductDraft;
    expected: string | null;
    preview: string;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [sharpenList, setSharpenList] = useState<CatalogProduct[] | null>(null);
  const [bgList, setBgList] = useState<CatalogProduct[] | null>(null);
  const categories = [...new Set(products.map((p) => p.category))];
  const [tab, setTab] = useState<"produtos" | "combos" | "falta">("produtos");
  const regular = products.filter((p) => !p.comboGroups?.length);
  const comboList = products.filter((p) => Boolean(p.comboGroups?.length));
  const lowList = regular.filter((p) => lowStockItems(p).length > 0);
  const managed = tab === "combos" ? comboList : tab === "falta" ? lowList : regular;
  const visible = managed.filter(
    (p) =>
      (!category || p.category === category) &&
      matchesSearch(p, query) &&
      (filter === "all" ||
        (filter === "active"
          ? available(p)
          : filter === "low"
            ? lowStockItems(p).length > 0
            : !available(p))),
  );
  const persist = async (product: ProductDraft, expected: string | null) => {
    setBusy(true);
    setMessage("");
    try {
      await save({ data: { product, expected } });
      await client.invalidateQueries({ queryKey: adminCatalogQuery.queryKey });
      setEditing(null);
      setMessage("Produto salvo.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  };
  const edit = (p: CatalogProduct) => {
    setMessage("");
    setEditing({ draft: toDraft(p), expected: p.updatedAt, preview: p.image ?? "" });
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    setMessage("");
    const failed: string[] = [];
    const paused = new Set<string>();
    let done = 0;
    for (const p of deleting) {
      try {
        const r = await remove({ data: { id: p.id } });
        r.paused.forEach((name) => paused.add(name));
        done++;
      } catch (e) {
        failed.push(`${p.name}: ${e instanceof Error ? e.message : "não foi possível excluir"}`);
      }
    }
    await client.invalidateQueries({ queryKey: adminCatalogQuery.queryKey });
    setSelected(new Set());
    setDeleting(null);
    setBusy(false);
    setMessage(
      [
        done
          ? `${done} ${done === 1 ? "produto excluído definitivamente" : "produtos excluídos definitivamente"}.`
          : "",
        paused.size
          ? `Combo pausado porque ficou sem opções num grupo: ${[...paused].join(", ")}.`
          : "",
        ...failed,
      ]
        .filter(Boolean)
        .join(" "),
    );
  };
  const startNew = (combo: boolean) => {
    setMessage("");
    setEditing({
      draft: {
        id: `n${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`,
        name: "",
        description: "",
        price: 0,
        compareAtPrice: null,
        category: combo ? "Combos" : "",
        emoji: "🛍️",
        image: "",
        images: [],
        variationPhotos: {},
        video: "",
        youtube: "",
        active: true,
        featured: false,
        stock: null,
        minStock: null,
        optionLabel: "Sabor",
        allowOther: false,
        variations: [],
        comboGroups: combo
          ? [{ id: crypto.randomUUID(), name: "", quantity: 1, productIds: [] }]
          : [],
      },
      expected: null,
      preview: "",
    });
  };
  return (
    <section className="py-7">
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Seções do catálogo">
        {(
          [
            { id: "produtos", label: "Produtos", count: regular.length },
            { id: "combos", label: "Combos", count: comboList.length },
            { id: "falta", label: "Em Falta", count: lowList.length },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${tab === t.id ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
            <span
              className={`grid min-w-6 place-items-center rounded-full px-1.5 py-0.5 text-xs font-bold ${tab === t.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Ações rápidas do catálogo
      </p>
      <div className="mb-5 grid grid-cols-3 gap-2">
        <Button
          onClick={() => startNew(false)}
          className="h-auto min-h-11 px-2 py-2.5 text-xs sm:text-sm"
        >
          <Plus />
          Novo Produto
        </Button>
        <Button
          variant="outline"
          onClick={() => startNew(true)}
          className="h-auto min-h-11 px-2 py-2.5 text-xs sm:text-sm"
        >
          <Plus />
          Criar Combo
        </Button>
        <Button
          variant="outline"
          onClick={() => setBulkOpen(true)}
          className="h-auto min-h-11 px-2 py-2.5 text-xs sm:text-sm"
        >
          <Percent />
          Preços em Lote
        </Button>
      </div>
      <BulkSharpenDialog
        mode="background"
        open={Boolean(bgList)}
        onOpenChange={(o) => {
          if (!o) setBgList(null);
        }}
        products={bgList ?? []}
      />
      <BulkSharpenDialog
        open={Boolean(sharpenList)}
        onOpenChange={(o) => {
          if (!o) setSharpenList(null);
        }}
        products={sharpenList ?? []}
      />
      <BulkPriceDialog
        key={bulkOpen ? "open" : "closed"}
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        products={visible}
      />
      <div className="mb-2 flex flex-wrap gap-2">
        <div className="relative w-full min-w-0 sm:flex-1">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <input
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            className="field pl-10 pr-10"
            aria-label="Buscar produtos no painel"
            placeholder="Nome, sabor ou categoria"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={() => setQuery("")}
              className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground"
            >
              ✕
            </button>
          )}
        </div>
        <select
          className="field min-w-0 flex-1 sm:w-auto sm:max-w-40 sm:flex-none"
          aria-label="Filtrar categoria"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          className="field min-w-0 flex-1 sm:w-auto sm:max-w-32 sm:flex-none"
          aria-label="Disponibilidade"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Todos</option>
          <option value="active">Disponíveis</option>
          <option value="paused">Indisponíveis</option>
          <option value="low">Estoque baixo</option>
        </select>
      </div>
      <p className="mb-5 text-xs text-muted-foreground">
        Mostrando {visible.length} de {managed.length}
        {(query || category || filter !== "all") && (
          <>
            {" "}
            ·{" "}
            <button
              type="button"
              className="text-primary underline"
              onClick={() => {
                setQuery("");
                setCategory("");
                setFilter("all");
              }}
            >
              limpar filtros
            </button>
          </>
        )}
        {tab === "produtos" && " · combos ficam na aba Combos"}
      </p>
      {visible.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              aria-label="Selecionar todos os produtos da lista"
              checked={visible.every((p) => selected.has(p.id))}
              onChange={(e) =>
                setSelected(
                  e.target.checked
                    ? new Set([...selected, ...visible.map((p) => p.id)])
                    : new Set([...selected].filter((id) => !visible.some((p) => p.id === id))),
                )
              }
            />
            Selecionar todos
          </label>
          {selected.size > 0 && (
            <>
              <span className="text-muted-foreground">{selected.size} selecionado(s)</span>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() => {
                  setMessage("");
                  setDeleting(managed.filter((p) => selected.has(p.id)));
                }}
              >
                <Trash2 />
                Excluir selecionados
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setSharpenList(managed.filter((p) => selected.has(p.id)))}
              >
                <Sparkles />
                Melhorar nitidez
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setBgList(managed.filter((p) => selected.has(p.id)))}
              >
                <Sparkles />
                Novo fundo com IA
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                Limpar
              </Button>
            </>
          )}
        </div>
      )}
      {!editing && message && (
        <p role="status" className="mb-4 text-sm text-primary">
          {message}
        </p>
      )}
      <div className="grid grid-cols-1 gap-3">
        {visible.map((p) => {
          const status = !p.active
            ? { label: "Pausado", cls: "bg-muted text-muted-foreground" }
            : !available(p)
              ? { label: "Esgotado", cls: "bg-destructive/15 text-destructive" }
              : { label: "Disponível", cls: "bg-whatsapp/15 text-whatsapp" };
          const stockLabel = p.stock === null ? "sem limite" : `${p.stock} uni.`;
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm"
            >
              <input
                type="checkbox"
                className="size-5 shrink-0 accent-primary"
                aria-label={`Selecionar ${p.name}`}
                checked={selected.has(p.id)}
                onChange={(e) =>
                  setSelected((prev) => {
                    const n = new Set(prev);
                    if (e.target.checked) n.add(p.id);
                    else n.delete(p.id);
                    return n;
                  })
                }
              />
              <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-photo">
                {p.image ? (
                  <img
                    src={productPhotosFor(p, "thumb")[0] ?? p.image}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-contain"
                  />
                ) : (
                  <Package className="text-photo-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold leading-tight">{p.name}</h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.cls}`}
                  >
                    {status.label} • {stockLabel}
                  </span>
                  {p.featured && (
                    <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      <Star className="size-3" />
                      Destaque
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {p.category.replace("Narguiles > ", "")}
                  {p.variations.length ? ` · ${p.variations.length} variações` : ""}
                </p>
                {lowStockItems(p).map((item) => (
                  <p
                    key={item.label}
                    role="status"
                    className="mt-1 text-[11px] font-medium text-destructive"
                  >
                    Repor: {item.label} — restam {item.stock} (mínimo {item.min})
                  </p>
                ))}
              </div>
              <div className="flex shrink-0 flex-col items-end justify-between gap-2 self-stretch py-0.5">
                <span className="text-right font-mono text-sm font-semibold">
                  {discountPercent(p) !== null && (
                    <span className="block text-xs font-normal text-muted-foreground line-through">
                      {brl(p.compareAtPrice ?? 0)}
                    </span>
                  )}
                  {brl(p.price)}
                  {discountPercent(p) !== null && (
                    <span className="block text-xs font-semibold text-destructive">
                      -{discountPercent(p)}%
                    </span>
                  )}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    title="Editar produto"
                    aria-label={`Editar ${p.name}`}
                    onClick={() => edit(p)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={busy}
                    title={p.active ? "Pausar produto" : "Reativar produto"}
                    aria-label={`${p.active ? "Pausar" : "Reativar"} ${p.name}`}
                    onClick={() => persist({ ...toDraft(p), active: !p.active }, p.updatedAt)}
                  >
                    {p.active ? <Pause /> : <Play />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive"
                    disabled={busy}
                    title="Excluir produto"
                    aria-label={`Excluir ${p.name}`}
                    onClick={() => {
                      setMessage("");
                      setDeleting([p]);
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        {!visible.length && (
          <p className="rounded-2xl border border-dashed py-12 text-center text-muted-foreground">
            Nenhum produto encontrado.
          </p>
        )}
      </div>
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open && !busy) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogTitle>{editing?.draft.name || "Novo produto"}</DialogTitle>
          <DialogDescription>S7VEN · Produtos e estoque</DialogDescription>
          {editing && (
            <ProductEditor
              combos={Boolean(editing.draft.comboGroups.length)}
              products={products.filter((p) => p.id !== editing.draft.id)}
              initial={editing.draft}
              preview={editing.preview}
              galleryPreview={products.find((p) => p.id === editing.draft.id)?.images ?? []}
              videoPreview={products.find((p) => p.id === editing.draft.id)?.video ?? ""}
              categories={categories}
              busy={busy}
              message={message}
              onSave={(p) => persist(p, editing.expected)}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open && !busy) setDeleting(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogTitle>
            {shownDeleting.length === 1
              ? `Excluir ${shownDeleting[0]?.name}?`
              : `Excluir ${shownDeleting.length} produtos?`}
          </DialogTitle>
          <DialogDescription>
            {shownDeleting.length > 1 && (
              <span className="mb-2 block max-h-32 overflow-y-auto">
                {shownDeleting.map((p) => p.name).join(", ")}
              </span>
            )}
            Esta ação remove para sempre, inclusive dos combos em que aparece. Se quiser apenas
            escondê-lo do catálogo, use Pausar.
          </DialogDescription>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" disabled={busy} onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => void confirmDelete()}>
              {busy ? "Excluindo…" : "Excluir para sempre"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ProductEditor({
  initial,
  preview,
  galleryPreview,
  videoPreview,
  categories,
  busy,
  message,
  onSave,
  combos,
  products,
}: {
  initial: ProductDraft;
  preview: string;
  galleryPreview: string[];
  videoPreview: string;
  categories: string[];
  busy: boolean;
  message: string;
  onSave: (p: ProductDraft) => void;
  combos: boolean;
  products: CatalogProduct[];
}) {
  const [draft, setDraft] = useState(initial);
  const [photo, setPhoto] = useState(preview);
  const [extraPreviews, setExtraPreviews] = useState(galleryPreview);
  const [uploading, setUploading] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [descBusy, setDescBusy] = useState(false);
  const [aiPhoto, setAiPhoto] = useState(-1);
  const [error, setError] = useState("");
  const categoryId = useId();
  const photos = [
    ...(draft.image ? [{ path: draft.image, preview: photo }] : []),
    ...draft.images.map((path, i) => ({ path, preview: extraPreviews[i] ?? "" })),
  ];
  // Keep variation-photo links consistent when a photo path is replaced or removed.
  const unlinkPhoto = (d: ProductDraft, path: string): ProductDraft => ({
    ...d,
    variationPhotos: Object.fromEntries(
      Object.entries(d.variationPhotos ?? {}).filter(([, v]) => v !== path),
    ),
  });
  const remapPhoto = (d: ProductDraft, from: string, to: string): ProductDraft => ({
    ...d,
    variationPhotos: Object.fromEntries(
      Object.entries(d.variationPhotos ?? {}).map(([k, v]) => [k, v === from ? to : v]),
    ),
  });
  const applyAiPhoto = async (file: File) => {
    const selected = photos[aiPhoto];
    if (!selected) throw new Error("Selecione uma foto.");
    const uploaded = await uploadCatalogImage(file);
    if (aiPhoto === 0) {
      setDraft((d) => ({
        ...remapPhoto(d, selected.path, uploaded.originalPath),
        image: uploaded.originalPath,
      }));
      setPhoto(uploaded.previewUrl);
    } else {
      setDraft((d) => ({
        ...remapPhoto(d, selected.path, uploaded.originalPath),
        images: d.images.map((p, i) => (i === aiPhoto - 1 ? uploaded.originalPath : p)),
      }));
      setExtraPreviews((p) => p.map((url, i) => (i === aiPhoto - 1 ? uploaded.previewUrl : url)));
    }
    setAiPhoto(-1);
  };
  const upload = async (picked: File[]) => {
    if (!picked.length) return;
    setUploading(true);
    setError("");
    try {
      let hasCover = Boolean(draft.image);
      for (const file of picked) {
        const uploaded = await uploadCatalogImage(file);
        if (!hasCover) {
          setDraft((d) => ({ ...d, image: uploaded.originalPath }));
          setPhoto(uploaded.previewUrl);
          hasCover = true;
        } else {
          setDraft((d) => ({ ...d, images: [...d.images, uploaded.originalPath] }));
          setExtraPreviews((prev) => [...prev, uploaded.previewUrl]);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar foto.");
    } finally {
      setUploading(false);
    }
  };
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (combos && !draft.comboGroups.length) {
          setError("Cadastre pelo menos um grupo.");
          return;
        }
        const parsed = catalogProductSchema.safeParse(cleanVariationPhotos(draft));
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Confira os campos.");
          return;
        }
        setError("");
        onSave(parsed.data);
      }}
    >
      <fieldset disabled={busy || uploading || aiBusy || videoBusy} className="space-y-5">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">Fotos do produto</h3>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary">
              <Upload className="size-4" />
              {uploading ? "Enviando…" : "Adicionar fotos"}
              <input
                aria-label="Enviar foto do produto"
                type="file"
                multiple
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  void upload(files);
                }}
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Sem limite de fotos · qualquer tamanho (a foto é ajustada sozinha)
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {[
              ...(draft.image ? [{ path: draft.image, preview: photo }] : []),
              ...draft.images.map((path, i) => ({ path, preview: extraPreviews[i] ?? "" })),
            ].map((item, index) => (
              <div key={item.path} className="w-24">
                <div className="grid size-24 place-items-center overflow-hidden rounded border bg-photo">
                  {item.preview ? (
                    <img
                      src={item.preview}
                      alt={`Foto ${index + 1} do produto`}
                      className="size-full object-contain"
                    />
                  ) : (
                    <Package className="text-photo-foreground" />
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <Button
                    type="button"
                    variant={index === 0 ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-1 text-xs"
                    disabled={index === 0}
                    onClick={() => {
                      const extra = index - 1;
                      const next = draft.images[extra];
                      if (!next) return;
                      setDraft((d) => ({
                        ...d,
                        image: next,
                        images: d.images.map((path, i) => (i === extra ? d.image : path)),
                      }));
                      setPhoto(item.preview);
                      setExtraPreviews((prev) => prev.map((url, i) => (i === extra ? photo : url)));
                    }}
                  >
                    {index === 0 ? "Capa" : "Usar capa"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    title="Remover foto"
                    aria-label={`Remover foto ${index + 1}`}
                    onClick={() => {
                      if (index === 0) {
                        setDraft((d) => ({
                          ...unlinkPhoto(d, item.path),
                          image: d.images[0] ?? "",
                          images: d.images.slice(1),
                        }));
                        setPhoto(extraPreviews[0] ?? "");
                        setExtraPreviews((prev) => prev.slice(1));
                      } else {
                        setDraft((d) => ({
                          ...unlinkPhoto(d, item.path),
                          images: d.images.filter((_, i) => i !== index - 1),
                        }));
                        setExtraPreviews((prev) => prev.filter((_, i) => i !== index - 1));
                      }
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
                {draft.variations.length > 0 && (
                  <select
                    aria-label={`Variação da foto ${index + 1}`}
                    title="Variação que usa esta foto"
                    className="mt-1 w-full rounded border bg-background px-1 py-0.5 text-[11px]"
                    value={
                      Object.entries(draft.variationPhotos ?? {}).find(
                        ([, v]) => v === item.path,
                      )?.[0] ?? ""
                    }
                    onChange={(e) => {
                      const name = e.target.value;
                      setDraft((d) => {
                        const vp: Record<string, string> = {};
                        for (const [k, v] of Object.entries(d.variationPhotos ?? {}))
                          if (v !== item.path) vp[k] = v;
                        if (name) vp[name] = item.path;
                        return { ...d, variationPhotos: vp };
                      });
                    }}
                  >
                    <option value="">Foto comum</option>
                    {draft.variations.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {draft.variations.length > 0
              ? "Dica: escolha a variação abaixo de uma foto para mostrá-la quando o cliente selecionar essa variação."
              : ""}
          </p>
        </div>
        <ProductVideoField
          draft={draft}
          preview={videoPreview}
          onBusy={setVideoBusy}
          onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
        />
        <label className="block text-sm">
          Nome
          <input
            className="field mt-1"
            required
            maxLength={150}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <PriceFields draft={draft} onChange={setDraft} />
        <div className="grid gap-4">
          <label className="block text-sm">
            Categoria
            <input
              className="field mt-1"
              list={categoryId}
              required
              maxLength={100}
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            />
            <datalist id={categoryId}>
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
        </div>
        <div>
          <label className="block text-sm">
            Descrição
            <textarea
              className="field mt-1 min-h-20"
              maxLength={2000}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </label>
          <AiDescription
            draft={draft}
            onBusy={setDescBusy}
            onUse={(description) => setDraft((d) => ({ ...d, description }))}
          />
        </div>
        <div className="flex items-center justify-between border-y py-4">
          <span className="text-sm">Ativo no catálogo</span>
          <Switch
            aria-label="Ativo no catálogo"
            checked={draft.active}
            onCheckedChange={(active) => setDraft({ ...draft, active })}
          />
        </div>
        <div className="flex items-center justify-between gap-4 border-b pb-4">
          <span className="flex items-center gap-2 text-sm">
            <Star className="size-4 text-primary" />
            Destaque no início do catálogo
          </span>
          <Switch
            aria-label="Destaque no início do catálogo"
            checked={draft.featured}
            onCheckedChange={(featured) => setDraft({ ...draft, featured })}
          />
        </div>
        <StockField
          label="Estoque do produto"
          stock={draft.stock}
          minStock={draft.minStock}
          onChange={(stock) => setDraft({ ...draft, stock })}
          onMinChange={(minStock) => setDraft({ ...draft, minStock })}
        />
        {combos ? (
          <ComboGroupsEditor
            groups={draft.comboGroups}
            products={products}
            onChange={(comboGroups) => setDraft({ ...draft, comboGroups })}
          />
        ) : (
          <div className="border-t pt-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Sabores e variações</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setDraft({
                    ...draft,
                    variations: [
                      ...draft.variations,
                      { name: "", active: true, stock: null, minStock: null },
                    ],
                  })
                }
              >
                <Plus /> Variação
              </Button>
            </div>
            {draft.variations.length > 0 && (
              <>
                <label className="block text-sm">
                  Tipo
                  <select
                    className="field mt-1"
                    value={draft.optionLabel}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        optionLabel: e.target.value as ProductDraft["optionLabel"],
                      })
                    }
                  >
                    <option>Sabor</option>
                    <option>Cor</option>
                    <option>Variação</option>
                  </select>
                </label>
                <div className="my-4 flex items-center justify-between">
                  <span className="text-sm">Permitir “Outro”</span>
                  <Switch
                    aria-label="Permitir Outro"
                    checked={draft.allowOther}
                    onCheckedChange={(allowOther) => setDraft({ ...draft, allowOther })}
                  />
                </div>
              </>
            )}
            {draft.variations.map((v, index) => (
              <div key={index} className="space-y-3 border-t py-4">
                <div className="flex items-center gap-3">
                  <input
                    className="field flex-1"
                    aria-label={`Nome da variação ${index + 1}`}
                    maxLength={40}
                    value={v.name}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        variations: draft.variations.map((o, i) =>
                          i === index ? { ...o, name: e.target.value } : o,
                        ),
                      })
                    }
                    placeholder="Nome da variação"
                    required
                  />
                  <Switch
                    aria-label={`Ativar variação ${index + 1}`}
                    checked={v.active}
                    onCheckedChange={(active) =>
                      setDraft({
                        ...draft,
                        variations: draft.variations.map((o, i) =>
                          i === index ? { ...o, active } : o,
                        ),
                      })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover variação ${index + 1}`}
                    title="Remover variação"
                    onClick={() => {
                      const variations = draft.variations.filter((_, i) => i !== index);
                      setDraft({
                        ...draft,
                        variations,
                        allowOther: variations.length ? draft.allowOther : false,
                      });
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <StockField
                  label={`Estoque da variação ${index + 1}`}
                  stock={v.stock}
                  minStock={v.minStock}
                  onChange={(stock) =>
                    setDraft({
                      ...draft,
                      allowOther: stock !== null ? false : draft.allowOther,
                      variations: draft.variations.map((o, i) =>
                        i === index ? { ...o, stock } : o,
                      ),
                    })
                  }
                  onMinChange={(minStock) =>
                    setDraft({
                      ...draft,
                      variations: draft.variations.map((o, i) =>
                        i === index ? { ...o, minStock } : o,
                      ),
                    })
                  }
                />
              </div>
            ))}
          </div>
        )}
      </fieldset>
      {photos.length > 0 && (
        <div className="space-y-3">
          <label className="block text-sm">
            Foto para editar com IA
            <select
              className="field mt-1"
              aria-label="Foto para editar com IA"
              value={aiPhoto}
              disabled={aiBusy || busy || uploading}
              onChange={(e) => setAiPhoto(Number(e.target.value))}
            >
              <option value={-1}>Selecione uma foto</option>
              {photos.map((p, i) => (
                <option key={p.path} value={i}>
                  Foto {i + 1}
                  {i === 0 ? " · Capa" : ""}
                </option>
              ))}
            </select>
          </label>
          {photos[aiPhoto]?.preview && (
            <AiPhotoEditor
              key={photos[aiPhoto]?.path}
              source={photos[aiPhoto]?.preview ?? ""}
              productName={draft.name}
              onApply={applyAiPhoto}
              onBusy={setAiBusy}
            />
          )}
        </div>
      )}
      {(error || message) && (
        <p role="alert" className="text-sm text-destructive">
          {error || message}
        </p>
      )}
      <div className="flex justify-end border-t pt-4">
        <Button type="submit" disabled={busy || uploading || aiBusy || descBusy}>
          <Save />
          {busy ? "Salvando…" : combos ? "Salvar combo" : "Salvar produto"}
        </Button>
      </div>
    </form>
  );
}
function StockField({
  label,
  stock,
  minStock,
  onChange,
  onMinChange,
}: {
  label: string;
  stock: number | null;
  minStock?: number | null;
  onChange: (n: number | null) => void;
  onMinChange?: (n: number | null) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm">{label}</span>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch
            aria-label={`Controlar ${label.toLowerCase()}`}
            checked={stock !== null}
            onCheckedChange={(checked) => {
              onChange(checked ? 0 : null);
              if (!checked) onMinChange?.(null);
            }}
          />
          Controlar quantidade
        </label>
      </div>
      {stock !== null && (
        <input
          aria-label={label}
          className="field mt-2"
          type="number"
          min="0"
          max="1000000"
          step="1"
          required
          value={stock}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      )}
      {stock !== null && onMinChange && (
        <label className="mt-3 block text-xs text-muted-foreground">
          Avisar para repor quando restarem
          <input
            aria-label={`Mínimo para alerta de ${label.toLowerCase()}`}
            className="field mt-1"
            type="number"
            min="0"
            max="1000000"
            step="1"
            placeholder="Sem alerta"
            value={minStock ?? ""}
            onChange={(e) => onMinChange(e.target.value === "" ? null : Number(e.target.value))}
          />
        </label>
      )}
    </div>
  );
}
// The form shows "normal" and "discounted" prices; storage keeps `price` as the charged value
// and `compareAtPrice` as the struck-through one, so checkout/pricing stay unchanged.
function PriceFields({
  draft,
  onChange,
}: {
  draft: ProductDraft;
  onChange: (d: ProductDraft) => void;
}) {
  const hasDiscount = draft.compareAtPrice !== null;
  const normal = hasDiscount ? (draft.compareAtPrice ?? 0) : draft.price;
  const off = discountPercent(draft);
  return (
    <div className="space-y-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Preço normal (R$)
          <input
            className="field mt-1"
            type="number"
            step="0.01"
            min="0"
            max="1000000"
            required
            value={normal}
            onChange={(e) => {
              const n = Number(e.target.value);
              onChange(hasDiscount ? { ...draft, compareAtPrice: n } : { ...draft, price: n });
            }}
          />
        </label>
        <label className="block text-sm">
          Preço com desconto (R$) <span className="text-xs text-muted-foreground">· opcional</span>
          <input
            className="field mt-1"
            type="number"
            step="0.01"
            min="0"
            max="1000000"
            placeholder="Sem desconto"
            value={hasDiscount ? draft.price : ""}
            onChange={(e) => {
              const v = e.target.value;
              onChange(
                v === ""
                  ? { ...draft, price: normal, compareAtPrice: null }
                  : { ...draft, price: Number(v), compareAtPrice: normal },
              );
            }}
          />
        </label>
      </div>
      {hasDiscount && (
        <p className="text-xs text-muted-foreground">
          {off !== null ? (
            <>
              No catálogo: <span className="line-through">{brl(normal)}</span> por{" "}
              <span className="font-semibold text-foreground">{brl(draft.price)}</span> ·{" "}
              <span className="font-semibold text-destructive">-{off}%</span>
            </>
          ) : (
            <span className="text-destructive">
              O preço com desconto precisa ser menor que o preço normal.
            </span>
          )}
        </p>
      )}
    </div>
  );
}
