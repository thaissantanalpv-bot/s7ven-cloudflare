import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  PRODUCTS,
  CATEGORIES,
  PAYMENT_METHODS,
  WHATSAPP_NUMBER,
  STORE_NAME,
  brl,
} from "@/lib/products";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${STORE_NAME} — Catálogo Digital` },
      { name: "description", content: "Veja nossos produtos, monte seu carrinho e faça o pedido pelo WhatsApp." },
      { property: "og:title", content: `${STORE_NAME} — Catálogo Digital` },
      { property: "og:description", content: "Monte seu pedido e envie direto pelo WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Catalog,
});

type Cart = Record<string, number>;
const KEY = "catalogo-carrinho";

const orderSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(80),
  address: z.string().trim().min(8, "Informe o endereço completo").max(300),
  payment: z.string().min(1, "Escolha a forma de pagamento"),
  change: z.string().max(30).optional(),
  notes: z.string().max(300).optional(),
});

function Catalog() {
  const [cart, setCart] = useState<Cart>({});
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("Todos");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", payment: "", change: "", notes: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.cart) setCart(saved.cart);
        if (saved.form) setForm((f) => ({ ...f, ...saved.form }));
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify({ cart, form }));
  }, [cart, form, loaded]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter(
      (p) =>
        (cat === "Todos" || p.category === cat) &&
        (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)),
    );
  }, [query, cat]);

  const items = PRODUCTS.filter((p) => cart[p.id]).map((p) => ({ ...p, qty: cart[p.id] ?? 0 }));
  const count = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);

  const change = (id: string, d: number) =>
    setCart((c) => {
      const n = Math.max(0, (c[id] || 0) + d);
      const next = { ...c };
      if (n === 0) delete next[id];
      else next[id] = n;
      return next;
    });

  const send = () => {
    setError("");
    if (!items.length) return setError("Seu carrinho está vazio.");
    const r = orderSchema.safeParse(form);
    if (!r.success) return setError(r.error.issues[0].message);
    const d = r.data;
    const lines = [
      `*Novo pedido — ${STORE_NAME}*`,
      "",
      ...items.map((i) => `${i.qty}x ${i.name} — ${brl(i.qty * i.price)}`),
      "",
      `*Total: ${brl(total)}*`,
      "",
      `*Nome:* ${d.name}`,
      `*Endereço:* ${d.address}`,
      `*Pagamento:* ${d.payment}${d.payment === "Dinheiro" && d.change ? ` (troco para ${d.change})` : ""}`,
      d.notes ? `*Obs.:* ${d.notes}` : "",
    ].filter((l, idx, arr) => l !== "" || arr[idx - 1] !== "");
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  };

  return (
    <div className="min-h-screen pb-28 lg:pb-10">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-semibold text-foreground">{STORE_NAME}</h1>
            <p className="text-xs text-muted-foreground">Catálogo digital · pedido pelo WhatsApp</p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="relative shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            🛒 Carrinho
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-foreground">
                {count}
              </span>
            )}
          </button>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔎 Buscar produto..."
            className="w-full rounded-xl border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition ${
                  cat === c ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 && (
          <p className="col-span-full py-16 text-center text-muted-foreground">Nenhum produto encontrado.</p>
        )}
        {filtered.map((p) => (
          <article key={p.id} className="flex gap-4 rounded-2xl border bg-card p-4 shadow-soft sm:flex-col">
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-xl bg-secondary text-5xl sm:h-36 sm:w-full sm:text-6xl">
              {p.emoji}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{p.category}</span>
              <h2 className="font-display text-lg font-semibold leading-tight">{p.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
              <div className="mt-auto flex items-center justify-between pt-3">
                <span className="font-semibold text-primary">{brl(p.price)}</span>
                {cart[p.id] ? (
                  <Qty qty={cart[p.id] ?? 0} onMinus={() => change(p.id, -1)} onPlus={() => change(p.id, 1)} />
                ) : (
                  <button
                    onClick={() => change(p.id, 1)}
                    className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
                  >
                    Adicionar
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </main>

      {count > 0 && !open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed inset-x-4 bottom-4 z-20 flex items-center justify-between rounded-2xl bg-primary px-5 py-4 text-primary-foreground shadow-soft lg:hidden"
        >
          <span>{count} {count === 1 ? "item" : "itens"} · Ver carrinho</span>
          <span className="font-semibold">{brl(total)}</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-30 flex justify-end bg-foreground/40" onClick={() => setOpen(false)}>
          <aside
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-md flex-col bg-background"
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="font-display text-xl font-semibold">Seu pedido</h2>
              <button onClick={() => setOpen(false)} className="text-2xl text-muted-foreground" aria-label="Fechar">×</button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <p className="py-10 text-center text-muted-foreground">Seu carrinho está vazio.</p>
              ) : (
                <ul className="space-y-3">
                  {items.map((i) => (
                    <li key={i.id} className="flex items-center gap-3">
                      <span className="text-3xl">{i.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{i.name}</p>
                        <p className="text-xs text-muted-foreground">{brl(i.price)} · subtotal {brl(i.price * i.qty)}</p>
                      </div>
                      <Qty qty={i.qty} onMinus={() => change(i.id, -1)} onPlus={() => change(i.id, 1)} />
                    </li>
                  ))}
                </ul>
              )}

              <div className="space-y-3 border-t pt-4">
                <Field label="Seu nome">
                  <input className="field" value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <Field label="📍 Endereço de entrega">
                  <textarea className="field" rows={3} maxLength={300} placeholder="Rua, número, bairro, cidade e referência" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </Field>
                <Field label="💳 Forma de pagamento">
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setForm({ ...form, payment: m })}
                        className={`rounded-xl border px-3 py-2 text-sm ${form.payment === m ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </Field>
                {form.payment === "Dinheiro" && (
                  <Field label="Troco para quanto?">
                    <input className="field" maxLength={30} placeholder="Ex: R$ 100" value={form.change} onChange={(e) => setForm({ ...form, change: e.target.value })} />
                  </Field>
                )}
                <Field label="Observações (opcional)">
                  <input className="field" maxLength={300} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </Field>
              </div>
            </div>
            <div className="space-y-3 border-t px-5 py-4">
              <div className="flex justify-between text-lg">
                <span>Total</span>
                <span className="font-display font-semibold">{brl(total)}</span>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button onClick={send} className="w-full rounded-2xl bg-whatsapp py-4 font-semibold text-whatsapp-foreground">
                📲 Enviar pedido pelo WhatsApp
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Qty({ qty, onMinus, onPlus }: { qty: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <div className="flex shrink-0 items-center rounded-full border bg-card">
      <button onClick={onMinus} className="h-8 w-8 text-lg" aria-label="Diminuir">−</button>
      <span className="w-6 text-center text-sm font-semibold">{qty}</span>
      <button onClick={onPlus} className="h-8 w-8 text-lg" aria-label="Aumentar">+</button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
