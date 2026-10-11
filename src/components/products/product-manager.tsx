import { useState, useId, type ReactNode } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, Pause, Play, Search, Save, Upload, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery, useCatalogUpdates } from "@/lib/catalog.query";
import { saveCatalogProduct } from "@/lib/catalog.functions";
import { available, catalogProductSchema, toDraft, type CatalogProduct, type ProductDraft } from "@/lib/catalog";
import { brl } from "@/lib/products";

export function ProductManager() {
  const { data: products } = useSuspenseQuery(catalogQuery);
  useCatalogUpdates();
  const client = useQueryClient();
  const save = useServerFn(saveCatalogProduct);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState<{ draft: ProductDraft; expected: string | null; preview: string } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const categories = [...new Set(products.map(p => p.category))];
  const visible = products.filter(p => (!category || p.category === category) && (!query || `${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase())) && (filter === "all" || (filter === "active" ? available(p) : !available(p))));
  const persist = async (product: ProductDraft, expected: string | null) => {
    setBusy(true); setMessage("");
    try {
      await save({ data: { product, expected } });
      await client.invalidateQueries({ queryKey: catalogQuery.queryKey });
      setEditing(null); setMessage("Produto salvo.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Não foi possível salvar."); }
    finally { setBusy(false); }
  };
  const edit = (p: CatalogProduct) => { setMessage(""); setEditing({ draft: toDraft(p), expected: p.updatedAt, preview: p.image ?? "" }); };
  return <section className="py-7">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex gap-6 text-sm"><span><strong>{products.length}</strong> produtos</span><span className="text-muted-foreground">{products.filter(p => !available(p)).length} indisponíveis</span></div>
      <Button onClick={() => { setMessage(""); setEditing({ draft: { id: `n${crypto.randomUUID().replaceAll("-", "").slice(0,24)}`, name: "", description: "", price: 0, category: "", emoji: "🛍️", image: "", images: [], active: true, stock: null, optionLabel: "Sabor", allowOther: false, variations: [] }, expected: null, preview: "" }); }}><Plus /> Novo produto</Button>
    </div>
    <div className="mb-5 flex flex-wrap gap-3">
      <div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><input className="field pl-10" aria-label="Buscar produtos no painel" placeholder="Buscar produtos" value={query} onChange={e => setQuery(e.target.value)} /></div>
      <select className="field w-auto" aria-label="Filtrar categoria" value={category} onChange={e => setCategory(e.target.value)}><option value="">Todas as categorias</option>{categories.map(c => <option key={c}>{c}</option>)}</select>
      <select className="field w-auto" aria-label="Disponibilidade" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Todos os produtos</option><option value="active">Disponíveis</option><option value="paused">Indisponíveis</option></select>
    </div>
    {!editing && message && <p role="status" className="mb-4 text-sm text-primary">{message}</p>}
    <div className="divide-y border-y">
      {visible.map(p => <div key={p.id} className="flex flex-wrap items-center gap-4 py-4">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded bg-photo">{p.image ? <img src={p.image} alt={p.name} className="size-full object-contain" /> : <Package className="text-photo-foreground" />}</div>
        <div className="min-w-0 flex-1"><h2 className="font-semibold">{p.name}</h2><p className="mt-1 text-xs text-muted-foreground">{p.category} · {p.variations.length ? `${p.variations.length} variações` : "Sem variações"}</p><p className={`mt-1 text-xs ${available(p) ? "text-whatsapp" : "text-destructive"}`}>{!p.active ? "Pausado" : !available(p) ? "Esgotado" : "Disponível"} · {p.stock === null ? "Sem limite de estoque" : `${p.stock} unidades`}</p></div>
        <span className="font-mono text-sm">{brl(p.price)}</span>
        <div className="flex gap-1"><Button variant="outline" size="icon" title="Editar produto" aria-label={`Editar ${p.name}`} onClick={() => edit(p)}><Pencil /></Button><Button variant="ghost" size="icon" disabled={busy} title={p.active ? "Pausar produto" : "Reativar produto"} aria-label={`${p.active ? "Pausar" : "Reativar"} ${p.name}`} onClick={() => persist({ ...toDraft(p), active: !p.active }, p.updatedAt)}>{p.active ? <Pause /> : <Play />}</Button></div>
      </div>)}
      {!visible.length && <p className="py-12 text-center text-muted-foreground">Nenhum produto encontrado.</p>}
    </div>
    <Dialog open={Boolean(editing)} onOpenChange={open => { if (!open && !busy) setEditing(null); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogTitle>{editing?.draft.name || "Novo produto"}</DialogTitle><DialogDescription>S7VEN · Produtos e estoque</DialogDescription>
        {editing && <ProductEditor initial={editing.draft} preview={editing.preview} galleryPreview={products.find(p => p.id === editing.draft.id)?.images ?? []} categories={categories} busy={busy} message={message} onSave={p => persist(p, editing.expected)} />}
      </DialogContent>
    </Dialog>
  </section>;
}

function ProductEditor({ initial, preview, galleryPreview, categories, busy, message, onSave }: { initial: ProductDraft; preview: string; galleryPreview: string[]; categories: string[]; busy: boolean; message: string; onSave: (p: ProductDraft) => void }) {
  const [draft, setDraft] = useState(initial);
  const [photo, setPhoto] = useState(preview);
  const [extraPreviews, setExtraPreviews] = useState(galleryPreview);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const categoryId = useId();
  const upload = async (files: File[]) => {
    if (!files.length) return;
    if (files.length + draft.images.length + (draft.image ? 1 : 0) > 10) { setError("Use até 10 fotos por produto."); return; }
    const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    if (files.some(file => !extensions[file.type] || file.size > 5 * 1024 * 1024)) { setError("Escolha fotos JPG, PNG ou WebP de até 5 MB cada."); return; }
    setUploading(true); setError("");
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
  return <form className="space-y-5" onSubmit={e => { e.preventDefault(); const parsed = catalogProductSchema.safeParse(draft); if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Confira os campos."); return; } setError(""); onSave(parsed.data); }}>
    <fieldset disabled={busy || uploading} className="space-y-5">
      <div><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Fotos do produto</h3><label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary"><Upload className="size-4" />{uploading ? "Enviando…" : "Adicionar fotos"}<input aria-label="Enviar foto do produto" type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => { const files = Array.from(e.target.files ?? []); e.target.value = ""; void upload(files); }} /></label></div><p className="mt-2 text-xs text-muted-foreground">Até 10 fotos · JPG, PNG ou WebP · 5 MB por foto</p><div className="mt-3 flex flex-wrap gap-3">{[...(draft.image ? [{ path: draft.image, preview: photo }] : []), ...draft.images.map((path, i) => ({ path, preview: extraPreviews[i] ?? "" }))].map((item, index) => <div key={item.path} className="w-24"><div className="grid size-24 place-items-center overflow-hidden rounded border bg-photo">{item.preview ? <img src={item.preview} alt={`Foto ${index + 1} do produto`} className="size-full object-contain" /> : <Package className="text-photo-foreground" />}</div><div className="mt-1 flex items-center justify-between"><Button type="button" variant={index === 0 ? "secondary" : "ghost"} size="sm" className="h-7 px-1 text-xs" disabled={index === 0} onClick={() => { const extra = index - 1; const next = draft.images[extra]; if (!next) return; setDraft(d => ({ ...d, image: next, images: d.images.map((path, i) => i === extra ? d.image : path) })); setPhoto(item.preview); setExtraPreviews(prev => prev.map((url, i) => i === extra ? photo : url)); }}>{index === 0 ? "Capa" : "Usar capa"}</Button><Button type="button" variant="ghost" size="icon" className="size-7" title="Remover foto" aria-label={`Remover foto ${index + 1}`} onClick={() => { if (index === 0) { setDraft(d => ({ ...d, image: d.images[0] ?? "", images: d.images.slice(1) })); setPhoto(extraPreviews[0] ?? ""); setExtraPreviews(prev => prev.slice(1)); } else { setDraft(d => ({ ...d, images: d.images.filter((_, i) => i !== index - 1) })); setExtraPreviews(prev => prev.filter((_, i) => i !== index - 1)); } }}><Trash2 /></Button></div></div>)}</div></div>
      <label className="block text-sm">Nome<input className="field mt-1" required maxLength={150} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm">Preço (R$)<input className="field mt-1" type="number" step="0.01" min="0" max="1000000" required value={draft.price} onChange={e => setDraft({ ...draft, price: Number(e.target.value) })} /></label><label className="block text-sm">Categoria<input className="field mt-1" list={categoryId} required maxLength={100} value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} /><datalist id={categoryId}>{categories.map(c => <option key={c} value={c} />)}</datalist></label></div>
      <label className="block text-sm">Descrição<textarea className="field mt-1 min-h-20" maxLength={2000} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label>
      <div className="flex items-center justify-between border-y py-4"><span className="text-sm">Ativo no catálogo</span><Switch aria-label="Ativo no catálogo" checked={draft.active} onCheckedChange={active => setDraft({ ...draft, active })} /></div>
      <StockField label="Estoque do produto" stock={draft.stock} onChange={stock => setDraft({ ...draft, stock })} />
      <div className="border-t pt-4"><div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">Sabores e variações</h3><Button type="button" variant="outline" size="sm" onClick={() => setDraft({ ...draft, variations: [...draft.variations, { name: "", active: true, stock: null }] })}><Plus /> Variação</Button></div>
        {draft.variations.length > 0 && <><label className="block text-sm">Tipo<select className="field mt-1" value={draft.optionLabel} onChange={e => setDraft({ ...draft, optionLabel: e.target.value as ProductDraft["optionLabel"] })}><option>Sabor</option><option>Cor</option><option>Variação</option></select></label><div className="my-4 flex items-center justify-between"><span className="text-sm">Permitir “Outro”</span><Switch aria-label="Permitir Outro" checked={draft.allowOther} onCheckedChange={allowOther => setDraft({ ...draft, allowOther })} /></div></>}
        {draft.variations.map((v, index) => <div key={index} className="space-y-3 border-t py-4"><div className="flex items-center gap-3"><input className="field flex-1" aria-label={`Nome da variação ${index + 1}`} maxLength={40} value={v.name} onChange={e => setDraft({ ...draft, variations: draft.variations.map((o, i) => i === index ? { ...o, name: e.target.value } : o) })} placeholder="Nome da variação" required /><Switch aria-label={`Ativar variação ${index + 1}`} checked={v.active} onCheckedChange={active => setDraft({ ...draft, variations: draft.variations.map((o, i) => i === index ? { ...o, active } : o) })} /><Button type="button" variant="ghost" size="icon" aria-label={`Remover variação ${index + 1}`} title="Remover variação" onClick={() => { const variations = draft.variations.filter((_, i) => i !== index); setDraft({ ...draft, variations, allowOther: variations.length ? draft.allowOther : false }); }}><Trash2 /></Button></div><StockField label={`Estoque da variação ${index + 1}`} stock={v.stock} onChange={stock => setDraft({ ...draft, allowOther: stock !== null ? false : draft.allowOther, variations: draft.variations.map((o, i) => i === index ? { ...o, stock } : o) })} /></div>)}
      </div>
    </fieldset>
    {(error || message) && <p role="alert" className="text-sm text-destructive">{error || message}</p>}
    <div className="flex justify-end border-t pt-4"><Button type="submit" disabled={busy || uploading}><Save />{busy ? "Salvando…" : "Salvar produto"}</Button></div>
  </form>;
}
function StockField({ label, stock, onChange }: { label: string; stock: number | null; onChange: (n: number | null) => void }) {
  return <div><div className="flex items-center justify-between gap-3"><span className="text-sm">{label}</span><label className="flex items-center gap-2 text-xs text-muted-foreground"><Switch aria-label={`Controlar ${label.toLowerCase()}`} checked={stock !== null} onCheckedChange={checked => onChange(checked ? 0 : null)} />Controlar quantidade</label></div>{stock !== null && <input aria-label={label} className="field mt-2" type="number" min="0" max="1000000" step="1" required value={stock} onChange={e => onChange(Number(e.target.value))} />}</div>;
}