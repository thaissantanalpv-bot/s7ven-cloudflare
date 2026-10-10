import { useRef, useState } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Minus, Trash2, Search, Banknote, CreditCard, QrCode, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { catalogQuery, useCatalogUpdates } from "@/lib/catalog.query";
import { available, type CatalogProduct } from "@/lib/catalog";
import { brl } from "@/lib/products";
import { COUNTER_PAYMENTS, cashChange, type CounterSaleInput } from "@/lib/pos";
import { submitCounterSale } from "@/lib/pos.functions";

type Line = { productId: string; option: string; qty: number; expectedPrice: number };
export function PointOfSale() {
  const { data: products } = useSuspenseQuery(catalogQuery);
  useCatalogUpdates();
  const client = useQueryClient();
  const save = useServerFn(submitCounterSale);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [lines, setLines] = useState<Line[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [other, setOther] = useState("");
  const [payment, setPayment] = useState<CounterSaleInput["payment"]>("Dinheiro");
  const [received, setReceived] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const request = useRef<{ signature: string; id: string } | null>(null);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{ number: number; total: number; cash_received: number | null; cash_change: number | null } | null>(null);
  const total = lines.reduce((s, l) => s + Math.round(l.expectedPrice * 100) * l.qty, 0) / 100;
  const cash = received === "" ? null : Number(received.replace(",", "."));
  const change = cash === null || !Number.isFinite(cash) ? null : cashChange(total, cash);
  const chosen = products.find(p => p.id === selected);
  const visible = products.filter(p => (category === "all" || p.category === category) && `${p.name} ${p.description}`.toLowerCase().includes(search.toLowerCase()));
  const add = (p: CatalogProduct, option = "") => {
    if (busyRef.current) return;
    const existing = lines.find(l => l.productId === p.id && l.option === option);
    const count = (existing?.qty ?? 0) + 1;
    const allQty = lines.filter(l => l.productId === p.id).reduce((s, l) => s + l.qty, 0) + 1;
    if (count > 99 || !available(p, option, count) || (p.stock !== null && allQty > p.stock)) { setError("Quantidade indisponível em estoque."); return; }
    setLines(prev => existing ? prev.map(l => l === existing ? { ...l, qty: count } : l) : [...prev, { productId: p.id, option, qty: 1, expectedPrice: p.price }]);
    setError(""); setConfirmed(false); setSelected(null); setOther("");
  };
  const invalid = lines.some(l => { const p = products.find(p => p.id === l.productId); return !p || p.price !== l.expectedPrice || !available(p, l.option, l.qty) || (p.stock !== null && lines.filter(i => i.productId === p.id).reduce((s, i) => s + i.qty, 0) > p.stock); });
  const submit = async () => {
    if (busyRef.current || !lines.length || invalid || !confirmed) return;
    busyRef.current = true; setBusy(true); setError("");
    const input = { items: lines, payment, cashReceived: payment === "Dinheiro" ? cash : null, name, notes };
    const signature = JSON.stringify(input);
    if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
    const id = request.current?.id;
    if (!id) { busyRef.current = false; setBusy(false); return; }
    try {
      const saved = await save({ data: { ...input, requestId: id } });
      setReceipt(saved); setLines([]); setReceived(""); setName(""); setNotes(""); setConfirmed(false); request.current = null;
      void client.invalidateQueries({ queryKey: catalogQuery.queryKey });
      void client.invalidateQueries({ queryKey: ["store-orders"] });
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível concluir a venda."); void client.invalidateQueries({ queryKey: catalogQuery.queryKey }); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return <section className="grid gap-8 py-7 lg:grid-cols-[minmax(0,1fr)_360px]">
    <div className="min-w-0"><div className="flex flex-wrap gap-3"><div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><input className="field pl-10" aria-label="Buscar produto no caixa" placeholder="Buscar produto…" value={search} onChange={e => setSearch(e.target.value)} /></div><select className="field w-auto max-w-full" aria-label="Categoria no caixa" value={category} onChange={e => setCategory(e.target.value)}><option value="all">Todas as categorias</option>{[...new Set(products.map(p => p.category))].sort().map(c => <option key={c}>{c}</option>)}</select></div>
    <p className="my-4 text-xs text-muted-foreground">{visible.length} produtos</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{visible.map(p => <Button key={p.id} variant="outline" disabled={busy || !available(p)} aria-label={`Selecionar ${p.name}`} onClick={() => { if (p.variations.length) { setSelected(p.id); setOther(""); } else add(p); }} className="h-auto min-w-0 flex-col items-start gap-2 overflow-hidden p-3 text-left whitespace-normal">{p.image ? <img src={p.image} alt={p.name} className="aspect-[4/3] w-full rounded object-contain bg-muted" loading="lazy" /> : <span className="flex aspect-[4/3] w-full items-center justify-center bg-muted text-3xl">{p.emoji}</span>}<span className="line-clamp-2 min-h-10 w-full break-words text-sm">{p.name}</span><span className="text-primary">{brl(p.price)}</span><span className="text-xs text-muted-foreground">{!available(p) ? "Indisponível" : p.stock !== null ? `${p.stock} em estoque` : p.variations.length ? "Escolher variação" : "Adicionar"}</span></Button>)}</div>{!visible.length && <p className="py-10 text-muted-foreground">Nenhum produto encontrado.</p>}</div>
    <aside className="min-w-0 border-t pt-5 lg:sticky lg:top-5 lg:self-start lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0"><div className="flex items-center justify-between"><h2 className="text-xl font-display font-semibold">Venda de balcão</h2><Button variant="ghost" size="icon" title="Limpar venda" aria-label="Limpar venda" disabled={busy || !lines.length} onClick={() => { if (window.confirm("Limpar todos os itens desta venda?")) { setLines([]); setConfirmed(false); setError(""); } }}><Trash2 /></Button></div>
      <div className="my-4 max-h-80 overflow-y-auto">{!lines.length ? <p className="py-8 text-sm text-muted-foreground">Nenhum item na venda.</p> : lines.map((l, index) => { const p = products.find(p => p.id === l.productId); return <div key={`${l.productId}:${l.option}`} className="border-b py-3"><p className="break-words text-sm font-medium">{p?.name ?? l.productId}</p>{l.option && <p className="text-xs text-muted-foreground">{p?.optionLabel}: {l.option}</p>}<div className="mt-2 flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Button variant="outline" size="icon" disabled={busy} aria-label={`Diminuir ${p?.name} ${l.option}`} title="Diminuir quantidade" onClick={() => { setLines(prev => prev.flatMap((i, n) => n !== index ? [i] : i.qty > 1 ? [{ ...i, qty: i.qty - 1 }] : [])); setConfirmed(false); }}><Minus /></Button><span className="w-6 text-center">{l.qty}</span><Button variant="outline" size="icon" disabled={busy || !p} aria-label={`Aumentar ${p?.name} ${l.option}`} title="Aumentar quantidade" onClick={() => { if (p) add(p, l.option); }}><Plus /></Button></div><strong className="text-sm">{brl(l.expectedPrice * l.qty)}</strong></div>{p && p.price !== l.expectedPrice && <Button variant="link" className="px-0 text-destructive" disabled={busy} onClick={() => { setLines(prev => prev.map((i, n) => n === index ? { ...i, expectedPrice: p.price } : i)); setConfirmed(false); }}>Atualizar preço para {brl(p.price)}</Button>}</div>; })}</div>
      <fieldset disabled={busy} className="space-y-4"><label className="block text-sm">Cliente (opcional)<input className="field mt-2" maxLength={80} value={name} onChange={e => { setName(e.target.value); setConfirmed(false); }} /></label><div><p className="mb-2 text-sm">Pagamento</p><div className="grid grid-cols-2 gap-2">{COUNTER_PAYMENTS.map((method, i) => <Button key={method} variant={payment === method ? "default" : "outline"} aria-pressed={payment === method} className="h-11 text-xs" onClick={() => { setPayment(method); setConfirmed(false); }}>{i === 0 ? <Banknote /> : i === 3 ? <QrCode /> : <CreditCard />}{method}</Button>)}</div></div>
      {payment === "Dinheiro" && <><label className="block text-sm">Valor recebido (R$)<input className="field mt-2" aria-label="Valor recebido (R$)" inputMode="decimal" value={received} onChange={e => { setReceived(e.target.value); setConfirmed(false); }} /></label><Button variant="outline" onClick={() => { setReceived(total.toFixed(2)); setConfirmed(false); }}>Valor exato</Button><p className={change !== null && change < 0 ? "text-destructive" : "text-muted-foreground"}>{change === null ? "Troco: —" : change < 0 ? `Faltam ${brl(-change)}` : `Troco: ${brl(change)}`}</p></>}
      <label className="block text-sm">Observações (opcional)<input className="field mt-2" maxLength={300} value={notes} onChange={e => { setNotes(e.target.value); setConfirmed(false); }} /></label><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="size-4 accent-primary" />{payment === "Dinheiro" ? "Dinheiro recebido" : payment === "Pix físico" ? "Pix recebido e conferido" : "Pagamento aprovado na maquininha"}</label></fieldset>
      <div className="mt-6 flex justify-between border-t pt-5 text-xl font-semibold"><span>Total</span><span className="text-primary">{brl(total)}</span></div>{invalid && <p role="alert" className="mt-3 text-sm text-destructive">Preço ou estoque alterado. Atualize o preço ou ajuste os itens.</p>}{error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}<Button className="mt-5 h-12 w-full" disabled={busy || !lines.length || invalid || !confirmed || (payment === "Dinheiro" && (change === null || change < 0))} onClick={submit}><CheckCircle2 />{busy ? "Registrando…" : "Concluir venda"}</Button>
    </aside>
    <Dialog open={Boolean(chosen)} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent><DialogTitle>{chosen?.name}</DialogTitle><DialogDescription>Selecionar {chosen?.optionLabel?.toLowerCase()}</DialogDescription><div className="flex flex-wrap gap-2">{chosen?.variations.map(v => <Button key={v.name} variant="outline" disabled={!available(chosen, v.name)} onClick={() => add(chosen, v.name)}>{v.name}</Button>)}</div>{chosen?.allowOther && <div className="flex gap-2"><input className="field min-w-0" aria-label="Outra variação" placeholder="Outro" maxLength={40} value={other} onChange={e => setOther(e.target.value)} /><Button disabled={!other.trim()} onClick={() => add(chosen, other.trim())}><Plus />Adicionar</Button></div>}</DialogContent></Dialog>
    <Dialog open={Boolean(receipt)} onOpenChange={open => { if (!open) setReceipt(null); }}><DialogContent><CheckCircle2 className="size-9 text-whatsapp" /><DialogTitle>Venda #{receipt?.number} concluída</DialogTitle><DialogDescription>Balcão · S7VEN Lounge e Tabacaria</DialogDescription><p className="text-3xl font-display font-semibold">{brl(receipt?.total ?? 0)}</p>{receipt?.cash_received != null && <><p>Recebido: {brl(receipt.cash_received)}</p><p className="text-xl text-primary">Troco: {brl(receipt.cash_change ?? 0)}</p></>}<Button onClick={() => setReceipt(null)}>Nova venda</Button></DialogContent></Dialog>
  </section>;
}