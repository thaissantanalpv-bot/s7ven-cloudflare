import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { OPEN_ORDERS_MESSAGE } from "@/lib/push";
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
  Settings,
  Tag,
  Eye,
  Bell,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AdminAppAccess } from "@/components/admin-app-access";
import { SiteLinkCard } from "@/components/site-link-card";
import { supabase } from "@/integrations/supabase/client";
import { storeSettingsQuery } from "@/lib/store-settings.query";
import { checkStoreAdmin, saveStoreSettings } from "@/lib/store-settings.functions";
import { OrderBoard } from "@/components/orders/order-board";
import { NewOrderAlarm } from "@/components/orders/new-order-alarm";
import { ProductManager } from "@/components/products/product-manager";
import { DistanceTiersEditor } from "@/components/distance-tiers-editor";
import { SalesReport } from "@/components/pos/sales-report";
import { SalesHistory } from "@/components/pos/sales-history";
import { CatalogAnalytics } from "@/components/catalog-analytics";
import { AbandonedCartNotice } from "@/components/abandoned-cart-notice";
import { AnalyticsAssistant } from "@/components/analytics-assistant";
import { adminCatalogQuery } from "@/lib/catalog.query";
import { getCatalogFunnel } from "@/lib/catalog-analytics.functions";
import { DAYS, settingsSchema, type StoreSettings } from "@/lib/store-settings";
import { lowStockItems } from "@/lib/catalog";
import { AdminSettings } from "@/components/admin-settings";
import { PromotionsEditor } from "@/components/promotions-editor";
import { SpecialDaysEditor } from "@/components/special-days-editor";
import { CatalogAppearanceEditor } from "@/components/catalog-appearance-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/painel")({ staticData: { sitemap: false },

  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(storeSettingsQuery), context.queryClient.ensureQueryData(adminCatalogQuery)]),
  head: () => ({
    meta: [
      { title: "Pedidos, vendas e operação — S7VEN" },
      {
        name: "description",
        content: "Pedidos, histórico de vendas, produtos e estoque da S7VEN Lounge e Tabacaria.",
      },
      { property: "og:title", content: "Operação da loja — S7VEN" },
      {
        property: "og:description",
        content: "Pedidos do catálogo, estoque, taxas e horários da S7VEN.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

type ViewId = "home" | "analytics" | "orders" | "products" | "combos" | "report" | "history" | "app-settings";

function Admin() {
  const [view, setView] = useState<ViewId>("home");
  // Tapping a new-order notification opens the orders board (fresh window or already-open panel).
  useEffect(() => {
    if (new URLSearchParams(location.search).get("aba") === "pedidos") setView("orders");
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === OPEN_ORDERS_MESSAGE) setView("orders");
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);
  const [menuOpen, setMenuOpen] = useState(false);
  const check = useServerFn(checkStoreAdmin);
  const permission = useQuery({ queryKey: ["store-admin"], queryFn: () => check(), retry: false });
  const { data: settings } = useSuspenseQuery(storeSettingsQuery);

  const viewTitle: Record<ViewId, string> = {
    home: "Minha loja",
    report: "Relatório de vendas",
    analytics: "Movimento do catálogo",
    combos: "Combos",
    history: "Histórico de vendas",
    orders: "Pedidos e Acompanhamento",
    products: "Produtos e estoque",
    "app-settings": "Configurações",
  };

  const navItems: { id: ViewId; label: string; Icon: typeof Home; color: string }[] = [
    { id: "home", label: "Início", Icon: Home, color: "text-violet-400" },
    { id: "orders", label: "Pedidos", Icon: ShoppingBag, color: "text-orange-400" },
    { id: "products", label: "Produtos", Icon: Package, color: "text-sky-400" },
    { id: "combos", label: "Combos", Icon: Layers, color: "text-pink-400" },
    { id: "analytics", label: "Movimento", Icon: Activity, color: "text-emerald-400" },
    { id: "report", label: "Relatório", Icon: Receipt, color: "text-teal-400" },
    { id: "history", label: "Histórico", Icon: History, color: "text-indigo-400" },
    { id: "app-settings", label: "Configurações", Icon: Settings, color: "text-slate-400" },
  ];

  function renderView(v: ViewId) {
    switch (v) {
      case "home":
      case "analytics":
        return <><CatalogAnalytics /><SiteLinkCard /></>;
      case "report":
        return <SalesReport />;
      case "combos":
        return <ProductManager key="combos" combos />;
      case "history":
        return <SalesHistory />;
      case "orders":
        return <OrderBoard />;
      case "products":
        return <ProductManager key="products" />;
      case "app-settings":
      default:
        return (
          <Tabs defaultValue="fees" className="mt-6">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 sm:grid-cols-4">
              {([
                ["fees", Clock, "Taxas e horários"],
                ["appearance", Palette, "Aparência do catálogo"],
                ["assistant", MessageCircle, "Assistente"],
                ["alerts", Bell, "Avisos e sons"],
              ] as const).map(([value, Icon, label]) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="h-auto min-h-12 gap-2 whitespace-normal rounded-xl border-2 border-primary/30 bg-card px-3 py-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary hover:bg-primary/10 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
                >
                  <Icon className="size-5 shrink-0" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="fees"><SettingsEditor initial={settings} /></TabsContent>
            <TabsContent value="appearance"><CatalogAppearanceEditor /></TabsContent>
            <TabsContent value="assistant"><AnalyticsAssistant /></TabsContent>
            <TabsContent value="alerts"><AdminSettings /></TabsContent>
          </Tabs>
        );
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link to="/" className="font-display text-2xl font-bold">
            <img src="/logo-s7ven.png" alt="S7VEN Lounge e Tabacaria" width={360} height={312} className="h-12 w-auto object-contain" />
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
        <h1 className="font-display text-3xl font-semibold">{viewTitle[view]}</h1>
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
            <div className="mt-7 hidden gap-6 md:flex">
              <nav className="admin-sidebar w-56 shrink-0 space-y-1 rounded-xl border bg-card p-3" aria-label="Painel da loja">
                {sidebarItems.map(({ id, label, Icon, color }) => (
                  <button
                    key={id}
                    type="button"
                    aria-current={view === id ? "page" : undefined}
                    onClick={() => setView(id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                      view === id ? "bg-primary/15 font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className={`size-5 shrink-0 ${view === id ? "text-primary" : color}`} />
                    {label}
                  </button>
                ))}
              </nav>
              <div className="min-w-0 flex-1">
                {renderView(view)}
              </div>
            </div>
            <NewOrderAlarm />
            <div className="md:hidden">
              {view === "home" ? <AdminHome onOpen={(v) => setView(v as ViewId)} /> : renderView(view)}
            </div>
            <nav className="admin-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background md:hidden" aria-label="Navegação do aplicativo">
              {([
                { id: "home" as ViewId, label: "Início", Icon: Home },
                { id: "orders" as ViewId, label: "Pedidos", Icon: ShoppingBag },
                { id: "products" as ViewId, label: "Produtos", Icon: Package },
              ]).map(({ id, label, Icon }) => <Button key={id} variant="ghost" aria-current={view === id ? "page" : undefined} className={`h-16 min-w-0 flex-col gap-1 rounded-none px-1 text-[11px] ${view === id ? "text-primary" : "text-muted-foreground"}`} onClick={() => setView(id)}><Icon className="size-5" />{label}</Button>)}
              <Button variant="ghost" className={`h-16 flex-col gap-1 rounded-none px-1 text-[11px] ${mobileMenuIds.includes(view) ? "text-primary" : "text-muted-foreground"}`} onClick={() => setMenuOpen(true)}><Menu className="size-5" />Menu</Button>
            </nav>
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetContent side="bottom" className="mx-auto max-w-lg pb-8">
                <SheetTitle>Minha loja</SheetTitle>
                <SheetDescription className="mt-2">S7VEN Lounge e Tabacaria</SheetDescription>
                <div className="mt-6 grid gap-2">
                  {mobileMenuItems.map(({ id, label, Icon }) => <Button key={id} variant="ghost" className="h-14 justify-start border-b" onClick={() => { setView(id); setMenuOpen(false); }}><Icon className="text-primary" />{label}<ChevronRight className="ml-auto" /></Button>)}
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
  const { data: products } = useSuspenseQuery(adminCatalogQuery);
  const lowStock = products.flatMap(lowStockItems);
  const data = stats.data;
  const cards = [
    { label: "Visitas", hint: "abriram o catálogo hoje", value: data?.visitors, Icon: Users, target: "analytics", tone: "bg-emerald-500/15 text-emerald-400" },
    { label: "Carrinhos", hint: "montando pedido agora", value: data?.pending, Icon: ShoppingCart, target: "analytics", tone: "bg-orange-500/15 text-orange-400" },
    { label: "Pedidos", hint: "enviados hoje", value: data?.completed, Icon: ShoppingBag, target: "orders", tone: "bg-sky-500/15 text-sky-400" },
    { label: "Estoque baixo", hint: lowStock.length ? lowStock.slice(0, 2).map(i => i.label).join(", ") + (lowStock.length > 2 ? "…" : "") : "nenhum item no mínimo", value: lowStock.length, Icon: Package, target: "products", tone: "bg-pink-500/15 text-pink-400" },
  ];
  const quickActions = [
    { label: "Pedidos", Icon: ShoppingBag, target: "orders" },
    { label: "Produtos", Icon: Package, target: "products" },
    { label: "Combos", Icon: Layers, target: "combos" },
    { label: "Histórico", Icon: History, target: "history" },
  ];
  return (
    <section className="py-6" aria-label="Resumo da loja">
      <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3">
        <p className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <span className="relative flex size-2.5 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
          </span>
          <span className="truncate">{data ? `${data.online} online agora` : "Conectando…"}</span>
        </p>
        <span className="shrink-0 text-xs text-muted-foreground">hoje</span>
      </div>
      {!stats.error && data && <AbandonedCartNotice count={data.abandoned} onOpen={() => onOpen("analytics")} />}
      <div className="grid grid-cols-2 gap-3">
        {cards.map(({ label, hint, value, Icon, target, tone }) => (
          <button key={label} type="button" onClick={() => onOpen(target)} className="flex min-h-32 flex-col items-start gap-2 rounded-2xl border bg-card p-4 text-left active:scale-[0.98]">
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon className="size-5" /></span>
            <span className="font-display text-3xl font-semibold leading-none">{value === undefined ? "—" : value.toLocaleString("pt-BR")}</span>
            <span className="text-sm font-medium leading-tight">{label}</span>
            <span className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{hint}</span>
          </button>
        ))}
      </div>
      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ações rápidas</p>
      <div className="grid grid-cols-4 gap-2">
        {quickActions.map(({ label, Icon, target }) => (
          <button key={label} type="button" onClick={() => onOpen(target)} className="flex flex-col items-center gap-1.5 rounded-xl border bg-card py-3 text-[11px] font-medium active:scale-[0.97]">
            <Icon className="size-5 text-primary" />
            {label}
          </button>
        ))}
      </div>
      {stats.error && <p role="alert" className="mt-4 text-sm text-destructive">Não foi possível atualizar os números. <Button variant="link" onClick={() => stats.refetch()}>Tentar novamente</Button></p>}
      <SiteLinkCard />
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
      // A aparência e a foto do banner têm salvamento próprio; mantém as que já estavam carregadas.
      client.setQueryData(storeSettingsQuery.queryKey, (old) => ({ ...parsed.data, catalog_appearance: old?.catalog_appearance ?? parsed.data.catalog_appearance, banner_image_url: old?.banner_image_url ?? "" }));
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
        <Button
          role="tab"
          aria-selected={tab === "promo"}
          variant="ghost"
          onClick={() => setTab("promo")}
          className={tab === "promo" ? "rounded-none border-b-2 border-primary text-primary" : "rounded-none"}
        >
          <Tag />
          Cupons e banner
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
      ) : tab === "promo" ? (
        <PromotionsEditor draft={draft} update={update} />
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
          <SpecialDaysEditor draft={draft} update={update} />
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Entregas até</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Depois desse horário o cliente ainda pode fazer o pedido, mas somente para retirada na loja, até o horário de fechamento.
              </p>
            </div>
            <input
              aria-label="Horário limite para entregas"
              type="time"
              className="field w-32"
              value={draft.order_cutoff}
              onChange={(e) => update({ ...draft, order_cutoff: e.target.value })}
            />
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