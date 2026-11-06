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
  Megaphone,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AdminAppAccess } from "@/components/admin-app-access";
import { MarketingTools } from "@/components/marketing-tools";
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
import { AnalyticsAssistant } from "@/components/analytics-assistant";
import { adminCatalogQuery } from "@/lib/catalog.query";
import { getCatalogFunnel } from "@/lib/catalog-analytics.functions";
import { DAYS, settingsSchema, type StoreSettings } from "@/lib/store-settings";
import { lowStockItems } from "@/lib/catalog";
import { brl } from "@/lib/products";
import { getSalesReport } from "@/lib/sales-report.functions";
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

type ViewId = "home" | "analytics" | "orders" | "products" | "divulgar" | "report" | "history" | "app-settings";

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
  const check = useServerFn(checkStoreAdmin);
  const permission = useQuery({ queryKey: ["store-admin"], queryFn: () => check(), retry: false });
  const { data: settings } = useSuspenseQuery(storeSettingsQuery);

  const viewTitle: Record<ViewId, string> = {
    home: "Visão Geral & Financeiro",
    report: "Relatório de vendas",
    analytics: "Movimento do catálogo",
    divulgar: "Divulgação & Redes Sociais",
    history: "Histórico de vendas",
    orders: "Central de Pedidos",
    products: "Catálogo, Estoque & Combos",
    "app-settings": "Configurações",
  };

  const navItems: { id: ViewId; label: string; Icon: typeof Home; color: string }[] = [
    { id: "home", label: "Resumo", Icon: Home, color: "text-violet-400" },
    { id: "orders", label: "Pedidos", Icon: ShoppingBag, color: "text-orange-400" },
    { id: "products", label: "Catálogo", Icon: Package, color: "text-sky-400" },
    { id: "divulgar", label: "Divulgar", Icon: Megaphone, color: "text-fuchsia-400" },
    { id: "analytics", label: "Movimento", Icon: Activity, color: "text-emerald-400" },
    { id: "report", label: "Relatório", Icon: Receipt, color: "text-teal-400" },
    { id: "history", label: "Histórico", Icon: History, color: "text-indigo-400" },
    { id: "app-settings", label: "Configurações", Icon: Settings, color: "text-slate-400" },
  ];

  function renderView(v: ViewId) {
    switch (v) {
      case "analytics":
        return <CatalogAnalytics />;
      case "report":
        return <SalesReport />;
      case "divulgar":
        return <MarketingTools />;
      case "history":
        return <SalesHistory />;
      case "orders":
        return <OrderBoard />;
      case "products":
        return <ProductManager />;
      case "app-settings":
      default:
        return (
          <>
          <div className="mt-6 grid grid-cols-3 gap-2 md:hidden">
            <Button variant="outline" size="sm" onClick={() => setView("analytics")}>
              <Activity />
              Movimento
            </Button>
            <Button variant="outline" size="sm" onClick={() => setView("report")}>
              <Receipt />
              Relatório
            </Button>
            <Button variant="outline" size="sm" onClick={() => setView("history")}>
              <History />
              Histórico
            </Button>
          </div>
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
          </>
        );
    }
  }

  const bottomTabs: { id: ViewId; label: string; Icon: typeof Home }[] = [
    { id: "home", label: "Resumo", Icon: Home },
    { id: "orders", label: "Pedidos", Icon: ShoppingBag },
    { id: "products", label: "Catálogo", Icon: Package },
    { id: "divulgar", label: "Divulgar", Icon: Megaphone },
    { id: "app-settings", label: "Ajustes", Icon: Settings },
  ];

  const adminNav = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col">
      <Link to="/" className="flex items-center gap-3 border-b px-5 py-5" onClick={onNavigate}>
        <img src="/logo-s7ven.png" alt="S7VEN Lounge e Tabacaria" width={360} height={312} className="h-12 w-auto object-contain" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">Painel Administrativo</span>
          <span className="block text-xs text-muted-foreground">S7VEN Lounge e Tabacaria</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Painel da loja">
        {navItems.map(({ id, label, Icon, color }) => (
          <button
            key={id}
            type="button"
            aria-current={view === id ? "page" : undefined}
            onClick={() => { setView(id); onNavigate?.(); }}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
              view === id ? "bg-primary/15 font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className={`size-5 shrink-0 ${view === id ? "text-primary" : color}`} />
            {label}
          </button>
        ))}
      </nav>
      <div className="space-y-1 border-t p-3">
        <Link to="/" onClick={onNavigate} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <ArrowLeft className="size-5 shrink-0" />
          Ver catálogo
        </Link>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
        >
          <LogOut className="size-5 shrink-0" />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase text-primary">Área da loja</p>
              <h1 className="truncate font-display text-xl font-semibold sm:text-2xl">{viewTitle[view]}</h1>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <AdminAppAccess />
            <Button variant="outline" size="icon" className="md:hidden" aria-label="Sair" onClick={() => supabase.auth.signOut()}>
              <LogOut />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-7 pb-28 sm:px-5 md:pb-10">
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
            <div className="flex gap-6">
              <aside className="hidden w-60 shrink-0 md:block">
                <div className="admin-sidebar sticky top-24 max-h-[calc(100vh-7rem)] overflow-hidden rounded-2xl border bg-card">
                  {adminNav()}
                </div>
              </aside>
              <div className="min-w-0 flex-1">
                {view === "home" ? <AdminHome onOpen={(v) => setView(v as ViewId)} /> : renderView(view)}
              </div>
            </div>
            <NewOrderAlarm />
            <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur md:hidden" aria-label="Abas do painel">
              <div className="grid grid-cols-5">
                {bottomTabs.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    aria-current={view === id ? "page" : undefined}
                    onClick={() => setView(id)}
                    className={`flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${
                      view === id ? "font-semibold text-primary" : "text-muted-foreground active:text-foreground"
                    }`}
                  >
                    <Icon className="size-5" />
                    {label}
                  </button>
                ))}
              </div>
            </nav>
          </>
        )}
      </main>
    </div>
  );
}
function AdminHome({ onOpen }: { onOpen: (view: string) => void }) {
  const getStats = useServerFn(getCatalogFunnel);
  const stats = useQuery({ queryKey: ["admin-catalog-funnel", "today"], queryFn: () => getStats({ data: "today" }), refetchInterval: 5000, retry: 1 });
  const getReport = useServerFn(getSalesReport);
  const report = useQuery({ queryKey: ["admin-sales-report", "today"], queryFn: () => getReport({ data: "today" }), refetchInterval: 60000, retry: false });
  const { data: products } = useSuspenseQuery(adminCatalogQuery);
  const lowStock = products.flatMap(lowStockItems);
  const data = stats.data;
  const pills = [
    { label: "Online", value: data?.online, Icon: Activity, tone: "text-emerald-400", target: "analytics" },
    { label: "Visitas", value: data?.visitors, Icon: Users, tone: "text-sky-400", target: "analytics" },
    { label: "Carrinhos", value: data?.pending, Icon: ShoppingCart, tone: "text-orange-400", target: "analytics" },
    { label: "Pedidos", value: data?.completed, Icon: ShoppingBag, tone: "text-pink-400", target: "orders" },
  ];
  return (
    <section className="space-y-7 py-6" aria-label="Resumo da loja">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resumo de hoje & vendas</p>
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="size-4 text-primary" />
                Faturamento de hoje
              </p>
              <p className="mt-1 font-display text-4xl font-semibold">{report.data ? brl(report.data.revenue) : "—"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {report.data ? `${report.data.orderCount} pedidos válidos · ticket médio ${brl(report.data.averageTicket)}` : "Carregando vendas…"}
              </p>
            </div>
            <Button onClick={() => onOpen("report")} className="shrink-0">
              <Receipt />
              Ver Relatório de Vendas
            </Button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {pills.map(({ label, value, Icon, tone, target }) => (
            <button key={label} type="button" onClick={() => onOpen(target)} className="flex min-w-0 flex-col items-center gap-1 rounded-full border bg-card px-2 py-2.5 active:scale-[0.97]">
              <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                <Icon className={`size-3.5 ${tone}`} />
                {label}
              </span>
              <span className="font-display text-lg font-semibold leading-none">{value === undefined ? "—" : value.toLocaleString("pt-BR")}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => onOpen("report")}>
            <Receipt />
            Relatório de Vendas
          </Button>
          <Button variant="outline" onClick={() => onOpen("history")}>
            <History />
            Histórico de Vendas
          </Button>
        </div>
      </div>
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alertas do sistema</p>
        <div className="divide-y rounded-2xl border bg-card">
          <button type="button" onClick={() => onOpen("products")} className="flex w-full items-center gap-3 p-4 text-left">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-pink-500/15 text-pink-400"><Package className="size-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Estoque baixo</span>
              <span className="block truncate text-xs text-muted-foreground">
                {lowStock.length ? `${lowStock.length} ${lowStock.length === 1 ? "item" : "itens"} para repor: ${lowStock.slice(0, 2).map(i => i.label).join(", ")}${lowStock.length > 2 ? "…" : ""}` : "Nenhum item no mínimo"}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
          {data && data.abandoned > 0 && (
            <button type="button" onClick={() => onOpen("analytics")} className="flex w-full items-center gap-3 p-4 text-left">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-500/15 text-orange-400"><ShoppingCart className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Carrinhos abandonados</span>
                <span className="block text-xs text-muted-foreground">{data.abandoned} clientes deixaram pedidos pela metade hoje</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          )}
          <button type="button" onClick={() => onOpen("analytics")} className="flex w-full items-center gap-3 p-4 text-left">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400"><Activity className="size-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Movimento do catálogo</span>
              <span className="block text-xs text-muted-foreground">Visitas, buscas e carrinhos em tempo real</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </div>
        {stats.error && <p role="alert" className="mt-4 text-sm text-destructive">Não foi possível atualizar os números. <Button variant="link" onClick={() => stats.refetch()}>Tentar novamente</Button></p>}
      </div>
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