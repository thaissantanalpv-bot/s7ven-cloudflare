import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock,
  LogOut,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Truck,
  Home,
  ShoppingBag,
  Package,
  Receipt,
  Menu,
  Layers,
  History,
  ChevronRight,
  MessageCircle,
  Activity,
  Users,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AdminAppAccess } from "@/components/admin-app-access";
import { supabase } from "@/integrations/supabase/client";
import { storeSettingsQuery } from "@/lib/store-settings.query";
import { checkStoreAdmin, saveStoreSettings } from "@/lib/store-settings.functions";
import { OrderBoard } from "@/components/orders/order-board";
import { ProductManager } from "@/components/products/product-manager";
import { DistanceTiersEditor } from "@/components/distance-tiers-editor";
import { PointOfSale } from "@/components/pos/point-of-sale";
import { SalesHistory } from "@/components/pos/sales-history";
import { CatalogAnalytics } from "@/components/catalog-analytics";
import { AbandonedCartNotice } from "@/components/abandoned-cart-notice";
import { AnalyticsAssistant } from "@/components/analytics-assistant";
import { adminCatalogQuery } from "@/lib/catalog.query";
import { getCatalogFunnel } from "@/lib/catalog-analytics.functions";
import { DAYS, settingsSchema, type StoreSettings } from "@/lib/store-settings";

