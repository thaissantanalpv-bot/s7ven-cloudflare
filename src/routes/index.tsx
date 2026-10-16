import { createFileRoute } from "@tanstack/react-router";
import { cloneElement, isValidElement, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  ArrowUpRight,
  Truck,
  Store,
  Clock,
  SlidersHorizontal,
  X,
  MessageCircle,
  ChevronRight,
  Star,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { publicStoreSettingsQuery as storeSettingsQuery } from "@/lib/store-settings.query";
import { savePublicSnapshot, readPublicSnapshot, cacheViewedCatalogPhotos, offlinePhotoUrls } from "@/lib/offline-catalog";
import { storeStatus, DAYS } from "@/lib/store-settings";
import { QRCodeSVG } from "qrcode.react";
import { useServerFn } from "@tanstack/react-start";
import { PhoneField } from "@/components/orders/phone-field";
import { useCatalogAnalytics } from "@/lib/use-catalog-analytics";
import { readAnalyticsIdentity } from "@/lib/catalog-analytics";
import { customerSchema, submitOrderSchema, validateCartAvailability } from "@/lib/orders";
import { submitOrder, orderTracking } from "@/lib/orders.functions";
import { startDeliverySession, quoteDelivery, suggestDeliveryAddress } from "@/lib/delivery.functions";
import { DELIVERY_CITY, deliveryAddress, deliveryFieldsComplete, joinAddressLine, restoreDeliveryFields, splitAddressLine } from "@/lib/delivery-address";
import { catalogQuery, useCatalogUpdates } from "@/lib/catalog.query";
import { available, type CatalogProduct } from "@/lib/catalog";
import { ProductGallery } from "@/components/products/product-gallery";
import { ProductCardPhotos } from "@/components/products/product-card-photos";
import { ComboBuilder } from "@/components/products/combo-builder";
import { comboOption, parseComboOption, comboSummary, type ComboSelection } from "@/lib/combos";
import {
  PAYMENT_METHODS,
  STORE_NAME,
  brl,
} from "@/lib/products";
import { PIX_KEY, buildPixPayload, copyToClipboard } from "@/lib/pix";
import { checkoutWhatsApp, productMessage } from "@/lib/order-message";

export const Route = createFileRoute("/")({
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(storeSettingsQuery), context.queryClient.ensureQueryData(catalogQuery)]),
  staticData: { sitemap: true },
  head: ({ loaderData }) => {
    const title = "S7VEN Lounge e Tabacaria em Araçatuba — Catálogo Digital";
    const description = "Tabacaria em Araçatuba, SP: veja os produtos, monte seu carrinho e peça pelo WhatsApp com entrega ou retirada.";
    const products = (loaderData?.[1] ?? []).filter((p) => p.active && !p.comboGroups?.length).slice(0, 100);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: "https://s7venlounge.shop/" },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: "https://s7venlounge.shop/" }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: products.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Product",
              name: p.name,
              ...(p.description ? { description: p.description.slice(0, 500) } : {}),
              url: `https://s7venlounge.shop/?produto=${encodeURIComponent(p.id)}`,
              offers: { "@type": "Offer", price: p.price.toFixed(2), priceCurrency: "BRL", availability: p.stock === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock" },
            },
          })),
        }),
      }],
    };
  },
  component: Catalog,
  errorComponent: ({ error }) => <div role="alert" className="p-8 text-center">{error instanceof Error ? error.message : "Não foi possível carregar o catálogo."}<Button asChild variant="outline" className="mt-4"><a href="/">Tentar novamente</a></Button></div>,
  notFoundComponent: () => <div className="p-8 text-center">Catálogo não encontrado.</div>,
});

type Cart = Record<string, number>;
type Line = { product: CatalogProduct; key: string; qty: number; option: string; components: ComboSelection[] | undefined };

const KEY = "catalogo-carrinho";
const SEP = "::";
const OTHER = "__outro__";
const keyOf = (id: string, opt?: string) => (opt ? `${id}${SEP}${opt}` : id);

