import { shrinkImage } from "@/lib/shrink-image";
import { useState, useId, type ReactNode } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, Pause, Play, Search, Save, Upload, Trash2, Package, Star, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { adminCatalogQuery, useCatalogUpdates } from "@/lib/catalog.query";
import { deleteCatalogProduct, saveCatalogProduct } from "@/lib/catalog.functions";
import { available, catalogProductSchema, discountPercent, lowStockItems, toDraft, type CatalogProduct, type ProductDraft } from "@/lib/catalog";
import { brl } from "@/lib/products";
import { ComboGroupsEditor } from "./combo-groups-editor";
import { AiPhotoEditor } from "./ai-photo-editor";
import { BulkPriceDialog } from "./bulk-price-dialog";
import { ProductVideoField } from "./product-video-field";

export function ProductManager({ combos = false }: { combos?: boolean }) {
  const { data: products } = useSuspenseQuery(adminCatalogQuery);
  useCatalogUpdates();
  const client = useQueryClient();
  const save = useServerFn(saveCatalogProduct);
  const remove = useServerFn(deleteCatalogProduct);
  const [deleting, setDeleting] = useState<CatalogProduct[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState<{ draft: ProductDraft; expected: string | null; preview: string } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const categories = [...new Set(products.map(p => p.category))];
  const managed = products.filter(p => combos ? Boolean(p.comboGroups?.length) : !p.comboGroups?.length);
  const lowCount = managed.reduce((n, p) => n + lowStockItems(p).length, 0);
  const visible = managed.filter(p => (!category || p.category === category) && (!query || `${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase())) && (filter === "all" || (filter === "active" ? available(p) : filter === "low" ? lowStockItems(p).length > 0 : !available(p))));
  const persist = async (product: ProductDraft, expected: string | null) => {
    setBusy(true); setMessage("");
    try {
      await save({ data: { product, expected } });
      await client.invalidateQueries({ queryKey: adminCatalogQuery.queryKey });
      setEditing(null); setMessage("Produto salvo.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Não foi possível salvar."); }
    finally { setBusy(false); }
  };
  const edit = (p: CatalogProduct) => { setMessage(""); setEditing({ draft: toDraft(p), expected: p.updatedAt, preview: p.image ?? "" }); };
  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true); setMessage("");
    const failed: string[] = []; let done = 0;
    for (const p of deleting) {
      try { await remove({ data: { id: p.id } }); done++; }
      catch (e) { failed.push(`${p.name}: ${e instanceof Error ? e.message : "não foi possível excluir"}`); }
    }
    await client.invalidateQueries({ queryKey: adminCatalogQuery.queryKey });
    setSelected(new Set()); setDeleting(null); setBusy(false);
    setMessage([done ? `${done} ${done === 1 ? "produto excluído" : "produtos excluídos"}.` : "", ...failed].filter(Boolean).join(" "));
  };
  return <section className="py-7">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex gap-6 text-sm"><span><strong>{managed.length}</strong> {combos ? "combos" : "produtos"}</span><span className="text-muted-foreground">{managed.filter(p => !available(p)).length} indisponíveis</span>{lowCount > 0 && <span className="text-destructive"><strong>{lowCount}</strong> para repor</span>}</div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setBulkOpen(true)}><Percent />Mudar preços em lote</Button><Button onClick={() => { setMessage(""); setEditing({ draft: { id: `n${crypto.randomUUID().replaceAll("-", "").slice(0,24)}`, name: "", description: "", price: 0, compareAtPrice: null, category: combos ? "Combos" : "", emoji: "🛍️", image: "", images: [], variationPhotos: {}, video: "", youtube: "", active: true, featured: false, stock: null, minStock: null, optionLabel: "Sabor", allowOther: false, variations: [], comboGroups: combos ? [{ id: crypto.randomUUID(), name: "", quantity: 1, productIds: [] }] : [] }, expected: null, preview: "" }); }}><Plus /> {combos ? "Novo combo" : "Novo produto"}</Button></div>
    </div>
    <BulkPriceDialog key={bulkOpen ? "open" : "closed"} open={bulkOpen} onOpenChange={setBulkOpen} products={visible} />
    <div className="mb-5 flex flex-wrap gap-3">
      <div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><input className="field pl-10" aria-label="Buscar produtos no painel" placeholder="Buscar produtos" value={query} onChange={e => setQuery(e.target.value)} /></div>
      <select className="field w-auto" aria-label="Filtrar categoria" value={category} onChange={e => setCategory(e.target.value)}><option value="">Todas as categorias</option>{categories.map(c => <option key={c}>{c}</option>)}</select>
      <select className="field w-auto" aria-label="Disponibilidade" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Todos os produtos</option><option value="active">Disponíveis</option><option value="paused">Indisponíveis</option><option value="low">Estoque baixo</option></select>
    </div>
    {visible.length > 0 && <div className="mb-3 flex flex-wrap items-center gap-3 text-sm"><label className="inline-flex cursor-pointer items-center gap-2"><input type="checkbox" className="size-4 accent-primary" aria-label="Selecionar todos os produtos da lista" checked={visible.every(p => selected.has(p.id))} onChange={e => setSelected(e.target.checked ? new Set([...selected, ...visible.map(p => p.id)]) : new Set([...selected].filter(id => !visible.some(p => p.id === id))))} />Selecionar todos</label>{selected.size > 0 && <><span className="text-muted-foreground">{selected.size} selecionado(s)</span><Button size="sm" variant="destructive" disabled={busy} onClick={() => { setMessage(""); setDeleting(managed.filter(p => selected.has(p.id))); }}><Trash2 />Excluir selecionados</Button><Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Limpar</Button></>}</div>}
    {!editing && message && <p role="status" className="mb-4 text-sm text-primary">{message}</p>}
    <div className="divide-y border-y">
      {visible.map(p => <div key={p.id} className="flex flex-wrap items-center gap-4 py-4">
        <input type="checkbox" className="size-5 shrink-0 accent-primary" aria-label={`Selecionar ${p.name}`} checked={selected.has(p.id)} onChange={e => setSelected(prev => { const n = new Set(prev); if (e.target.checked) n.add(p.id); else n.delete(p.id); return n; })} />
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded bg-photo">{p.image ? <img src={p.image} alt={p.name} className="size-full object-contain" /> : <Package className="text-photo-foreground" />}</div>
        <div className="min-w-0 flex-1"><h2 className="font-semibold">{p.name}</h2><p className="mt-1 text-xs text-muted-foreground">{p.category} · {p.variations.length ? `${p.variations.length} variações` : "Sem variações"}</p><p className={`mt-1 text-xs ${available(p) ? "text-whatsapp" : "text-destructive"}`}>{!p.active ? "Pausado" : !available(p) ? "Esgotado" : "Disponível"} · {p.stock === null ? "Sem limite de estoque" : `${p.stock} unidades`}</p>{lowStockItems(p).map(item => <p key={item.label} role="status" className="mt-1 text-xs font-medium text-destructive">Repor: {item.label} — restam {item.stock} (mínimo {item.min})</p>)}</div>
        {p.featured && <span className="flex items-center gap-1 text-xs text-primary"><Star className="size-3" />Destaque</span>}
        <span className="text-right font-mono text-sm">{discountPercent(p) !== null && <span className="block text-xs text-muted-foreground line-through">{brl(p.compareAtPrice ?? 0)}</span>}{brl(p.price)}{discountPercent(p) !== null && <span className="block text-xs font-semibold text-destructive">-{discountPercent(p)}%</span>}</span>
        <div className="flex gap-1"><Button variant="outline" size="icon" title="Editar produto" aria-label={`Editar ${p.name}`} onClick={() => edit(p)}><Pencil /></Button><Button variant="ghost" size="icon" disabled={busy} title={p.active ? "Pausar produto" : "Reativar produto"} aria-label={`${p.active ? "Pausar" : "Reativar"} ${p.name}`} onClick={() => persist({ ...toDraft(p), active: !p.active }, p.updatedAt)}>{p.active ? <Pause /> : <Play />}</Button><Button variant="ghost" size="icon" disabled={busy} title="Excluir produto" aria-label={`Excluir ${p.name}`} onClick={() => { setMessage(""); setDeleting([p]); }}><Trash2 /></Button></div>
      </div>)}
      {!visible.length && <p className="py-12 text-center text-muted-foreground">Nenhum produto encontrado.</p>}
    </div>
    <Dialog open={Boolean(editing)} onOpenChange={open => { if (!open && !busy) setEditing(null); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogTitle>{editing?.draft.name || "Novo produto"}</DialogTitle><DialogDescription>S7VEN · Produtos e estoque</DialogDescription>
        {editing && <ProductEditor combos={combos} products={products.filter(p => p.id !== editing.draft.id)} initial={editing.draft} preview={editing.preview} galleryPreview={products.find(p => p.id === editing.draft.id)?.images ?? []} videoPreview={products.find(p => p.id === editing.draft.id)?.video ?? ""} categories={categories} busy={busy} message={message} onSave={p => persist(p, editing.expected)} />}
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(deleting)} onOpenChange={open => { if (!open && !busy) setDeleting(null); }}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>{deleting?.length === 1 ? `Excluir ${deleting[0]?.name}?` : `Excluir ${deleting?.length ?? 0} produtos?`}</DialogTitle>
        <DialogDescription>{deleting && deleting.length > 1 && <span className="mb-2 block max-h-32 overflow-y-auto">{deleting.map(p => p.name).join(", ")}</span>}Esta ação remove para sempre. Se quiser apenas escondê-lo do catálogo, use Pausar.</DialogDescription>
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</Button>
          <Button variant="destructive" disabled={busy} onClick={() => void confirmDelete()}>{busy ? "Excluindo…" : "Excluir para sempre"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  </section>;
}

function ProductEditor({ initial, preview, galleryPreview, videoPreview, categories, busy, message, onSave, combos, products }: { initial: ProductDraft; preview: string; galleryPreview: string[]; videoPreview: string; categories: string[]; busy: boolean; message: string; onSave: (p: ProductDraft) => void; combos: boolean; products: CatalogProduct[] }) {
  const [draft, setDraft] = useState(initial);
  const [photo, setPhoto] = useState(preview);
  const [extraPreviews, setExtraPreviews] = useState(galleryPreview);
  const [uploading, setUploading] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [aiPhoto, setAiPhoto] = useState(-1);
  const [error, setError] = useState("");
  const categoryId = useId();
  const photos = [...(draft.image ? [{ path: draft.image, preview: photo }] : []), ...draft.images.map((path, i) => ({ path, preview: extraPreviews[i] ?? "" }))];
  // Keep variation-photo links consistent when a photo path is replaced or removed.
  const unlinkPhoto = (d: ProductDraft, path: string): ProductDraft => ({ ...d, variationPhotos: Object.fromEntries(Object.entries(d.variationPhotos ?? {}).filter(([, v]) => v !== path)) });
  const remapPhoto = (d: ProductDraft, from: string, to: string): ProductDraft => ({ ...d, variationPhotos: Object.fromEntries(Object.entries(d.variationPhotos ?? {}).map(([k, v]) => [k, v === from ? to : v])) });
  const applyAiPhoto = async (file: File) => {
    const selected = photos[aiPhoto];
    if (!selected) throw new Error("Selecione uma foto.");
    if (file.size > 5*1024*1024) throw new Error("A foto editada excede 5 MB.");
    const path = `uploads/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage.from("product-photos").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw new Error("Não foi possível guardar a foto editada.");
    const { data, error: signedError } = await supabase.storage.from("product-photos").createSignedUrl(path,3600);
    if (signedError || !data) throw new Error("Não foi possível conferir a foto editada.");
    if (aiPhoto === 0) { setDraft(d => ({ ...remapPhoto(d, selected.path, path), image: path })); setPhoto(data.signedUrl); }
    else { setDraft(d => ({ ...remapPhoto(d, selected.path, path), images: d.images.map((p,i) => i === aiPhoto-1 ? path : p) })); setExtraPreviews(p => p.map((url,i) => i === aiPhoto-1 ? data.signedUrl : url)); }
    setAiPhoto(-1);
  };
  const upload = async (picked: File[]) => {
    if (!picked.length) return;
    if (picked.length + draft.images.length + (draft.image ? 1 : 0) > 10) { setError("Use até 10 fotos por produto."); return; }
    const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    setUploading(true); setError("");
    let files: File[];
    try { files = await Promise.all(picked.map(f => shrinkImage(f))); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível preparar a foto."); setUploading(false); return; }
    try {
      let hasCover = Boolean(draft.image);
      for (const file of files) {
        const path = `uploads/${crypto.randomUUID()}.${extensions[file.type]}`;
        const { error } = await supabase.storage.from("product-photos").upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw new Error("Não foi possível enviar uma foto. As fotos já enviadas foram mantidas.");
        const { data, error: signedError } = await supabase.storage.from("product-photos").createSignedUrl(path, 3600);
        if (signedError || !data) throw new Error("Não foi possível conferir a foto.");
        if (!hasCover) { setDraft(d => ({ ...d, image: path })); setPhoto(data.signedUrl); hasCover = true; }
        else { setDraft(d => ({ ...d, images: [...d.images, path] })); setExtraPreviews(prev => [...prev, data.signedUrl]); }
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao enviar foto."); }
    finally { setUploading(false); }
  };
  return <form className="space-y-5" onSubmit={e => { e.preventDefault(); if (combos && !draft.comboGroups.length) { setError("Cadastre pelo menos um grupo."); return; } const parsed = catalogProductSchema.safeParse(draft); if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Confira os campos."); return; } setError(""); onSave(parsed.data); }}>
    <fieldset disabled={busy || uploading || aiBusy || videoBusy} className="space-y-5">
      <div><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Fotos do produto</h3><label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary"><Upload className="size-4" />{uploading ? "Enviando…" : "Adicionar fotos"}<input aria-label="Enviar foto do produto" type="file" multiple accept="image/*" className="sr-only" onChange={e => { const files = Array.from(e.target.files ?? []); e.target.value = ""; void upload(files); }} /></label></div><p className="mt-2 text-xs text-muted-foreground">Até 10 fotos · qualquer tamanho (a foto é ajustada sozinha)</p><div className="mt-3 flex flex-wrap gap-3">{[...(draft.image ? [{ path: draft.image, preview: photo }] : []), ...draft.images.map((path, i) => ({ path, preview: extraPreviews[i] ?? "" }))].map((item, index) => <div key={item.path} className="w-24"><div className="grid size-24 place-items-center overflow-hidden rounded border bg-photo">{item.preview ? <img src={item.preview} alt={`Foto ${index + 1} do produto`} className="size-full object-contain" /> : <Package className="text-photo-foreground" />}</div><div className="mt-1 flex items-center justify-between"><Button type="button" variant={index === 0 ? "secondary" : "ghost"} size="sm" className="h-7 px-1 text-xs" disabled={index === 0} onClick={() => { const extra = index - 1; const next = draft.images[extra]; if (!next) return; setDraft(d => ({ ...d, image: next, images: d.images.map((path, i) => i === extra ? d.image : path) })); setPhoto(item.preview); setExtraPreviews(prev => prev.map((url, i) => i === extra ? photo : url)); }}>{index === 0 ? "Capa" : "Usar capa"}</Button><Button type="button" variant="ghost" size="icon" className="size-7" title="Remover foto" aria-label={`Remover foto ${index + 1}`} onClick={() => { if (index === 0) { setDraft(d => ({ ...unlinkPhoto(d, item.path), image: d.images[0] ?? "", images: d.images.slice(1) })); setPhoto(extraPreviews[0] ?? ""); setExtraPreviews(prev => prev.slice(1)); } else { setDraft(d => ({ ...unlinkPhoto(d, item.path), images: d.images.filter((_, i) => i !== index - 1) })); setExtraPreviews(prev => prev.filter((_, i) => i !== index - 1)); } }}><Trash2 /></Button></div>{draft.variations.length > 0 && <select aria-label={`Variação da foto ${index + 1}`} title="Variação que usa esta foto" className="mt-1 w-full rounded border bg-background px-1 py-0.5 text-[11px]" value={Object.entries(draft.variationPhotos ?? {}).find(([, v]) => v === item.path)?.[0] ?? ""} onChange={e => { const name = e.target.value; setDraft(d => { const vp: Record<string, string> = {}; for (const [k, v] of Object.entries(d.variationPhotos ?? {})) if (v !== item.path) vp[k] = v; if (name) vp[name] = item.path; return { ...d, variationPhotos: vp }; }); }}><option value="">Foto comum</option>{draft.variations.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}</select>}</div>)}</div><p className="mt-2 text-xs text-muted-foreground">{draft.variations.length > 0 ? "Dica: escolha a variação abaixo de uma foto para mostrá-la quando o cliente selecionar essa variação." : ""}</p></div>
      <ProductVideoField draft={draft} preview={videoPreview} onBusy={setVideoBusy} onChange={patch => setDraft(d => ({ ...d, ...patch }))} />
      <label className="block text-sm">Nome<input className="field mt-1" required maxLength={150} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
      <PriceFields draft={draft} onChange={setDraft} />
      <div className="grid gap-4"><label className="block text-sm">Categoria<input className="field mt-1" list={categoryId} required maxLength={100} value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} /><datalist id={categoryId}>{categories.map(c => <option key={c} value={c} />)}</datalist></label></div>
      <label className="block text-sm">Descrição<textarea className="field mt-1 min-h-20" maxLength={2000} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label>
      <div className="flex items-center justify-between border-y py-4"><span className="text-sm">Ativo no catálogo</span><Switch aria-label="Ativo no catálogo" checked={draft.active} onCheckedChange={active => setDraft({ ...draft, active })} /></div>
      <div className="flex items-center justify-between gap-4 border-b pb-4"><span className="flex items-center gap-2 text-sm"><Star className="size-4 text-primary" />Destaque no início do catálogo</span><Switch aria-label="Destaque no início do catálogo" checked={draft.featured} onCheckedChange={featured => setDraft({ ...draft, featured })} /></div>
      <StockField label="Estoque do produto" stock={draft.stock} minStock={draft.minStock} onChange={stock => setDraft({ ...draft, stock })} onMinChange={minStock => setDraft({ ...draft, minStock })} />
      {combos ? <ComboGroupsEditor groups={draft.comboGroups} products={products} onChange={comboGroups => setDraft({ ...draft, comboGroups })} /> : <div className="border-t pt-4"><div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">Sabores e variações</h3><Button type="button" variant="outline" size="sm" onClick={() => setDraft({ ...draft, variations: [...draft.variations, { name: "", active: true, stock: null, minStock: null }] })}><Plus /> Variação</Button></div>
        {draft.variations.length > 0 && <><label className="block text-sm">Tipo<select className="field mt-1" value={draft.optionLabel} onChange={e => setDraft({ ...draft, optionLabel: e.target.value as ProductDraft["optionLabel"] })}><option>Sabor</option><option>Cor</option><option>Variação</option></select></label><div className="my-4 flex items-center justify-between"><span className="text-sm">Permitir “Outro”</span><Switch aria-label="Permitir Outro" checked={draft.allowOther} onCheckedChange={allowOther => setDraft({ ...draft, allowOther })} /></div></>}
        {draft.variations.map((v, index) => <div key={index} className="space-y-3 border-t py-4"><div className="flex items-center gap-3"><input className="field flex-1" aria-label={`Nome da variação ${index + 1}`} maxLength={40} value={v.name} onChange={e => setDraft({ ...draft, variations: draft.variations.map((o, i) => i === index ? { ...o, name: e.target.value } : o) })} placeholder="Nome da variação" required /><Switch aria-label={`Ativar variação ${index + 1}`} checked={v.active} onCheckedChange={active => setDraft({ ...draft, variations: draft.variations.map((o, i) => i === index ? { ...o, active } : o) })} /><Button type="button" variant="ghost" size="icon" aria-label={`Remover variação ${index + 1}`} title="Remover variação" onClick={() => { const variations = draft.variations.filter((_, i) => i !== index); setDraft({ ...draft, variations, allowOther: variations.length ? draft.allowOther : false }); }}><Trash2 /></Button></div><StockField label={`Estoque da variação ${index + 1}`} stock={v.stock} minStock={v.minStock} onChange={stock => setDraft({ ...draft, allowOther: stock !== null ? false : draft.allowOther, variations: draft.variations.map((o, i) => i === index ? { ...o, stock } : o) })} onMinChange={minStock => setDraft({ ...draft, variations: draft.variations.map((o, i) => i === index ? { ...o, minStock } : o) })} /></div>)}
      </div>}
    </fieldset>
    {photos.length > 0 && <div className="space-y-3"><label className="block text-sm">Foto para editar com IA<select className="field mt-1" aria-label="Foto para editar com IA" value={aiPhoto} disabled={aiBusy || busy || uploading} onChange={e => setAiPhoto(Number(e.target.value))}><option value={-1}>Selecione uma foto</option>{photos.map((p,i) => <option key={p.path} value={i}>Foto {i+1}{i === 0 ? " · Capa" : ""}</option>)}</select></label>{photos[aiPhoto]?.preview && <AiPhotoEditor key={photos[aiPhoto]?.path} source={photos[aiPhoto]?.preview ?? ""} productName={draft.name} onApply={applyAiPhoto} onBusy={setAiBusy} />}</div>}
    {(error || message) && <p role="alert" className="text-sm text-destructive">{error || message}</p>}
    <div className="flex justify-end border-t pt-4"><Button type="submit" disabled={busy || uploading || aiBusy}><Save />{busy ? "Salvando…" : combos ? "Salvar combo" : "Salvar produto"}</Button></div>
  </form>;
}
function StockField({ label, stock, minStock, onChange, onMinChange }: { label: string; stock: number | null; minStock?: number | null; onChange: (n: number | null) => void; onMinChange?: (n: number | null) => void }) {
  return <div><div className="flex items-center justify-between gap-3"><span className="text-sm">{label}</span><label className="flex items-center gap-2 text-xs text-muted-foreground"><Switch aria-label={`Controlar ${label.toLowerCase()}`} checked={stock !== null} onCheckedChange={checked => { onChange(checked ? 0 : null); if (!checked) onMinChange?.(null); }} />Controlar quantidade</label></div>{stock !== null && <input aria-label={label} className="field mt-2" type="number" min="0" max="1000000" step="1" required value={stock} onChange={e => onChange(Number(e.target.value))} />}{stock !== null && onMinChange && <label className="mt-3 block text-xs text-muted-foreground">Avisar para repor quando restarem<input aria-label={`Mínimo para alerta de ${label.toLowerCase()}`} className="field mt-1" type="number" min="0" max="1000000" step="1" placeholder="Sem alerta" value={minStock ?? ""} onChange={e => onMinChange(e.target.value === "" ? null : Number(e.target.value))} /></label>}</div>;
}
// The form shows "normal" and "discounted" prices; storage keeps `price` as the charged value
// and `compareAtPrice` as the struck-through one, so checkout/pricing stay unchanged.
function PriceFields({ draft, onChange }: { draft: ProductDraft; onChange: (d: ProductDraft) => void }) {
  const hasDiscount = draft.compareAtPrice !== null;
  const normal = hasDiscount ? draft.compareAtPrice ?? 0 : draft.price;
  const off = discountPercent(draft);
  return <div className="space-y-2">
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm">Preço normal (R$)<input className="field mt-1" type="number" step="0.01" min="0" max="1000000" required value={normal} onChange={e => { const n = Number(e.target.value); onChange(hasDiscount ? { ...draft, compareAtPrice: n } : { ...draft, price: n }); }} /></label>
      <label className="block text-sm">Preço com desconto (R$) <span className="text-xs text-muted-foreground">· opcional</span><input className="field mt-1" type="number" step="0.01" min="0" max="1000000" placeholder="Sem desconto" value={hasDiscount ? draft.price : ""} onChange={e => { const v = e.target.value; onChange(v === "" ? { ...draft, price: normal, compareAtPrice: null } : { ...draft, price: Number(v), compareAtPrice: normal }); }} /></label>
    </div>
    {hasDiscount && <p className="text-xs text-muted-foreground">{off !== null ? <>No catálogo: <span className="line-through">{brl(normal)}</span> por <span className="font-semibold text-foreground">{brl(draft.price)}</span> · <span className="font-semibold text-destructive">-{off}%</span></> : <span className="text-destructive">O preço com desconto precisa ser menor que o preço normal.</span>}</p>}
  </div>;
}