export const Route = createFileRoute("/_authenticated/painel")({ staticData: { sitemap: false },
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(storeSettingsQuery), context.queryClient.ensureQueryData(adminCatalogQuery)]),
  head: () => ({
    meta: [
      { title: "Caixa, vendas e operação — S7VEN" },
      {
        name: "description",
        content: "Frente de caixa, histórico de vendas, produtos, estoque e pedidos da S7VEN Lounge e Tabacaria.",
      },
      { property: "og:title", content: "Caixa e operação da loja — S7VEN" },
      {
        property: "og:description",
        content: "Vendas de balcão e catálogo, estoque, pedidos, taxas e horários da S7VEN.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});
function Admin() {
  const [view, setView] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const check = useServerFn(checkStoreAdmin);
  const permission = useQuery({ queryKey: ["store-admin"], queryFn: () => check(), retry: false });
  const { data: settings } = useSuspenseQuery(storeSettingsQuery);
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link to="/" className="font-display text-2xl font-bold">
            S<span className="text-primary">7</span>VEN.
          </Link>
          <div className="flex gap-2">
            <AdminAppAccess />
            <Button asChild variant="ghost">
              <Link to="/">
                <ArrowLeft />
                <span className="hidden sm:inline">Catálogo</span>
              </Link>
            </Button>
            <Button variant="outline" onClick={() => supabase.auth.signOut()}>
              <LogOut />
              Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-7 pb-28 sm:px-5 sm:py-10 sm:pb-28 md:pb-10">
        <p className="mb-2 text-xs uppercase text-primary">Área da loja</p>
        <h1 className="font-display text-3xl font-semibold">
          {view === "home" ? "Minha loja" : view === "assistant" ? "Assistente da loja" : view === "analytics" ? "Movimento do catálogo" : view === "combos" ? "Combos" : view === "pos" ? "Frente de caixa" : view === "history" ? "Histórico de vendas" : view === "orders" ? "Pedidos" : view === "products" ? "Produtos e estoque" : "Configurações"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">S7VEN Lounge e Tabacaria.</p>
        {permission.isPending ? (
          <p className="py-12 text-muted-foreground">Conferindo seu acesso…</p>
        ) : permission.error ? (
          <p role="alert" className="py-12 text-destructive">
            Não foi possível conferir o acesso.{" "}
            <Button variant="link" onClick={() => permission.refetch()}>
              Tentar novamente
            </Button>
          </p>
        ) : !permission.data ? (
          <div className="mt-12 border-t py-8">
            <ShieldCheck className="mb-4 text-primary" />
            <h2 className="text-xl font-semibold">Acesso não autorizado</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Esta conta não tem permissão para alterar a loja. Entre com o e-mail autorizado.
            </p>
          </div>
        ) : (
          <>
            <nav className="mt-7 hidden flex-wrap gap-2 border-b pb-3 md:flex" aria-label="Painel da loja">
              <Button variant={view === "analytics" ? "default" : "ghost"} onClick={() => setView("analytics")}>Movimento do catálogo</Button>
              <Button variant={view === "assistant" ? "default" : "ghost"} onClick={() => setView("assistant")}><MessageCircle />Assistente</Button>
              <Button variant={view === "pos" ? "default" : "ghost"} onClick={() => setView("pos")}>Caixa / Balcão</Button>
              <Button variant={view === "history" ? "default" : "ghost"} onClick={() => setView("history")}>Histórico de vendas</Button>
              <Button
                variant={view === "orders" ? "default" : "ghost"}
                onClick={() => setView("orders")}
              >
                Pedidos
              </Button>
              <Button variant={view === "products" ? "default" : "ghost"} onClick={() => setView("products")}>Produtos e estoque</Button>
              <Button variant={view === "combos" ? "default" : "ghost"} onClick={() => setView("combos")}>Combos</Button>
              <Button
                variant={view === "settings" ? "default" : "ghost"}
                onClick={() => setView("settings")}
              >
                Taxas e horários
              </Button>
            </nav>
            {view === "home" ? (
              <>
                <div className="md:hidden"><AdminHome onOpen={setView} /></div>
                <div className="hidden md:block"><CatalogAnalytics /></div>
              </>
            ) : view === "assistant" ? <AnalyticsAssistant /> : view === "analytics" ? <CatalogAnalytics /> : view === "combos" ? <ProductManager key="combos" combos /> : view === "pos" ? <PointOfSale /> : view === "history" ? <SalesHistory /> : view === "orders" ? <OrderBoard /> : view === "products" ? <ProductManager key="products" /> : <SettingsEditor initial={settings} />}
            <nav className="admin-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background md:hidden" aria-label="Navegação do aplicativo">
              {[
                { id: "home", label: "Início", Icon: Home },
                { id: "orders", label: "Pedidos", Icon: ShoppingBag },
                { id: "pos", label: "Caixa", Icon: Receipt },
                { id: "products", label: "Produtos", Icon: Package },
              ].map(({ id, label, Icon }) => <Button key={id} variant="ghost" aria-current={view === id ? "page" : undefined} className={`h-16 min-w-0 flex-col gap-1 rounded-none px-1 text-[11px] ${view === id ? "text-primary" : "text-muted-foreground"}`} onClick={() => setView(id)}><Icon className="size-5" />{label}</Button>)}
              <Button variant="ghost" className={`h-16 flex-col gap-1 rounded-none px-1 text-[11px] ${["assistant", "combos", "history", "settings"].includes(view) ? "text-primary" : "text-muted-foreground"}`} onClick={() => setMenuOpen(true)}><Menu className="size-5" />Menu</Button>
            </nav>
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetContent side="bottom" className="mx-auto max-w-lg pb-8">
                <SheetTitle>Minha loja</SheetTitle>
                <SheetDescription className="mt-2">S7VEN Lounge e Tabacaria</SheetDescription>
                <div className="mt-6 grid gap-2">
                  {[{ id: "assistant", label: "Assistente", Icon: MessageCircle }, { id: "combos", label: "Combos", Icon: Layers }, { id: "history", label: "Histórico de vendas", Icon: History }, { id: "settings", label: "Taxas e horários", Icon: Clock }].map(({ id, label, Icon }) => <Button key={id} variant="ghost" className="h-14 justify-start border-b" onClick={() => { setView(id); setMenuOpen(false); }}><Icon className="text-primary" />{label}<ChevronRight className="ml-auto" /></Button>)}
                </div>
              </SheetContent>
            </Sheet>
          </>
        )}
      </main>
    </div>
  );
}
function AdminHome({ onOpen }: { onOpen: (view: string) => void }) {
  const getStats = useServerFn(getCatalogFunnel);
  const stats = useQuery({ queryKey: ["admin-catalog-funnel", "today"], queryFn: () => getStats({ data: "today" }), refetchInterval: 5000, retry: 1 });
  const data = stats.data;
  const cards = [
    { label: "Visitas", hint: "pessoas que abriram o catálogo hoje", value: data?.visitors, Icon: Users, target: "analytics" },
    { label: "Carrinhos", hint: "clientes montando pedido agora", value: data?.pending, Icon: ShoppingCart, target: "analytics" },
    { label: "Pedidos", hint: "pedidos enviados hoje", value: data?.completed, Icon: ShoppingBag, target: "orders" },
  ];
  return (
    <section className="py-6" aria-label="Resumo da loja">
      <p className="mb-4 flex items-center gap-2 text-sm text-primary"><Activity className="size-4" />{data ? `${data.online} online agora` : "Conectando…"}</p>
      {!stats.error && data && <AbandonedCartNotice count={data.abandoned} onOpen={() => onOpen("analytics")} />}
      <div className="grid gap-4">
        {cards.map(({ label, hint, value, Icon, target }) => (
          <button key={label} type="button" onClick={() => onOpen(target)} className="flex min-h-28 items-center gap-5 rounded-2xl border bg-card p-6 text-left active:scale-[0.98]">
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary/10"><Icon className="size-8 text-primary" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-4xl font-semibold">{value === undefined ? "—" : value.toLocaleString("pt-BR")}</span>
              <span className="mt-1 block text-base font-medium">{label}</span>
              <span className="block text-xs text-muted-foreground">{hint}</span>
            </span>
            <ChevronRight className="size-6 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
      {stats.error && <p role="alert" className="mt-4 text-sm text-destructive">Não foi possível atualizar os números. <Button variant="link" onClick={() => stats.refetch()}>Tentar novamente</Button></p>}
    </section>
  );
}
function SettingsEditor({ initial }: { initial: StoreSettings }) {
  const [draft, setDraft] = useState<StoreSettings>(() => structuredClone(initial));
  const [tab, setTab] = useState("delivery");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const save = useServerFn(saveStoreSettings);
  const client = useQueryClient();
  const dirty = JSON.stringify(initial) !== JSON.stringify(draft);
  const update = (next: StoreSettings) => {
    setDraft(next);
    setMessage("");
    setSuccess(false);
  };
  const submit = async () => {
    const parsed = settingsSchema.safeParse(draft);
    if (!parsed.success) {
      setSuccess(false);
      setMessage(parsed.error.issues[0]?.message ?? "Confira as configurações.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await save({ data: parsed.data });
      client.setQueryData(storeSettingsQuery.queryKey, parsed.data);
      setSuccess(true);
      setMessage("Configurações salvas.");
    } catch (error) {
      setSuccess(false);
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="mt-8 flex gap-1 border-b" role="tablist">
        <Button
          role="tab"
          aria-selected={tab === "delivery"}
          variant="ghost"
          onClick={() => setTab("delivery")}
          className={
            tab === "delivery"
              ? "rounded-none border-b-2 border-primary text-primary"
              : "rounded-none"
          }
        >
          <Truck />
          Taxas de entrega
        </Button>
        <Button
          role="tab"
          aria-selected={tab === "hours"}
          variant="ghost"
          onClick={() => setTab("hours")}
          className={
            tab === "hours" ? "rounded-none border-b-2 border-primary text-primary" : "rounded-none"
          }
        >
          <Clock />
          Horários
        </Button>
      </div>
      {tab === "delivery" ? (
        <section className="py-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Entrega e retirada</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {draft.delivery_enabled
                  ? "Taxas ativas no catálogo."
                  : "Entrega a combinar com a loja."}
              </p>
            </div>
            <Switch
              aria-label="Ativar taxas de entrega"
              checked={draft.delivery_enabled}
              onCheckedChange={(value) => update({ ...draft, delivery_enabled: value })}
            />
          </div>
          <label className="mt-6 block text-sm">
            Endereço para retirada
            <input className="field mt-2" value={draft.pickup_address} maxLength={300} onChange={(e) => update({ ...draft, pickup_address: e.target.value })} />
          </label>
          <label className="mt-5 block text-sm">
            Tipo de taxa
            <select className="field mt-2" value={draft.delivery_distance_enabled ? "distance" : draft.fixed_delivery_fee === null ? "region" : "fixed"} onChange={(e) => update({ ...draft, delivery_distance_enabled: e.target.value === "distance", fixed_delivery_fee: e.target.value === "fixed" ? draft.fixed_delivery_fee ?? 0 : e.target.value === "region" ? null : draft.fixed_delivery_fee })}>
              <option value="fixed">Taxa fixa</option>
              <option value="region">Por região</option>
              <option value="distance">Por quilometragem</option>
            </select>
          </label>
          {draft.delivery_distance_enabled && <DistanceTiersEditor settings={draft} onChange={update} />}
          {!draft.delivery_distance_enabled && draft.fixed_delivery_fee !== null && <label className="mt-5 block text-sm">
            Taxa fixa (R$)
            <input className="field mt-2" type="number" min="0" max="1000" step="0.01" value={draft.fixed_delivery_fee} onChange={(e) => update({ ...draft, fixed_delivery_fee: Number(e.target.value) })} />
          </label>}
          {!draft.delivery_distance_enabled && draft.fixed_delivery_fee === null && <>
          <div className="mt-7">
            {draft.delivery_zones.length === 0 && (
              <p className="border-y py-10 text-sm text-muted-foreground">
                Nenhuma região cadastrada.
              </p>
            )}
            {draft.delivery_zones.map((zone, index) => (
              <div
                key={zone.id}
                className="grid grid-cols-[minmax(0,1fr)_100px_36px] items-end gap-3 border-b py-4 sm:grid-cols-[minmax(0,1fr)_160px_36px]"
              >
                <label className="text-xs text-muted-foreground">
                  Bairro ou região
                  <input
                    aria-label={`Região ${index + 1}`}
                    className="field mt-2"
                    value={zone.name}
                    maxLength={80}
                    onChange={(e) =>
                      update({
                        ...draft,
                        delivery_zones: draft.delivery_zones.map((z) =>
                          z.id === zone.id ? { ...z, name: e.target.value } : z,
                        ),
                      })
                    }
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  Taxa (R$)
                  <input
                    aria-label={`Taxa ${index + 1}`}
                    className="field mt-2"
                    type="number"
                    min="0"
                    max="1000"
                    step="0.01"
                    value={zone.fee}
                    onChange={(e) =>
                      update({
                        ...draft,
                        delivery_zones: draft.delivery_zones.map((z) =>
                          z.id === zone.id ? { ...z, fee: Number(e.target.value) } : z,
                        ),
                      })
                    }
                  />
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Excluir região ${index + 1}`}
                  title="Excluir região"
                  onClick={() =>
                    update({
                      ...draft,
                      delivery_zones: draft.delivery_zones.filter((z) => z.id !== zone.id),
                    })
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            className="mt-5"
            onClick={() =>
              update({
                ...draft,
                delivery_zones: [
                  ...draft.delivery_zones,
                  { id: crypto.randomUUID(), name: "", fee: 0 },
                ],
              })
            }
          >
            <Plus />
            Adicionar região
          </Button>
          </>}
        </section>
      ) : (
        <section className="py-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Horários de atendimento</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Horário de Brasília · fechamento no dia seguinte quando anterior à abertura.
              </p>
            </div>
            <Switch
              aria-label="Ativar horários de atendimento"
              checked={draft.hours_enabled}
              onCheckedChange={(value) => update({ ...draft, hours_enabled: value })}
            />
          </div>
          <div className="mt-7">
            {draft.opening_hours.map((h) => (
              <div
                key={h.day}
                className="flex flex-wrap items-center justify-between gap-3 border-b py-4"
              >
                <div className="flex min-w-44 items-center gap-3">
                  <Switch
                    aria-label={`Atender ${DAYS[h.day]}`}
                    checked={h.enabled}
                    onCheckedChange={(value) =>
                      update({
                        ...draft,
                        opening_hours: draft.opening_hours.map((row) =>
                          row.day === h.day ? { ...row, enabled: value } : row,
                        ),
                      })
                    }
                  />
                  <span className="text-sm">{DAYS[h.day]}</span>
                </div>
                <div className="flex items-center gap-3">
                  {h.enabled ? (
                    <>
                      <input
                        aria-label={`Abertura ${DAYS[h.day]}`}
                        type="time"
                        className="field w-32"
                        value={h.open}
                        onChange={(e) =>
                          update({
                            ...draft,
                            opening_hours: draft.opening_hours.map((row) =>
                              row.day === h.day ? { ...row, open: e.target.value } : row,
                            ),
                          })
                        }
                      />
                      <span className="text-xs text-muted-foreground">até</span>
                      <input
                        aria-label={`Fechamento ${DAYS[h.day]}`}
                        type="time"
                        className="field w-32"
                        value={h.close}
                        onChange={(e) =>
                          update({
                            ...draft,
                            opening_hours: draft.opening_hours.map((row) =>
                              row.day === h.day ? { ...row, close: e.target.value } : row,
                            ),
                          })
                        }
                      />
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Fechado</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="admin-save-bar sticky flex flex-wrap items-center justify-between gap-4 border-t bg-background/95 py-5 backdrop-blur">
        <p
          role="status"
          className={`text-sm ${success ? "text-primary" : message ? "text-destructive" : "text-muted-foreground"}`}
        >
          {message || (dirty ? "Alterações não salvas" : "Nenhuma alteração pendente")}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!dirty || busy}
            onClick={() => update(structuredClone(initial))}
          >
            Descartar
          </Button>
          <Button disabled={busy || !dirty} onClick={submit}>
            {busy ? "Salvando…" : success ? <Check /> : <Save />}Salvar alterações
          </Button>
        </div>
      </div>
    </>
  );
}