function Catalog() {
  const queryClient = useQueryClient();
  const { data: catalogProducts } = useSuspenseQuery(catalogQuery);
  const [online, setOnline] = useState(true);
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map());
  const products = useMemo<CatalogProduct[]>(() => online ? catalogProducts : catalogProducts.map(product => ({ ...product, ...(product.image ? { image: photoUrls.get(product.image) ?? product.image } : {}), ...(product.images ? { images: product.images.map(url => photoUrls.get(url) ?? url) } : {}) })), [catalogProducts, online, photoUrls]);
  useCatalogUpdates();
  const categories = ["Todos", ...new Set(products.map(p => p.category))];
  const { data: settings } = useSuspenseQuery(storeSettingsQuery);
  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) {
        void queryClient.invalidateQueries({ queryKey: catalogQuery.queryKey });
        void queryClient.invalidateQueries({ queryKey: storeSettingsQuery.queryKey });
      } else {
        const savedProducts = readPublicSnapshot<CatalogProduct[]>("products");
        const savedSettings = readPublicSnapshot<typeof settings>("settings");
        if (savedProducts) queryClient.setQueryData(catalogQuery.queryKey, savedProducts);
        if (savedSettings) queryClient.setQueryData(storeSettingsQuery.queryKey, savedSettings);
      }
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, [queryClient]);
  useEffect(() => {
    if (navigator.onLine) {
      savePublicSnapshot("products", catalogProducts);
      savePublicSnapshot("settings", settings);
    }
    const urls = [...new Set(catalogProducts.flatMap(product => [product.image, ...(product.images ?? [])]).filter((url): url is string => Boolean(url)))];
    if (online) return cacheViewedCatalogPhotos(urls);
    let disposed = false;
    let resolved = new Map<string, string>();
    void offlinePhotoUrls(urls).then(result => {
      resolved = result;
      if (disposed) result.forEach(url => URL.revokeObjectURL(url));
      else setPhotoUrls(result);
    }).catch(() => {});
    return () => { disposed = true; resolved.forEach(url => URL.revokeObjectURL(url)); };
  }, [catalogProducts, settings, online]);
  const registerOrder = useServerFn(submitOrder);
  const startDistanceSession = useServerFn(startDeliverySession);
  const calculateDistance = useServerFn(quoteDelivery);
  const suggestAddress = useServerFn(suggestDeliveryAddress);
  const [deliveryQuote, setDeliveryQuote] = useState<{ id: string; address: string; km: number; fee: number; expires: number; config: string } | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [deliveryError, setDeliveryError] = useState("");
  const quoteRequest = useRef(0);
  const pendingQuote = useRef("");
  const deliveryToken = useRef("");
  const [suggestions, setSuggestions] = useState<{ placeId: string; text: string; street: string; number: string; neighborhood: string }[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const suggestRequest = useRef(0);
  const suggestSession = useRef(crypto.randomUUID());
  const autoQuote = useRef(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState<{ id: string; number: number; url: string; subtotal: number; deliveryFee: number; total: number; delivery: boolean } | null>(null);
  const trackOrder = useServerFn(orderTracking);
  const tracking = useQuery({
    queryKey: ["order-tracking", receipt?.id],
    queryFn: () => trackOrder({ data: { id: receipt!.id } }),
    enabled: Boolean(receipt?.delivery),
    refetchInterval: (q) => (q.state.data?.status === "delivered" ? false : 30000),
    retry: false,
  });
  const [attempt, setAttempt] = useState<{ signature: string; id: string } | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const status = now
    ? storeStatus(settings, now)
    : { open: true, configured: false, label: "Atendimento" };
  const [hoursOpen, setHoursOpen] = useState(false);
  const [sort, setSort] = useState("catalog");
  const [cart, setCart] = useState<Cart>({});
  const [loaded, setLoaded] = useState(false);
  useCatalogAnalytics(loaded, Object.values(cart).some(qty => qty > 0));
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("Todos");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    street: "",
    number: "",
    neighborhood: "",
    payment: "",
    change: "",
    notes: "",
    zone: "",
    fulfillment: "delivery" as "delivery" | "pickup",
  });
  const [addressLine, setAddressLine] = useState("");
  const fullAddress = [form.street.trim(), form.number.trim(), form.neighborhood.trim()].filter(Boolean).join(", ");
  const addressComplete = deliveryFieldsComplete(form.street, form.number);
  const [error, setError] = useState("");
  const [sel, setSel] = useState<Record<string, string>>({});
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState("");
  const [building, setBuilding] = useState<CatalogProduct | null>(null);
  const [sharedProduct, setSharedProduct] = useState<CatalogProduct | null>(null);
  useEffect(() => {
    const id = new URL(window.location.href).searchParams.get("produto");
    if (id) setSharedProduct(products.find(p => p.id === id) ?? null);
  }, [products]);
  const featured = products.filter(p => p.featured && available(p));
  const customerValidation = customerSchema.safeParse({ ...form, address: fullAddress });
  const fieldErrors = submitted && !customerValidation.success
    ? customerValidation.error.flatten().fieldErrors
    : {};

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.cart) setCart(saved.cart);
        if (saved.form) {
          // Saved carts from the previous single-field address keep working.
          const restored = restoreDeliveryFields(saved.form);
          setAddressLine(joinAddressLine(String(restored.street ?? ""), String(restored.number ?? "")));
          setForm((f) => ({ ...f, ...restored }));
        }
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(KEY, JSON.stringify({ cart, form })); } catch {
      // Ordering remains available when the browser refuses persistent storage.
    }
  }, [cart, form, loaded]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter(
      (p) =>
        (cat === "Todos" || p.category === cat) &&
        (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)),
    );
    if (sort === "low") list.sort((a, b) => a.price - b.price);
    if (sort === "high") list.sort((a, b) => b.price - a.price);
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
   }, [query, cat, sort, products]);

  const items: Line[] = useMemo(
    () =>
      Object.entries(cart)
        .map(([key, qty]) => {
          const [id, opt] = key.split(SEP);
          const product = products.find((p) => p.id === id);
          const components = parseComboOption(opt ?? "");
          return product && qty > 0 ? { product, key, qty, option: components ? "" : opt ?? "", components } : null;
        })
        .filter((l): l is Line => l !== null),
    [cart, products],
  );
  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.qty * i.product.price, 0);
  const zone = settings.delivery_zones.find((z) => z.id === form.zone);
  const isDelivery = form.fulfillment === "delivery";
  const distanceMode = settings.delivery_enabled && settings.delivery_distance_enabled;
  const distanceConfig = JSON.stringify([settings.delivery_origin, settings.delivery_distance_tiers]);
  const validQuote = deliveryQuote?.address === deliveryAddress(fullAddress) && deliveryQuote.config === distanceConfig && deliveryQuote.expires > (now?.getTime() ?? 0) ? deliveryQuote : null;
  const deliveryFee = isDelivery && settings.delivery_enabled ? (distanceMode ? validQuote?.fee ?? 0 : settings.fixed_delivery_fee ?? zone?.fee ?? 0) : 0;
  useEffect(() => {
    if (deliveryQuote && deliveryQuote.address === deliveryAddress(fullAddress) && deliveryQuote.config === distanceConfig) return;
    quoteRequest.current += 1;
    pendingQuote.current = "";
    setQuoting(false);
    setDeliveryError("");
    setDeliveryQuote(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullAddress, form.fulfillment, distanceConfig]);
  const calculateDelivery = async () => {
    const address = fullAddress;
    if (!isDelivery || !distanceMode || address.length < 8 || validQuote || pendingQuote.current === address) return;
    if (!addressComplete) return setDeliveryError("Preencha a rua e o número para calcular a entrega.");
    if (!navigator.onLine) return setDeliveryError("Conecte-se à internet para calcular a taxa de entrega.");
    const request = ++quoteRequest.current;
    pendingQuote.current = address;
    setQuoting(true); setDeliveryError(""); setDeliveryQuote(null);
    const autoNeighborhood = !form.neighborhood.trim();
    const freshToken = async () => (deliveryToken.current = (await startDistanceSession()).token);
    try {
      const token = deliveryToken.current || await freshToken();
      if (request !== quoteRequest.current) return;
      let quote;
      try { quote = await calculateDistance({ data: { address, token, autoNeighborhood } }); }
      catch (e) {
        if (!(e instanceof Error) || e.message !== "DELIVERY_SESSION_EXPIRED") throw e;
        const retryToken = await freshToken();
        if (request !== quoteRequest.current) return;
        quote = await calculateDistance({ data: { address, token: retryToken, autoNeighborhood } });
      }
      if (request !== quoteRequest.current) return;
      const { neighborhood, ...found } = quote;
      setDeliveryQuote({ ...found, expires: Date.now()+14*60000, config: distanceConfig });
      if (autoNeighborhood && neighborhood) setForm(f => f.neighborhood.trim() ? f : { ...f, neighborhood });
    } catch(e) { if (request === quoteRequest.current) setDeliveryError(e instanceof Error && e.message !== "DELIVERY_SESSION_EXPIRED" ? e.message : "Não foi possível calcular a entrega. Confira o endereço e tente novamente."); }
    finally { if (request === quoteRequest.current) { pendingQuote.current = ""; setQuoting(false); } }
  };
  // Sugestões de endereço enquanto o cliente digita a rua (somente Araçatuba).
  useEffect(() => {
    const text = `${form.street.trim()} ${form.number.trim()}`.trim();
    if (!isDelivery || !distanceMode || !online || text.length < 3) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }
    const request = ++suggestRequest.current;
    const timer = setTimeout(async () => {
      try {
        if (!deliveryToken.current) deliveryToken.current = (await startDistanceSession()).token;
        const result = await suggestAddress({ data: { input: text, token: deliveryToken.current, sessionToken: suggestSession.current } });
        if (request !== suggestRequest.current) return;
        setSuggestions(result.suggestions);
        setSuggestionsOpen(result.suggestions.length > 0);
      } catch (e) {
        if (e instanceof Error && e.message === "DELIVERY_SESSION_EXPIRED") deliveryToken.current = "";
        if (request === suggestRequest.current) { setSuggestions([]); setSuggestionsOpen(false); }
      }
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.street, form.number, isDelivery, distanceMode, online]);
  const pickSuggestion = (suggestion: { street: string; number: string; neighborhood: string }) => {
    suggestSession.current = crypto.randomUUID();
    suggestRequest.current += 1;
    setSuggestions([]);
    setSuggestionsOpen(false);
    const number = suggestion.number || form.number;
    autoQuote.current = true;
    setAddressLine(joinAddressLine(suggestion.street, number));
    setForm(f => ({
      ...f,
      street: suggestion.street,
      number: suggestion.number || f.number,
      neighborhood: suggestion.neighborhood || f.neighborhood,
    }));
  };
  // Ao escolher uma sugestão, a taxa de entrega é calculada sozinha.
  useEffect(() => {
    if (!autoQuote.current) return;
    autoQuote.current = false;
    if (isDelivery && distanceMode && addressComplete) void calculateDelivery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullAddress]);
  const total = subtotal + deliveryFee;

  const displayedSubtotal = !items.length && receipt ? receipt.subtotal : subtotal;
  const displayedDeliveryFee = !items.length && receipt ? receipt.deliveryFee : deliveryFee;
  const displayedTotal = !items.length && receipt ? receipt.total : total;
  const pixPayload = useMemo(() => buildPixPayload(displayedTotal), [displayedTotal]);
  const copy = async (text: string, label: string) => {
    if (await copyToClipboard(text)) {
      setCopied(label);
      setTimeout(() => setCopied(""), 2500);
    }
  };

  const change = (key: string, d: number) =>
    setCart((c) => {
      const [id, encoded = ""] = key.split(SEP);
      const components = parseComboOption(encoded);
      const option = components ? "" : encoded;
      const product = products.find(p => p.id === id);
      const n = Math.max(0, (c[key] || 0) + d);
      if (d > 0 && (!product || !available(product, option, n) || (product.stock !== null && Object.entries(c).filter(([k]) => k.split(SEP)[0] === id).reduce((sum, [, q]) => sum + q, d) > product.stock))) return c;
      const next = { ...c };
      if (n === 0) delete next[key];
      else next[key] = n;
      if (d > 0 && components) {
        try { validateCartAvailability(cartInputs(next), products); }
        catch (e) { setError(e instanceof Error ? e.message : "Confira o combo."); return c; }
      }
      return next;
    });

  const cartInputs = (value: Cart) => Object.entries(value).map(([key, qty]) => {
    const [productId, encoded = ""] = key.split(SEP);
    const components = parseComboOption(encoded);
    return { productId: productId ?? "", option: components ? "" : encoded, components, qty, expectedPrice: products.find(p => p.id === productId)?.price };
  });

  const send = async () => {
    if (sending) return;
    if (!navigator.onLine) return setError("Conecte-se à internet para confirmar os valores e enviar seu pedido.");
    setError("");
    setSubmitted(true);
    // Validate saved cart entries too: missing products must not be silently omitted.
    const inputItems = cartInputs(cart);
    try {
      validateCartAvailability(inputItems, products);
    } catch (e) {
      return setError(e instanceof Error ? e.message : "Confira os produtos do carrinho.");
    }
    if (isDelivery && distanceMode && !validQuote) return setError("Calcule a entrega pelo endereço antes de enviar.");
    if (isDelivery && settings.delivery_enabled && !distanceMode && settings.fixed_delivery_fee === null && !zone)
      return setError("Escolha o bairro ou região de entrega.");
    if (status.configured && !status.open)
      return setError("A loja está fechada. Confira os horários de atendimento.");
    const r = customerSchema.safeParse({ ...form, address: fullAddress });
    if (!r.success) return setError(r.error.issues[0]?.message ?? "Verifique os dados");
    const d = r.data;
    const requestId = attempt?.signature === JSON.stringify({ customer: d, items: inputItems }) ? attempt.id : crypto.randomUUID();
    const analytics = readAnalyticsIdentity();
    const validated = submitOrderSchema.safeParse({ requestId, customer: d, items: inputItems, analytics, deliveryQuoteId: isDelivery && distanceMode ? validQuote?.id : undefined, deliveryToken: isDelivery && distanceMode && deliveryToken.current ? deliveryToken.current : undefined });
    if (!validated.success) return setError("Confira os produtos e as quantidades do carrinho antes de enviar.");
    const lines = [
      `*Novo pedido — ${STORE_NAME}*`,
      "",
      ...items.map(
        (i) =>
          productMessage({ id: i.product.id, name: i.product.name, qty: i.qty, price: i.product.price, option: i.option, optionLabel: i.product.optionLabel, hasPhoto: Boolean(i.product.image || i.product.images?.length), combo: i.components ? comboSummary(i.components, products, i.product) : undefined }, window.location.origin) + "\n",
      ),
      "",
      `*Produtos: ${brl(subtotal)}*`,
      !isDelivery ? "*Retirada na loja · Sem taxa de entrega*" : settings.delivery_enabled
        ? `*Entrega${distanceMode ? ` (${validQuote?.km.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} km)` : settings.fixed_delivery_fee === null ? ` (${zone?.name})` : ""}: ${brl(deliveryFee)}*`
        : "*Entrega: valor a confirmar com a loja*",
      `*Total${!isDelivery || settings.delivery_enabled ? "" : " dos produtos"}: ${brl(total)}*`,
      "",
      `*Nome:* ${d.name}`,
      isDelivery ? `*Endereço:* ${deliveryAddress(d.address)}` : `*Modalidade:* Retirada na loja${settings.pickup_address ? `\n*Endereço de retirada:* ${settings.pickup_address}` : ""}`,
      `*Pagamento:* ${d.payment}${d.payment === "Dinheiro" && d.change ? ` (troco para ${d.change})` : ""}`,
      d.notes ? `*Obs.:* ${d.notes}` : "",
    ].filter((l, idx, arr) => l !== "" || arr[idx - 1] !== "");
    const signature = JSON.stringify({ customer: d, items: inputItems });
    setAttempt({ signature, id: requestId });
    setSending(true);
    // Open synchronously to retain browser popup permission; navigate only after a successful save.
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    try {
      const saved = await registerOrder({ data: validated.data });
      const url = checkoutWhatsApp(saved.number, lines, d.phone);
      setReceipt({ id: saved.id, number: saved.number, url, subtotal, deliveryFee, total, delivery: isDelivery });
      setCart({});
      setAttempt(null);
      if (popup) popup.location.href = url;
    } catch (e) {
      popup?.close();
      setError(
        e instanceof Error ? e.message : "Não foi possível registrar seu pedido. Tente novamente.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="catalog-theme min-h-screen bg-background pb-28 text-foreground lg:pb-10">
      {!online && <div role="status" className="border-b bg-muted px-4 py-2 text-center text-sm text-muted-foreground">Sem conexão · Exibindo o último catálogo salvo. Pedidos disponíveis ao reconectar.</div>}
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-lg">
        <div className="mx-auto grid max-w-7xl grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-4 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:px-8">
          <Button variant="ghost" size="icon" asChild title="Área da loja" className="sm:hidden">
            <Link to="/painel" aria-label="Área da loja"><SlidersHorizontal /></Link>
          </Button>
          <Link to="/" className="flex min-w-0 items-center justify-center gap-3 sm:justify-start" aria-label="S7VEN Lounge e Tabacaria">
            <img src="/icons/s7ven-192.png" alt="S7VEN Lounge e Tabacaria" className="size-16 shrink-0 rounded-md object-contain sm:size-20" />
            <span className="hidden min-w-0 font-display text-xl font-semibold sm:block">S7VEN <span className="block text-xs font-normal text-muted-foreground">Lounge e Tabacaria</span></span>
          </Link>
          <div className="relative hidden w-full max-w-md md:block">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <input
              aria-label="Buscar produto"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite sua busca…"
              className="field bg-muted pl-10"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="icon" asChild title="Configurações da loja" className="hidden sm:inline-flex">
              <Link to="/painel" aria-label="Configurações da loja">
                <SlidersHorizontal />
              </Link>
            </Button>
            <Button variant="ghost" onClick={() => setOpen(true)} aria-label={`Meu carrinho, ${count} itens`} className="relative h-11 px-2 sm:px-3">
              <ShoppingBag />
              <span className="hidden sm:inline">Meu carrinho</span>
              <span className="absolute -right-1 top-0 grid size-5 place-items-center rounded-full bg-primary text-xs text-primary-foreground sm:static">
                {count}
              </span>
            </Button>
          </div>
        </div>
        <div className="relative mx-4 mb-4 md:hidden">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <input
            aria-label="Buscar produto"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite sua busca…"
            className="field bg-muted pl-10"
          />
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-8 sm:pt-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-sm font-semibold sm:text-xl">
              S7VEN Lounge e Tabacaria <span className="text-muted-foreground">· Araçatuba</span>
            </h1>
          </div>
          <Button variant="outline" aria-expanded={hoursOpen} aria-controls="catalog-opening-hours" onClick={() => setHoursOpen(!hoursOpen)} className="h-9 shrink-0 px-2 text-xs sm:px-4">
            <span
              className={`size-2 rounded-full ${status.open && status.configured ? "bg-whatsapp" : "bg-muted-foreground"}`}
            />
            {status.label}
            <Clock className="ml-2" />
          </Button>
        </div>
        {status.configured && !status.open && (
          <div role="status" aria-live="polite" className="mt-4 flex items-start gap-3 border-l-4 border-primary bg-muted px-4 py-3">
            <Clock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Loja fechada no momento</p>
              <p className="mt-1 text-sm text-muted-foreground">Os pedidos estarão disponíveis durante o horário de atendimento.</p>
              <Button variant="link" onClick={() => setHoursOpen(true)} aria-controls="catalog-opening-hours" className="mt-1 h-auto px-0 py-1 text-sm">Ver horários de funcionamento</Button>
            </div>
          </div>
        )}
        {hoursOpen && (
          <div id="catalog-opening-hours" className="mt-5 border-y py-4">
            <h2 className="mb-3 text-sm font-semibold">Horários de atendimento · Brasília</h2>
            {settings.hours_enabled ? (
              <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                {settings.opening_hours.map((h) => (
                  <p key={h.day} className="flex justify-between gap-4 pr-4">
                    <span className="text-muted-foreground">{DAYS[h.day]}</span>
                    <span>
                      {h.enabled
                        ? `${h.open} – ${h.close}${h.open > h.close ? " (+1 dia)" : ""}`
                        : "Fechado"}
                    </span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Confirme os horários pelo WhatsApp.</p>
            )}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-b pb-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <Truck className="size-4 text-primary" />
            Consultar taxa de entrega para o seu bairro
          </span>

          <span className="flex items-center gap-2">
            <MessageCircle className="size-4 text-primary" />
            Pedido pelo WhatsApp
          </span>
          <span className="flex items-center gap-2">
            <ShoppingBag className="size-4 text-primary" />
            Pix, cartão ou dinheiro
          </span>
        </div>
      </section>
      {cat === "Todos" && !query.trim() && featured.length > 0 && <section aria-label="Produtos em destaque" className="mx-auto max-w-7xl border-b px-4 py-5 sm:px-8">
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold"><Star className="size-5 text-primary" />Destaques</h2>
        <div className="grid grid-cols-2 items-stretch gap-x-3 gap-y-6 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          {featured.map(p => <ProductCard key={p.id} p={p} cart={cart} sel={sel} typed={typed} onSel={(id, v) => setSel(s => ({ ...s, [id]: v }))} onTyped={(id, v) => setTyped(s => ({ ...s, [id]: v }))} onChange={change} onBuild={() => setBuilding(p)} />)}
        </div>
      </section>}
      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-8 sm:py-7">
        <nav aria-label="Categorias" className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-2">
          {categories.map((c) => (
            <Button key={c} variant={cat === c ? "default" : "secondary"} onClick={() => setCat(c)} className="h-10 shrink-0 rounded-full px-5" aria-pressed={cat === c}>
              {c.replace("Narguiles > ", "")}
            </Button>
          ))}
        </nav>
        <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold">
              {cat === "Todos" ? "Todos os produtos" : cat.replace("Narguiles > ", "")}
            </h2>
            <span className="text-xs text-muted-foreground">{filtered.length} produtos</span>
          </div>
          <select
            aria-label="Ordenar produtos"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-md border bg-card px-3 py-2 text-xs"
          >
            <option value="catalog">Ordem do catálogo</option>
            <option value="low">Menor preço</option>
            <option value="high">Maior preço</option>
            <option value="name">Nome: A–Z</option>
          </select>
        </div>
        <main className="grid grid-cols-2 items-stretch gap-x-3 gap-y-6 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <Search className="mx-auto mb-4 size-8 text-muted-foreground" />
              <p>Nenhum produto encontrado.</p>
              <Button
                variant="link"
                onClick={() => {
                  setQuery("");
                  setCat("Todos");
                }}
              >
                Limpar filtros
              </Button>
            </div>
          )}
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              p={p}
              cart={cart}
              sel={sel}
              typed={typed}
              onSel={(id, v) => setSel((s) => ({ ...s, [id]: v }))}
              onTyped={(id, v) => setTyped((s) => ({ ...s, [id]: v }))}
              onChange={change}
              onBuild={() => setBuilding(p)}
            />
          ))}
        </main>
      </section>
      {sharedProduct && <ProductGallery product={sharedProduct} open onOpenChange={value => { if (!value) { setSharedProduct(null); const url = new URL(window.location.href); url.searchParams.delete("produto"); window.history.replaceState(null, "", url.href); } }} />}
      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t px-4 py-6 text-xs text-muted-foreground sm:px-8">
        <span>{STORE_NAME}</span>
        <span>Venda de bebidas e produtos de tabacaria somente para maiores de 18 anos.</span>
        <Button asChild variant="link" size="sm">
          <Link to="/painel">
            Área da loja <ArrowUpRight />
          </Link>
        </Button>
      </footer>

      {count > 0 && !open && (
        <Button
          onClick={() => setOpen(true)}
          className="fixed inset-x-4 bottom-4 z-20 h-14 flex items-center justify-between rounded-2xl bg-primary px-5 py-4 text-primary-foreground shadow-soft lg:hidden"
        >
          <span>
            {count} {count === 1 ? "item" : "itens"} · Ver carrinho
          </span>
          <span className="font-semibold">{brl(total)}</span>
        </Button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-md">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <SheetTitle className="font-display text-xl font-semibold">Seu pedido</SheetTitle>
              <SheetDescription>
                {count} {count === 1 ? "item" : "itens"} no carrinho
              </SheetDescription>
            </div>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {items.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">Seu carrinho está vazio.</p>
            ) : (
              <ul className="space-y-3">
                {items.map((i) => (
                  <li key={i.key} className="flex items-center gap-3">
                    {i.product.image ? (
                      <img
                        src={i.product.image}
                        alt={i.product.name}
                        loading="lazy"
                        decoding="async"
                        className="h-12 w-12 shrink-0 rounded-lg object-contain"
                      />
                    ) : (
                      <span className="text-3xl">{i.product.emoji}</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{i.product.name}</p>
                      {i.option && (
                        <p className="truncate text-xs font-medium text-primary">
                          {i.product.optionLabel}: {i.option}
                        </p>
                      )}
                      {i.components && <p className="mt-1 break-words text-xs text-primary">{comboSummary(i.components, products, i.product)}</p>}
                      <p className="text-xs text-muted-foreground">
                        {brl(i.product.price)} · subtotal {brl(i.product.price * i.qty)}
                      </p>
                      {!available(i.product, i.option, i.qty) && <p className="mt-1 text-xs text-destructive">Indisponível: remova ou ajuste a quantidade.</p>}
                    </div>
                    <Qty
                      qty={i.qty}
                      onMinus={() => change(i.key, -1)}
                      onPlus={() => change(i.key, 1)}
                    />
                  </li>
                ))}
              </ul>
            )}

            <div className="space-y-3 border-t pt-4">
              <Field label="Seu nome *">
                <input
                  className="field"
                  required
                  autoComplete="name"
                  aria-invalid={Boolean(fieldErrors.name?.length)}
                  aria-describedby={fieldErrors.name?.length ? "name-error" : undefined}
                  value={form.name}
                  maxLength={80}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              {fieldErrors.name?.[0] && <p id="name-error" role="alert" className="text-xs text-destructive">{fieldErrors.name[0]}</p>}
              <PhoneField
                value={form.phone}
                submitted={submitted}
                onChange={(phone) => setForm({ ...form, phone })}
              />
              <div role="group" aria-label="Recebimento do pedido" className="grid grid-cols-2 gap-2">
                <Button variant={isDelivery ? "default" : "outline"} aria-pressed={isDelivery} onClick={() => { setForm({ ...form, fulfillment: "delivery" }); setError(""); }}><Truck />Entrega</Button>
                <Button variant={!isDelivery ? "default" : "outline"} aria-pressed={!isDelivery} onClick={() => { setForm({ ...form, fulfillment: "pickup" }); setError(""); }}><Store />Retirada na loja</Button>
              </div>
              {isDelivery && (
                <fieldset className="space-y-2" aria-label="Endereço de entrega">
                  <legend className="text-sm">Endereço de entrega *</legend>
                  <div role="group" aria-label="Rua e número" className="grid grid-cols-[1fr_88px] gap-2">
                    <label className="relative block text-sm">Rua
                      <input
                        className="field mt-1"
                        required
                        maxLength={120}
                        aria-invalid={Boolean(fieldErrors.address?.length)}
                        aria-expanded={suggestionsOpen}
                        aria-controls="address-suggestions"
                        aria-autocomplete="list"
                        autoComplete="off"
                        placeholder="Rua ou Avenida"
                        value={form.street}
                        onChange={(e) => setForm({ ...form, street: e.target.value })}
                        onFocus={() => { if (suggestions.length) setSuggestionsOpen(true); }}
                        onBlur={() => setTimeout(() => setSuggestionsOpen(false), 200)}
                      />
                      {suggestionsOpen && (
                        <ul
                          id="address-suggestions"
                          role="listbox"
                          aria-label="Sugestões de endereço em Araçatuba"
                          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border bg-card shadow-lg"
                        >
                          {suggestions.map((suggestion) => (
                            <li key={suggestion.placeId}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={false}
                                className="block w-full break-words px-3 py-2.5 text-left text-sm hover:bg-secondary"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => pickSuggestion(suggestion)}
                              >
                                {suggestion.text}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </label>
                    <label className="block text-sm">Número
                      <input
                        className="field mt-1 text-center"
                        required
                        inputMode="numeric"
                        maxLength={10}
                        aria-invalid={Boolean(fieldErrors.address?.length)}
                        placeholder="Nº"
                        value={form.number}
                        onChange={(e) => setForm({ ...form, number: e.target.value })}
                        onBlur={() => { void calculateDelivery(); }}
                      />
                    </label>
                  </div>
                  <label className="block text-sm">Bairro
                    <input
                      className="field mt-1"
                      maxLength={80}
                      placeholder="Preenchido pelo número"
                      value={form.neighborhood}
                      onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                      onBlur={() => { void calculateDelivery(); }}
                    />
                  </label>
                </fieldset>
              )}
              {isDelivery && <label className="block text-sm">Cidade<input className="field mt-2" value={DELIVERY_CITY} readOnly /></label>}
              {!isDelivery && settings.pickup_address && (
                <div className="border-l-2 border-primary py-2 pl-3 text-sm" role="status">
                  <p className="font-semibold">Endereço para retirada</p>
                  <p className="mt-1 text-muted-foreground">{settings.pickup_address}</p>
                </div>
              )}
              {isDelivery && fieldErrors.address?.[0] && <p id="address-error" className="text-xs text-destructive">{fieldErrors.address[0]}</p>}
              {isDelivery && distanceMode && <div className="space-y-2"><Button variant="outline" disabled={quoting || !addressComplete || fullAddress.trim().length < 8 || Boolean(validQuote)} onClick={calculateDelivery}><Truck />{quoting ? "Calculando…" : validQuote ? "Entrega calculada" : "Calcular entrega"}</Button>{validQuote && <p role="status" className="text-sm font-semibold text-primary">Taxa de entrega: {brl(validQuote.fee)} · {validQuote.km.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} km pela rota</p>}{deliveryError && <p role="alert" className="text-sm text-destructive">{deliveryError}</p>}</div>}
              {isDelivery && settings.delivery_enabled && !distanceMode && settings.fixed_delivery_fee === null && (
                <Field label="Bairro ou região">
                  <select
                    className="field"
                    value={form.zone}
                    onChange={(e) => setForm({ ...form, zone: e.target.value })}
                  >
                    <option value="">Selecione sua região</option>
                    {settings.delivery_zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} · {brl(z.fee)}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Forma de pagamento">
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Forma de pagamento" aria-describedby={fieldErrors.payment?.length ? "payment-error" : undefined}>
                  {PAYMENT_METHODS.map((m) => (
                    <Button
                      variant="outline"
                      key={m}
                      type="button"
                      aria-pressed={form.payment === m}
                      onClick={() => setForm({ ...form, payment: m })}
                      className={`rounded-xl border px-3 py-2 text-sm ${form.payment === m ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}
                    >
                      {m}
                    </Button>
                  ))}
                </div>
              </Field>
              {fieldErrors.payment?.[0] && <p id="payment-error" className="text-xs text-destructive">{fieldErrors.payment[0]}</p>}
              {form.payment === "Pix" &&
                (displayedTotal > 0 ? (
                  <div className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">Pague com Pix — {brl(displayedTotal)}</p>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        valor no QR
                      </span>
                    </div>
                    <div className="flex justify-center rounded-xl bg-photo text-photo-foreground p-3">
                      <QRCodeSVG value={pixPayload} size={172} level="M" marginSize={2} />
                    </div>
                    <p className="text-center text-xs text-muted-foreground">
                      Abra o app do seu banco, escaneie o código e confirme o pagamento.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => copy(PIX_KEY, "chave")}
                        className="rounded-xl border border-primary/40 bg-card px-3 py-2 text-sm"
                      >
                        {copied === "chave" ? "Chave copiada!" : "Copiar chave"}
                      </Button>
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => copy(pixPayload, "codigo")}
                        className="rounded-xl border border-primary/40 bg-card px-3 py-2 text-sm"
                      >
                        {copied === "codigo" ? "Código copiado!" : "Pix copia e cola"}
                      </Button>
                    </div>
                    <p className="text-center text-xs text-muted-foreground">
                      Chave: <span className="font-medium text-foreground">{PIX_KEY}</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Adicione produtos ao carrinho para gerar o QR Code do Pix com o valor do pedido.
                  </p>
                ))}
              {form.payment === "Dinheiro" && (
                <Field label="Troco para quanto?">
                  <input
                    className="field"
                    maxLength={30}
                    placeholder="Ex: R$ 100"
                    value={form.change}
                    onChange={(e) => setForm({ ...form, change: e.target.value })}
                  />
                </Field>
              )}
              <Field label="Observações (opcional)">
                <input
                  className="field"
                  maxLength={300}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </Field>
            </div>
          </div>
          <div className="space-y-3 border-t px-5 py-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Produtos</span>
              <span>{brl(displayedSubtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{isDelivery ? "Entrega" : "Retirada na loja"}</span>
              <span>
                {!isDelivery ? "Sem taxa" : settings.delivery_enabled
                  ? distanceMode ? validQuote || receipt && !items.length ? brl(displayedDeliveryFee) : quoting ? "Calculando…" : "A calcular" : settings.fixed_delivery_fee !== null || zone
                    ? brl(displayedDeliveryFee)
                    : "Selecione a região"
                  : "A confirmar"}
              </span>
            </div>
            <div className="flex justify-between text-lg">
              <span>{isDelivery && distanceMode && !validQuote && items.length ? "Total dos produtos" : "Total"}</span>
              <span className="font-display font-semibold">{brl(displayedTotal)}</span>
            </div>
            {status.configured && !status.open && (
              <p className="text-xs text-destructive">
                Loja fechada no momento. Confira os horários de atendimento.
              </p>
            )}
            {receipt && (
              <div role="status" className="space-y-2 text-sm text-primary">
                <p>Pedido #{receipt.number} recebido pela loja.</p>
                <Button asChild variant="outline" className="w-full">
                  <a href={receipt.url} target="_blank" rel="noopener noreferrer">
                    <MessageCircle />
                    Abrir pedido no WhatsApp
                  </a>
                </Button>
                {receipt.delivery && tracking.data?.trackingUrl && (
                  <Button asChild className="w-full">
                    <a href={tracking.data.trackingUrl} target="_blank" rel="noopener noreferrer">
                      <Navigation />
                      Acompanhar entrega em tempo real
                    </a>
                  </Button>
                )}
                {receipt.delivery && tracking.data && !tracking.data.trackingUrl && tracking.data.status === "out_for_delivery" && (
                  <p className="text-muted-foreground">Seu pedido saiu para entrega!</p>
                )}
              </div>
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button
              disabled={!online || sending || !items.length || (status.configured && !status.open)}
              onClick={send}
              className="h-12 w-full rounded-lg bg-whatsapp py-4 font-semibold text-whatsapp-foreground"
            >
              <MessageCircle /> {!online ? "Conecte-se para enviar" : sending ? "Registrando pedido…" : "Enviar pedido pelo WhatsApp"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      {building && <ComboBuilder key={building.id} product={building} products={products} open onOpenChange={value => { if (!value) setBuilding(null); }} onAdd={selections => { const key = keyOf(building.id, comboOption(selections)); const next = { ...cart, [key]: (cart[key] ?? 0) + 1 }; validateCartAvailability(cartInputs(next), products); setCart(next); setBuilding(null); }} />}
    </div>
  );
}

function ProductCard({
  p,
  cart,
  sel,
  typed,
  onSel,
  onTyped,
  onChange,
  onBuild,
}: {
  p: CatalogProduct;
  cart: Cart;
  sel: Record<string, string>;
  typed: Record<string, string>;
  onSel: (id: string, v: string) => void;
  onTyped: (id: string, v: string) => void;
  onChange: (key: string, d: number) => void;
  onBuild: () => void;
}) {
  const hasOpts = Boolean(p.options?.length);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [addQty, setAddQty] = useState(1);
  const chosen = sel[p.id] ?? "";
  const isOther = chosen === OTHER;
  const text = (typed[p.id] ?? "").trim();
  const option = hasOpts ? (isOther ? text : chosen) : "";
  const key = keyOf(p.id, option || undefined);
  const qty = cart[key] ?? 0;
  const ready = (!hasOpts || (isOther ? !!text : !!chosen)) && available(p, option);
  const outOfStock = p.active && p.stock === 0;
  const optionOut = hasOpts && !!option && !available(p, option);

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-lg bg-card">
      <ProductCardPhotos product={p} option={option} onEnlarge={() => setGalleryOpen(true)} />
      <div className="flex min-w-0 flex-1 flex-col px-1 py-3 sm:px-2">
        <span className="truncate text-[10px] uppercase text-muted-foreground">{p.category}</span>
        <h2 className="mt-1 font-display text-sm font-semibold leading-snug sm:text-base"><Button variant="link" onClick={() => setGalleryOpen(true)} className="h-auto w-full justify-start whitespace-normal break-words p-0 text-left text-sm text-foreground sm:text-base">{p.name}</Button></h2>
        {!available(p) && <p className="mt-2 inline-flex w-fit rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">{p.active ? "Esgotado" : "Indisponível"}</p>}
        {hasOpts ? (
          <div className="mt-2">
            <p className="text-[11px] font-medium uppercase text-muted-foreground">
              {p.optionLabel}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {p.options?.map((o) => (
                <Button
                  variant="ghost"
                  size="sm"
                  key={o}
                  type="button"
                  disabled={!available(p, o)}
                  onClick={() => onSel(p.id, o)}
                  aria-pressed={chosen === o}
                  className={`h-auto min-h-7 whitespace-normal rounded-md border px-2.5 py-1 text-xs transition ${
                    chosen === o
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:border-primary"
                  }`}
                >
                  {o}
                </Button>
              ))}
              {p.allowOther && <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => onSel(p.id, OTHER)}
                aria-pressed={isOther}
                className={`h-auto min-h-7 rounded-md border border-dashed px-2.5 py-1 text-xs transition ${
                  isOther
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground"
                }`}
              >
                Outro
              </Button>}
            </div>
            {isOther && (
              <input
                className="field mt-2"
                placeholder={`Qual ${p.optionLabel === "Cor" ? "cor" : "sabor"}?`}
                maxLength={40}
                value={typed[p.id] ?? ""}
                onChange={(e) => onTyped(p.id, e.target.value)}
              />
            )}
          </div>
        ) : (
          p.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
          )
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <span className="text-base font-bold text-primary sm:text-lg">{brl(p.price)}</span>
          {p.comboGroups?.length ? <Button disabled={!available(p)} onClick={onBuild} className="h-9 px-2 text-xs"><Plus />Montar combo</Button> : null}
        </div>
        {!p.comboGroups?.length && (
          <div className="flex flex-col items-stretch gap-2 pt-3">
            {outOfStock ? (
              <Button
                disabled
                aria-label={`${p.name} esgotado`}
                className="h-11 w-full rounded-full text-base font-bold tracking-wide"
              >
                Esgotado
              </Button>
            ) : qty > 0 ? (
              <div className="mx-auto flex shrink-0 items-center rounded-full border bg-card">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  aria-label="Diminuir quantidade"
                  onClick={() => onChange(key, -1)}
                >
                  <Minus />
                </Button>
                <span className="w-8 text-center text-base font-semibold" aria-label="Quantidade no carrinho">{qty}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  aria-label="Aumentar quantidade"
                  disabled={p.stock !== null && qty >= p.stock}
                  onClick={() => onChange(key, 1)}
                >
                  <Plus />
                </Button>
              </div>
            ) : (
              <>
                <div className="mx-auto flex shrink-0 items-center rounded-full border bg-card">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Diminuir quantidade"
                    disabled={addQty <= 1}
                    onClick={() => setAddQty(q => Math.max(1, q - 1))}
                  >
                    <Minus />
                  </Button>
                  <span className="w-6 text-center text-sm font-semibold" aria-label="Quantidade a adicionar">{addQty}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Aumentar quantidade"
                    onClick={() => setAddQty(q => Math.min(99, q + 1))}
                  >
                    <Plus />
                  </Button>
                </div>
                <Button
                  onClick={() => onChange(key, addQty)}
                  disabled={!ready}
                  aria-label={`Adicionar ${addQty} ${addQty > 1 ? "unidades" : "unidade"} de ${p.name}`}
                  title={`Adicionar ${p.name}`}
                  className="h-11 w-full rounded-full bg-primary text-base font-bold tracking-wide text-primary-foreground shadow-md transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Adicionar
                </Button>
              </>
            )}
          </div>
        )}
        {hasOpts && !ready && !outOfStock && (
          <p className={`pt-1 text-right text-[11px] ${optionOut ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
            {optionOut ? "Esgotado" : `Escolha ${p.optionLabel === "Cor" ? "uma cor" : "um sabor"} para adicionar`}
          </p>
        )}
      </div>
      <ProductGallery product={p} open={galleryOpen} onOpenChange={setGalleryOpen} />
    </article>
  );
}

function Qty({ qty, onMinus, onPlus }: { qty: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <div className="flex shrink-0 items-center rounded-full border bg-card">
      <Button
        onClick={onMinus}
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label="Diminuir"
      >
        <Minus />
      </Button>
      <span className="w-6 text-center text-sm font-semibold">{qty}</span>
      <Button
        onClick={onPlus}
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label="Aumentar"
      >
        <Plus />
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  const control =
    isValidElement<{ id?: string }>(children) &&
    typeof children.type === "string" &&
    ["input", "textarea", "select"].includes(children.type)
      ? children
      : null;
  return (
    <div className="block">
      {control ? (
        <label htmlFor={id} className="mb-1 block text-sm font-medium">
          {label}
        </label>
      ) : (
        <span className="mb-1 block text-sm font-medium">{label}</span>
      )}
      {control ? cloneElement(control, { id }) : children}
    </div>
  );
}
