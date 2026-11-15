import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { cloneElement, isValidElement, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Truck,
  Store,
  Clock,
  X,
  MessageCircle,
  ChevronRight,
  Star,
  Navigation,
  Heart,
  Share2,
  RotateCcw,
  QrCode,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { publicStoreSettingsQuery as storeSettingsQuery } from "@/lib/store-settings.query";
import { appearanceCss, appearanceFontsHref, isLightColor, parseAppearance } from "@/lib/catalog-appearance";
import { savePublicSnapshot, readPublicSnapshot, cacheViewedCatalogPhotos, offlinePhotoUrls } from "@/lib/offline-catalog";
import { ordersOpen, storeStatus, upcomingSpecialDays, DAYS, nextOpening, deliveryFeeFrom } from "@/lib/store-settings";
import { checkoutStage } from "@/lib/catalog-analytics";
import { QRCodeSVG } from "qrcode.react";
import { useServerFn } from "@tanstack/react-start";
import { PhoneField } from "@/components/orders/phone-field";
import { useCatalogAnalytics } from "@/lib/use-catalog-analytics";
import { readAnalyticsIdentity } from "@/lib/catalog-analytics";
import { customerSchema, submitOrderSchema, validateCartAvailability } from "@/lib/orders";
import { submitOrder, orderTracking } from "@/lib/orders.functions";
import { startDeliverySession, quoteDelivery, suggestDeliveryAddress, locateDeliveryAddress } from "@/lib/delivery.functions";
import { estimatedDeliveryMinutes } from "@/lib/delivery-route";
import { DELIVERY_CITY, deliveryAddress, deliveryFieldsComplete, joinAddressLine, restoreDeliveryFields, splitAddressLine, getSavedCustomerAddress, saveCustomerAddress, type SavedCustomerAddress } from "@/lib/delivery-address";
import { MapPin, Menu, ArrowLeft, ArrowRight, ShoppingCart, Home, LayoutGrid, ClipboardList, MoreHorizontal, ShieldCheck, Headphones, Flame, Wallet, Trash2, Gem, CheckCircle2, Instagram } from "lucide-react";
import { categoryIcon, categoryImage } from "@/components/catalog/category-icon";
import heroImg from "@/assets/hero-narguile.jpg";
import { pairSuggestions } from "@/lib/pair-suggestions";
import { ProductTile } from "@/components/catalog/product-tile";
import { ProductDetail } from "@/components/catalog/product-detail";
import { keyOf, SEP, type Cart } from "@/components/catalog/cart-keys";
import { catalogQuery, useCatalogUpdates } from "@/lib/catalog.query";
import { available, discountPercent, itemPhoto, productPhotos, visibleProducts, type CatalogProduct } from "@/lib/catalog";
import { ProductGallery } from "@/components/products/product-gallery";
import { ProductCardPhotos } from "@/components/products/product-card-photos";
import { ComboBuilder } from "@/components/products/combo-builder";
import { OrderTrackingStatus } from "@/components/orders/order-tracking-modal";
import { comboOption, parseComboOption, comboSummary, type ComboSelection } from "@/lib/combos";
import {
  PAYMENT_METHODS,
  STORE_NAME,
  WHATSAPP_NUMBER,
  INSTAGRAM_URL,
  brl,
} from "@/lib/products";
import { PIX_KEY, buildPixPayload, copyToClipboard } from "@/lib/pix";
import { checkoutWhatsApp, productMessage, insertCouponLine } from "@/lib/order-message";
import { applyCoupon } from "@/lib/store-settings";
import { matchesSearch } from "@/lib/product-search";

export const Route = createFileRoute("/")({
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(storeSettingsQuery), context.queryClient.ensureQueryData(catalogQuery)]),
  staticData: { sitemap: true },
  validateSearch: (search: Record<string, unknown>): { aba?: Exclude<Tab, "inicio">; produto?: string; categoria?: string } => ({
    ...(typeof search["categoria"] === "string" ? { categoria: search["categoria"].slice(0, 120) } : {}),
    ...(typeof search["aba"] === "string" && TABS.includes(search["aba"] as Tab) && search["aba"] !== "inicio" ? { aba: search["aba"] as Exclude<Tab, "inicio"> } : {}),
    ...(typeof search["produto"] === "string" ? { produto: search["produto"] } : {}),
  }),
  head: ({ loaderData }) => {
    const title = "S7VEN Lounge e Tabacaria em Araçatuba — Catálogo Digital";
    const description = "Essências, narguilés, pods e bebidas em Araçatuba, SP. Escolha no catálogo e peça pelo WhatsApp, com entrega de moto ou retirada.";
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

type Line = { product: CatalogProduct; key: string; qty: number; option: string; components: ComboSelection[] | undefined };

const KEY = "catalogo-carrinho";
const FEATURED = "__destaques__";
const FAVORITES = "__favoritos__";
const PROMOS = "__promocoes__";
type Tab = "inicio" | "categorias" | "pedidos" | "mais";
const TABS: Tab[] = ["inicio", "categorias", "pedidos", "mais"];

function Catalog() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const tab: Tab = search.aba ?? "inicio";
  const { data: catalogProducts } = useSuspenseQuery(catalogQuery);
  const [online, setOnline] = useState(true);
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map());
  const products = useMemo<CatalogProduct[]>(() => online ? catalogProducts : catalogProducts.map(product => ({ ...product, ...(product.image ? { image: photoUrls.get(product.image) ?? product.image } : {}), ...(product.images ? { images: product.images.map(url => photoUrls.get(url) ?? url) } : {}) })), [catalogProducts, online, photoUrls]);
  useCatalogUpdates();
  // Paused products never appear to customers; `products` stays complete for saved-cart checks.
  const shown = useMemo(() => visibleProducts(products), [products]);
  const categories = ["Todos", ...new Set(shown.map(p => p.category))];
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
  const locateAddress = useServerFn(locateDeliveryAddress);
  const [locating, setLocating] = useState(false);
  const [deliveryQuote, setDeliveryQuote] = useState<{ id: string; address: string; km: number; fee: number; routeDurationSeconds: number; expires: number; config: string } | null>(null);
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
  const [receipt, setReceipt] = useState<{ scheduledLabel?: string | null; id: string; requestId: string; number: number; purchase: number | null; url: string; subtotal: number; deliveryFee: number; total: number; delivery: boolean; itemCount: number } | null>(null);
  const trackOrder = useServerFn(orderTracking);
  const tracking = useQuery({
    queryKey: ["order-tracking", receipt?.id],
    queryFn: () => {
      if (!receipt) throw new Error("Pedido não encontrado.");
      return trackOrder({ data: { id: receipt.id, requestId: receipt.requestId } });
    },
    enabled: Boolean(receipt),
    refetchInterval: (q) => (["delivered", "cancelled"].includes(q.state.data?.status ?? "") ? false : 30000),
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
  const orderStatus = now ? ordersOpen(settings, now) : { open: true, delivery: true, configured: false, reason: null, closesAt: null };
  const orderingBlocked = orderStatus.configured && !orderStatus.open;
  /** Depois do horário das entregas: ainda dá para pedir, mas só para retirar até a loja fechar. */
  const pickupOnly = orderStatus.open && !orderStatus.delivery;
  const pickupUntil = orderStatus.closesAt ? ` até ${orderStatus.closesAt}` : "";
  const [hoursOpen, setHoursOpen] = useState(false);
  const [sort, setSort] = useState("catalog");
  const [cart, setCart] = useState<Cart>({});
  const [loaded, setLoaded] = useState(false);
  const [closedWarn, setClosedWarn] = useState<"hidden" | "show" | "done">("hidden");
  const [sendTapped, setSendTapped] = useState(false);
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

  // Detecta endereço salvo anteriormente ao abrir o carrinho
  useEffect(() => {
    if (open) {
      const found = getSavedCustomerAddress();
      if (found) {
        setSavedAddress(found);
        setForm(f => ({
          ...f,
          name: f.name || found.name || "",
          phone: f.phone || found.phone || "",
          street: f.street || found.street,
          number: f.number || found.number,
          neighborhood: f.neighborhood || found.neighborhood || "",
        }));
        setAddressLine(prev => prev || joinAddressLine(found.street, found.number));
        setUseSavedAddress(true);
      }
    }
  }, [open]);

  const fullAddress = [form.street.trim(), form.number.trim(), form.neighborhood.trim()].filter(Boolean).join(", ");
  const addressComplete = deliveryFieldsComplete(form.street, form.number);
  const hasCartItems = Object.values(cart).some(qty => qty > 0);
  useCatalogAnalytics(loaded, hasCartItems, checkoutStage({
    hasCart: hasCartItems,
    deliveryReady: form.fulfillment === "pickup" ? !!form.name.trim() : addressComplete,
    paymentChosen: !!form.payment,
    sendTapped,
  }));
  const reopensAt = now ? nextOpening(settings, now) : null;
  const feeFrom = deliveryFeeFrom(settings);
  /** Closed (not paused) with known hours: the order is scheduled for the next opening instead of blocked. */
  const canSchedule = orderingBlocked && orderStatus.reason === "closed" && !!reopensAt;
  // Warn once, the moment a customer starts a cart while orders are closed, instead of only at checkout.
  useEffect(() => { if (hasCartItems && orderingBlocked) setClosedWarn(w => w === "hidden" ? "show" : w); }, [hasCartItems, orderingBlocked]);
  const [error, setError] = useState("");
  const [sel, setSel] = useState<Record<string, string>>({});
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState("");
  const [showPixQr, setShowPixQr] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [building, setBuilding] = useState<CatalogProduct | null>(null);
  const [detail, setDetail] = useState<CatalogProduct | null>(null);
  const closeDetail = () => {
    setDetail(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has("produto")) { url.searchParams.delete("produto"); window.history.replaceState(window.history.state, "", url.href); }
  };
  const [qrModalProduct, setQrModalProduct] = useState<CatalogProduct | null>(null);
  const [savedAddress, setSavedAddress] = useState<SavedCustomerAddress | null>(null);
  const [useSavedAddress, setUseSavedAddress] = useState(true);
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("s7ven-favorites") || "[]"); } catch { return []; }
  });
  const [orderHistory, setOrderHistory] = useState<any[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("s7ven-order-history") || "[]"); } catch { return []; }
  });
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [filterFavorites, setFilterFavorites] = useState(false);

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => {
      const next = prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId];
      try { localStorage.setItem("s7ven-favorites", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  useEffect(() => {
    const id = new URL(window.location.href).searchParams.get("produto");
    if (id) setDetail(shown.find(p => p.id === id) ?? null);
  }, [shown]);
  // Direct category links (?categoria=...) from Stories open that category once.
  useEffect(() => {
    const wanted = search.categoria;
    if (!wanted) return;
    const match = shown.find(p => p.category === wanted || p.category.replace("Narguiles > ", "") === wanted);
    if (match) { setCat(match.category); setQuery(""); }
    void navigate({ to: "/", search: { aba: "categorias" }, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.categoria, shown.length]);
  const featured = shown.filter(p => p.featured && available(p));
  const promos = shown.filter(p => discountPercent(p) !== null && available(p));
  const highlights = [...promos, ...featured.filter(p => discountPercent(p) === null)];
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
    const q = query.trim();
    // Typing searches the whole catalog, never only the open category.
    const list = shown.filter(
      (p) =>
        (q ? matchesSearch(p, q) : (cat === "Todos" || p.category === cat || (cat === FEATURED && (p.featured || discountPercent(p) !== null)) || (cat === PROMOS && discountPercent(p) !== null) || (cat === FAVORITES && favorites.includes(p.id)))),
    );
    if (sort === "low") list.sort((a, b) => a.price - b.price);
    if (sort === "high") list.sort((a, b) => b.price - a.price);
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
   }, [query, cat, sort, shown, favorites]);
  const allProducts = useMemo(() => {
    const list = [...shown];
    if (sort === "low") list.sort((a, b) => a.price - b.price);
    if (sort === "high") list.sort((a, b) => b.price - a.price);
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [sort, shown]);

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
  const pairs = useMemo(() => pairSuggestions(items.map((i) => i.product), shown), [items, shown]);
  const subtotal = items.reduce((s, i) => s + i.qty * i.product.price, 0);
  const zone = settings.delivery_zones.find((z) => z.id === form.zone);
  const isDelivery = form.fulfillment === "delivery";
  // Entregas encerradas: muda o carrinho para retirada automaticamente.
  useEffect(() => {
    if (pickupOnly && form.fulfillment === "delivery") setForm(f => ({ ...f, fulfillment: "pickup" }));
  }, [pickupOnly, form.fulfillment]);
  const distanceMode = settings.delivery_enabled && settings.delivery_distance_enabled;
  const distanceConfig = JSON.stringify([settings.delivery_origin, settings.delivery_distance_tiers]);
  const validQuote = deliveryQuote?.address === deliveryAddress(fullAddress) && deliveryQuote.config === distanceConfig && deliveryQuote.expires > (now?.getTime() ?? 0) ? deliveryQuote : null;
  const deliveryEstimate = estimatedDeliveryMinutes(validQuote?.routeDurationSeconds);
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
  // Preenche o endereço com a localização em tempo real do cliente (GPS do aparelho).
  const useMyLocation = () => {
    if (locating) return;
    setDeliveryError("");
    if (!navigator.onLine) return setDeliveryError("Conecte-se à internet para usar sua localização.");
    if (!("geolocation" in navigator)) return setDeliveryError("Este aparelho não permite usar a localização. Digite a rua e o número.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const freshToken = async () => (deliveryToken.current = (await startDistanceSession()).token);
          const token = deliveryToken.current || await freshToken();
          let found;
          try {
            found = await locateAddress({ data: { latitude: position.coords.latitude, longitude: position.coords.longitude, token } });
          } catch (e) {
            if (!(e instanceof Error) || e.message !== "DELIVERY_SESSION_EXPIRED") throw e;
            found = await locateAddress({ data: { latitude: position.coords.latitude, longitude: position.coords.longitude, token: await freshToken() } });
          }
          setUseSavedAddress(false);
          autoQuote.current = true;
          setAddressLine(joinAddressLine(found.street, found.number));
          setForm(f => ({ ...f, street: found.street, number: found.number, neighborhood: found.neighborhood || f.neighborhood }));
          if (!found.number) setDeliveryError("Confirme o número do seu endereço para calcular a entrega.");
        } catch (e) {
          setDeliveryError(e instanceof Error ? e.message : "Não foi possível usar sua localização. Digite a rua e o número.");
        } finally {
          setLocating(false);
        }
      },
      (geoError) => {
        setLocating(false);
        setDeliveryError(
          geoError.code === geoError.PERMISSION_DENIED
            ? "Permita o acesso à localização no navegador ou digite a rua e o número."
            : "Não conseguimos obter sua localização. Digite a rua e o número.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };
  // Ao escolher uma sugestão, a taxa de entrega é calculada sozinha.
  useEffect(() => {
    if (!autoQuote.current) return;
    autoQuote.current = false;
    if (isDelivery && distanceMode && addressComplete) void calculateDelivery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullAddress]);
  // Ao terminar de digitar rua e número, a entrega é calculada sozinha (sem precisar tocar no botão).
  useEffect(() => {
    if (!isDelivery || !distanceMode || !addressComplete || validQuote || !online) return;
    const timer = setTimeout(() => void calculateDelivery(), 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullAddress, isDelivery, distanceMode, addressComplete, online]);
  const couponResult = appliedCoupon ? applyCoupon(settings, appliedCoupon.code, subtotal) : null;
  const couponDiscount = couponResult?.discount ?? 0;
  const total = Math.round((subtotal + deliveryFee - couponDiscount) * 100) / 100;

  const displayedSubtotal = !items.length && receipt ? receipt.subtotal : subtotal;
  const displayedDeliveryFee = !items.length && receipt ? receipt.deliveryFee : deliveryFee;
  const displayedCouponDiscount = !items.length && receipt ? 0 : couponDiscount;
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
    setSendTapped(true);
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
    if (orderingBlocked && !canSchedule)
      return setError(orderStatus.reason === "paused" ? "A loja pausou os pedidos por alguns instantes. Tente novamente mais tarde." : "A loja está fechada. Confira os horários de atendimento.");
    if (isDelivery && pickupOnly)
      return setError(`As entregas de hoje encerraram às ${settings.order_cutoff}. Escolha retirada na loja${pickupUntil}.`);
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
      `*Total${!isDelivery || settings.delivery_enabled ? "" : " dos produtos"}: ${brl(subtotal + deliveryFee)}*`,
      ...(couponResult && appliedCoupon ? [`*Cupom ${appliedCoupon.code} (${couponResult.label}): −${brl(couponResult.discount)}*`, `*Total com desconto: ${brl(total)}*`] : []),
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
    // Scheduled orders reach the store by themselves when it opens; no WhatsApp tab needed now.
    const popup = canSchedule ? null : window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    try {
      const saved = await registerOrder({ data: validated.data });
      const url = checkoutWhatsApp(saved.purchase, lines, d.phone, couponResult && appliedCoupon ? { code: appliedCoupon.code, discount: couponResult.discount } : null);
      setReceipt({ scheduledLabel: saved.scheduledLabel ?? null, id: saved.id, requestId, number: saved.number, purchase: saved.purchase ?? null, url, subtotal, deliveryFee, total, delivery: isDelivery, itemCount: count });
      if (isDelivery && form.street && form.number) {
        saveCustomerAddress({ name: d.name, phone: d.phone, street: form.street, number: form.number, neighborhood: form.neighborhood });
      }
      try {
        const historyEntry = { id: saved.id, number: saved.number, purchase: saved.purchase ?? null, date: new Date().toISOString(), total, items: inputItems, summary: items.map(i => `${i.qty}x ${i.product.name}`).join(", ") };
        const updatedHistory = [historyEntry, ...orderHistory.slice(0, 19)];
        setOrderHistory(updatedHistory);
        localStorage.setItem("s7ven-order-history", JSON.stringify(updatedHistory));
      } catch {}
      setCart({});
      setAttempt(null);
      setAppliedCoupon(null);
      setCouponInput("");
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

  const goTab = (next: Tab) => {
    void navigate({ to: "/", search: next === "inicio" ? {} : { aba: next }, resetScroll: true });
  };
  const openCategory = (value: string) => {
    setCat(value);
    setQuery("");
    goTab("categorias");
  };
  const searching = query.trim().length > 0;
  const categoryCards = categories.filter((c) => c !== "Todos").map((c) => {
    const list = shown.filter((p) => p.category === c);
    const cover = list.map((p) => productPhotos(p)[0]).find(Boolean);
    return { value: c, label: c.replace("Narguiles > ", ""), count: list.length, cover };
  });
  const categoryTitle = cat === FEATURED ? "Promoções e destaques" : cat === PROMOS ? "Promoções" : cat === FAVORITES ? "Favoritos" : cat === "Todos" ? "Todos os produtos" : cat.replace("Narguiles > ", "");
  const tile = (p: CatalogProduct) => (
    <ProductTile key={p.id} p={p} cart={cart} sel={sel} onSel={(id, v) => setSel((x) => ({ ...x, [id]: v }))} onOpen={() => setDetail(p)} onChange={change} onBuild={() => setBuilding(p)} />
  );
  const productGrid = (list: CatalogProduct[]) => (
    <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {list.length === 0 && (
        <div className="col-span-full py-14 text-center">
          <Search className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p>Nenhum produto encontrado.</p>
          <Button variant="link" onClick={() => { setQuery(""); setCat("Todos"); }}>Limpar filtros</Button>
        </div>
      )}
      {list.map(tile)}
    </div>
  );
  const sortSelect = (
    <select aria-label="Ordenar produtos" value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-md border bg-card px-3 py-2 text-xs">
      <option value="catalog">Ordem do catálogo</option>
      <option value="low">Menor preço</option>
      <option value="high">Maior preço</option>
      <option value="name">Nome: A–Z</option>
    </select>
  );
  const hoursList = settings.hours_enabled ? (
    <div className="grid gap-1.5 text-sm sm:grid-cols-2">
      {settings.opening_hours.map((h) => (
        <p key={h.day} className="flex justify-between gap-4">
          <span className="text-muted-foreground">{DAYS[h.day]}</span>
          <span>{h.enabled ? `${h.open} – ${h.close}${h.open > h.close ? " (+1 dia)" : ""}` : "Fechado"}</span>
        </p>
      ))}
      {(now ? upcomingSpecialDays(settings, now) : []).map((d) => (
        <p key={d.date} className="flex justify-between gap-4 font-medium text-primary sm:col-span-2">
          <span>{d.label || "Data especial"} · {d.date.slice(8, 10)}/{d.date.slice(5, 7)}</span>
          <span>{d.enabled ? `${d.open} – ${d.close}${d.open > d.close ? " (+1 dia)" : ""}` : "Fechado"}</span>
        </p>
      ))}
    </div>
  ) : (
    <p className="text-sm text-muted-foreground">Confirme os horários pelo WhatsApp.</p>
  );
  const look = parseAppearance(settings.catalog_appearance);
  const navItems: { id: Tab; label: string; icon: typeof Home }[] = [
    { id: "inicio", label: "Início", icon: Home },
    { id: "categorias", label: "Categorias", icon: LayoutGrid },
    { id: "pedidos", label: "Pedidos", icon: ClipboardList },
    { id: "mais", label: "Mais", icon: MoreHorizontal },
  ];

  return (
    <div className="catalog-theme min-h-screen bg-background pb-36 text-foreground md:pb-10">
      <style>{appearanceCss(look)}</style>
      {(look.fontDisplay !== "geist" && look.fontDisplay !== "dm-sans") || (look.fontBody !== "geist" && look.fontBody !== "dm-sans") ? (
        <link rel="stylesheet" href={appearanceFontsHref(look)} precedence="default" />
      ) : null}
      {!online && <div role="status" className="border-b bg-muted px-4 py-2 text-center text-sm text-muted-foreground">Sem conexão · Exibindo o último catálogo salvo. Pedidos disponíveis ao reconectar.</div>}
      {settings.promoBanner?.enabled && settings.promoBanner.text && (
        <div className="bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground">
          {settings.promoBanner.link ? (
            <a href={settings.promoBanner.link} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">{settings.promoBanner.text}</a>
          ) : settings.promoBanner.text}
        </div>
      )}

      {qrModalProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-overlay p-4" onClick={() => setQrModalProduct(null)}>
          <div className="w-full max-w-sm space-y-4 rounded-xl border bg-background p-6 shadow-soft" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="line-clamp-1 text-base font-semibold">{qrModalProduct.name}</h3>
                <p className="text-xs text-muted-foreground">Compartilhe o link direto ou o QR Code</p>
              </div>
              <Button variant="ghost" size="icon" className="size-7" aria-label="Fechar" onClick={() => setQrModalProduct(null)}><X className="size-4" /></Button>
            </div>
            <div className="flex justify-center rounded-lg bg-photo p-4 text-photo-foreground">
              <QRCodeSVG value={`${window.location.origin}/?produto=${encodeURIComponent(qrModalProduct.id)}`} size={180} level="M" includeMargin />
            </div>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => {
                const shareUrl = `${window.location.origin}/?produto=${encodeURIComponent(qrModalProduct.id)}`;
                if (navigator.share) navigator.share({ title: qrModalProduct.name, url: shareUrl }).catch(() => {});
                else copy(shareUrl, "link");
              }}><Share2 className="size-4" /> {copied === "link" ? "Link copiado!" : "Copiar link / Compartilhar"}</Button>
              <Button variant="outline" className="w-full" onClick={() => {
                const msg = `Confira ${qrModalProduct.name} na ${STORE_NAME}: ${window.location.origin}/?produto=${encodeURIComponent(qrModalProduct.id)}`;
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
              }}><MessageCircle className="size-4 text-whatsapp" /> Enviar no WhatsApp</Button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-lg">
        <div className="mx-auto grid max-w-7xl grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 px-3 py-2 md:flex md:justify-between md:px-8">
          <Button variant="ghost" size="icon" className="md:hidden" aria-label={tab === "inicio" ? "Abrir menu" : "Voltar ao início"} onClick={() => goTab(tab === "inicio" ? "mais" : "inicio")}>
            {tab === "inicio" ? <Menu /> : <ArrowLeft />}
          </Button>
          <Link to="/" className="flex justify-center md:justify-start" aria-label="S7VEN Lounge e Tabacaria — início">
            <img src="/logo-s7ven.png" alt="S7VEN Lounge e Tabacaria" width={360} height={312} className="h-14 w-auto object-contain md:h-16" />
          </Link>
          <nav aria-label="Seções do catálogo" className="hidden items-center gap-1 md:flex">
            {navItems.map(({ id, label, icon: Icon }) => (
              <Button key={id} variant="ghost" onClick={() => { if (id === "categorias") setCat("Todos"); goTab(id); }} aria-current={tab === id ? "page" : undefined} className={tab === id ? "text-primary" : "text-muted-foreground"}>
                <Icon />{label}
              </Button>
            ))}
          </nav>
          <div className="relative hidden w-full max-w-sm lg:block">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <input aria-label="Buscar produto" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="O que você está procurando?" className="field search-field pl-10" />
          </div>
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label={`Meu carrinho, ${count} itens`} className="relative size-11 justify-self-end md:w-auto md:px-3">
            <ShoppingCart className="size-6" />
            <span className="hidden md:inline">Carrinho</span>
            <span className="absolute -right-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground md:static">{count}</span>
          </Button>
        </div>
        <div className="relative mx-3 mb-3 lg:hidden md:mx-8">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <input type="search" enterKeyHint="search" autoComplete="off" aria-label="Buscar produto" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Busque por nome, sabor ou categoria" className="field search-field pl-10 pr-10" />
          {query && <button type="button" aria-label="Limpar busca" onClick={() => setQuery("")} className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground">✕</button>}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 md:px-8">
        {status.configured && !status.open && (
          <div role="status" aria-live="polite" className="mt-4 flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3">
            <Clock className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{settings.paused ? "Pedidos pausados no momento" : "Loja fechada no momento"}</p>
              <p className="text-xs text-muted-foreground">{settings.paused ? "Você pode explorar o catálogo. Os pedidos voltam em breve." : reopensAt ? `Você pode agendar seu pedido agora. Ele chega à loja sozinho ${reopensAt}.` : "Os pedidos voltam no horário de atendimento."}</p>
            </div>
            <Button variant="link" size="sm" className="shrink-0 px-0" onClick={() => goTab("mais")}>Horários</Button>
          </div>
        )}

        {feeFrom !== null && !searching && (
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-sm font-semibold text-foreground">
            <Truck className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{feeFrom === 0 ? "Entrega grátis" : `Entrega a partir de ${brl(feeFrom)}`}{settings.delivery_distance_enabled ? ", conforme a distância" : ""}</span>
            <span className="text-muted-foreground">· retirada na loja sem taxa</span>
          </p>
        )}

        {searching ? (
          <section aria-label="Resultados da busca" className="py-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-xl font-semibold">Resultados para “{query.trim()}”</h1>
                <p className="text-xs text-muted-foreground">{filtered.length} produtos</p>
              </div>
              {sortSelect}
            </div>
            {productGrid(filtered)}
          </section>
        ) : tab === "inicio" ? (
          <>
            <section aria-label="Boas-vindas" className="relative mt-4 overflow-hidden rounded-2xl border border-primary/30 bg-photo">
              <img key={settings.banner_image_url || "padrao"} src={settings.banner_image_url || heroImg} alt="" width={1600} height={720}
                onError={(e) => { if (e.currentTarget.src !== new URL(heroImg, location.href).href) e.currentTarget.src = heroImg; }}
                className="absolute inset-0 size-full object-cover" style={{ objectPosition: look.bannerPosition }} />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
              <div className="relative max-w-[70%] px-5 py-8 sm:px-8 sm:py-14 md:max-w-lg">
                <p className="font-display text-sm font-semibold uppercase tracking-wide text-foreground sm:text-lg">{look.bannerKicker}</p>
                <h1 className="font-display text-3xl font-extrabold uppercase leading-none text-gold sm:text-5xl">{look.bannerTitle}</h1>
                <p className="mt-3 text-sm text-foreground/85 sm:text-base">{look.bannerText}</p>
                <Button onClick={() => goTab("categorias")} className="mt-5 h-11 rounded-full px-5 font-bold uppercase tracking-wide">
                  {look.bannerButton || "Ver catálogo"} <ArrowRight />
                </Button>
              </div>
            </section>

            <Button asChild variant="outline" className="mt-3 h-12 w-full gap-3 border-primary/30 text-foreground hover:text-primary">
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                <Instagram className="size-5 shrink-0 text-primary" />
                Instagram da S7VEN
                <ArrowRight className="ml-auto size-4 shrink-0 text-primary" />
              </a>
            </Button>

            <ul aria-label="Vantagens" className="grid grid-cols-4 gap-2 py-5 text-center">
              {[
                { icon: Truck, label: "Entrega rápida" },
                { icon: MessageCircle, label: "Pagamento no WhatsApp" },
                { icon: ShieldCheck, label: "Loja segura" },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex flex-col items-center gap-1.5 text-[11px] leading-tight text-muted-foreground sm:text-sm">
                  <Icon className="size-6 text-primary" />{label}
                </li>
              ))}
              <li>
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 text-[11px] leading-tight text-muted-foreground hover:text-primary sm:text-sm">
                  <Headphones className="size-6 text-primary" />Atendimento
                </a>
              </li>
            </ul>

            <p className="flex items-center gap-2 border-y py-2.5 text-xs font-medium sm:text-sm">
              <Truck className="size-4 shrink-0 text-primary" />
              <span className="truncate">{look.deliveryLine}</span>
            </p>

            {highlights.length > 0 && (
              <section aria-label="Promoções e destaques" className="overflow-hidden py-6">
                <Carousel opts={{ align: "start", loop: highlights.length > 4 }}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 font-display text-xl font-semibold">Promoções e destaques <Flame className="size-5 text-gold" /></h2>
                    <div className="flex items-center gap-2">
                      <Button variant="link" size="sm" className="px-0" onClick={() => openCategory(FEATURED)}>Ver todos <ChevronRight /></Button>
                      <CarouselPrevious className="static hidden size-8 translate-y-0 sm:inline-flex" />
                      <CarouselNext className="static hidden size-8 translate-y-0 sm:inline-flex" />
                    </div>
                  </div>
                  <CarouselContent className="-ml-3 items-stretch">
                    {highlights.map((p) => (
                      <CarouselItem key={p.id} className="basis-[42%] pl-3 sm:basis-1/3 md:basis-1/4 xl:basis-1/5">{tile(p)}</CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </section>
            )}

            <section aria-label="Categorias" className="pb-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold">Categorias</h2>
                <Button variant="link" size="sm" className="px-0" onClick={() => { setCat("Todos"); goTab("categorias"); }}>Ver todas <ChevronRight /></Button>
              </div>
              <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
                {categoryCards.map((c) => {
                  const Icon = categoryIcon(c.label);
                  return (
                    <button key={c.value} type="button" onClick={() => openCategory(c.value)} className="flex w-28 shrink-0 flex-col items-center gap-2 rounded-2xl border border-border/70 bg-card px-2 py-3 text-center shadow-sm transition hover:border-primary">
                      <span className="grid size-16 place-items-center overflow-hidden rounded-xl bg-primary/15 text-primary">
                        {categoryImage(c.value) ? <img src={categoryImage(c.value)} alt="" loading="lazy" width={64} height={64} className="size-full object-cover" /> : <Icon className="size-6" strokeWidth={1.8} />}
                      </span>
                      <span className="line-clamp-2 text-[13px] font-bold leading-tight text-card-foreground">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section aria-label="Todos os produtos" className="border-t py-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold">Todos os produtos</h2>
                  <p className="text-xs text-muted-foreground">{allProducts.length} produtos</p>
                </div>
                {sortSelect}
              </div>
              {productGrid(allProducts)}
            </section>
          </>
        ) : tab === "categorias" ? (
          cat === "Todos" ? (
            <section aria-label="Categorias" className="py-5">
              <h1 className="mb-4 font-display text-2xl font-semibold">Categorias</h1>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {[
                  ...(highlights.length ? [{ value: FEATURED, label: "Promoções e destaques", count: highlights.length }] : []),
                  ...(favorites.length ? [{ value: FAVORITES, label: "Favoritos", count: favorites.length }] : []),
                  ...categoryCards,
                ].map((c) => {
                  const Icon = categoryIcon(c.label);
                  return (
                    <button key={c.value} type="button" onClick={() => openCategory(c.value)} className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary">
                      <span className="grid aspect-[4/3] w-full place-items-center overflow-hidden bg-primary/10 text-primary">
                        {categoryImage(c.value) ? <img src={categoryImage(c.value)} alt="" loading="lazy" width={320} height={240} className="size-full object-cover transition duration-300 group-hover:scale-105" /> : <Icon className="size-10" strokeWidth={1.6} />}
                      </span>
                      <span className="flex items-center gap-2 px-3 py-2.5">
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 text-[15px] font-bold leading-snug text-card-foreground">{c.label}</span>
                          <span className="text-xs text-muted-foreground">{c.count} produtos</span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-primary" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : (
            <section aria-label={categoryTitle} className="py-5">
              <Button variant="ghost" size="sm" className="-ml-2 mb-2 text-muted-foreground" onClick={() => setCat("Todos")}><ArrowLeft />Categorias</Button>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="truncate font-display text-2xl font-semibold">{categoryTitle}</h1>
                  <p className="text-xs text-muted-foreground">{filtered.length} produtos</p>
                </div>
                {sortSelect}
              </div>
              {productGrid(filtered)}
            </section>
          )
        ) : tab === "pedidos" ? (
          <section aria-label="Meus pedidos" className="mx-auto max-w-2xl py-5">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary"><ClipboardList className="size-6" /></span>
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-semibold leading-tight">Meus pedidos</h1>
                <p className="text-sm text-muted-foreground">Acompanhe e repita suas compras feitas neste aparelho.</p>
              </div>
            </div>
            <div className="mb-5 rounded-2xl border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold">Como funciona seu pedido</h2>
              <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { icon: ShoppingCart, title: "Monte o carrinho", text: "Escolha produtos e sabores" },
                  { icon: MessageCircle, title: "Envie no WhatsApp", text: "Confirmamos tudo por lá" },
                  { icon: Wallet, title: "Pague", text: "Pix, cartão ou dinheiro" },
                  { icon: Navigation, title: "Receba ou retire", text: "Entrega ou retirada na loja" },
                ].map((s, n) => (
                  <li key={s.title} className="flex gap-2">
                    <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><s.icon className="size-4" /><span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-background text-[10px] font-bold text-foreground ring-1 ring-border">{n + 1}</span></span>
                    <span className="min-w-0"><span className="block text-xs font-semibold">{s.title}</span><span className="block text-[11px] leading-snug text-muted-foreground">{s.text}</span></span>
                  </li>
                ))}
              </ol>
            </div>
            {orderHistory.length > 0 && (
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Histórico</h2>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{orderHistory.length} {orderHistory.length === 1 ? "pedido" : "pedidos"}</span>
              </div>
            )}
            {receipt && (
              <div className="mb-4 space-y-2 rounded-2xl border border-primary/40 bg-primary/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Pedido mais recente</p>
                <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-4 text-primary" />Seu pedido{receipt.purchase ? ` · ${receipt.purchase}ª compra` : ""} · {tracking.data?.status === "cancelled" ? "cancelado pela loja" : "recebido pela loja"}</p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline"><a href={receipt.url} target="_blank" rel="noopener noreferrer"><MessageCircle />Abrir no WhatsApp</a></Button>
                  {receipt.delivery && tracking.data?.trackingUrl && (
                    <Button asChild size="sm"><a href={tracking.data.trackingUrl} target="_blank" rel="noopener noreferrer"><Navigation />Acompanhar entrega</a></Button>
                  )}
                </div>
              </div>
            )}
            {orderHistory.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-card px-6 py-10 text-center">
                <ClipboardList className="mx-auto mb-3 size-10 text-primary" />
                <p className="font-semibold">Nenhum pedido por aqui ainda</p>
                <p className="mt-1 text-sm text-muted-foreground">Quando você fizer um pedido, ele aparece aqui para você acompanhar e repetir em um toque.</p>
                <Button className="mt-4" onClick={() => goTab("inicio")}>Ver catálogo</Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {orderHistory.map((h, i) => (
                  <li key={h.id || i} className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-bold"><span className="grid size-8 place-items-center rounded-full bg-primary/15 text-primary"><ShoppingCart className="size-4" /></span>{h.purchase ? `${h.purchase}ª compra` : "Pedido"}</span>
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{new Date(h.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Itens</p>
                      <p className="line-clamp-3 text-xs">{h.summary}</p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span><span className="block text-[11px] text-muted-foreground">Total</span><span className="text-base font-bold text-primary">{brl(h.total)}</span></span>
                      <Button size="sm" onClick={() => {
                        let newCart: Cart = { ...cart };
                        let skipped = 0;
                        h.items.forEach((it: { productId: string; option?: string; qty: number; components?: ComboSelection[] }) => {
                          const k = keyOf(it.productId, it.components?.length ? comboOption(it.components) : it.option);
                          const next = { ...newCart, [k]: (newCart[k] || 0) + it.qty };
                          // Paused, removed or sold-out items are left out instead of blocking the whole repeat.
                          try {
                            if (!shown.some(p => p.id === it.productId)) throw new Error();
                            validateCartAvailability(cartInputs(next), products);
                            newCart = next;
                          } catch { skipped += 1; }
                        });
                        setCart(newCart);
                        setError(skipped ? `${skipped} ${skipped === 1 ? "item do pedido anterior não está disponível agora e ficou de fora" : "itens do pedido anterior não estão disponíveis agora e ficaram de fora"}.` : "");
                        setOpen(true);
                      }}><RotateCcw className="size-3.5" /> Repetir pedido</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <section aria-label="Mais informações" className="mx-auto max-w-2xl space-y-4 py-5">
            <h1 className="font-display text-2xl font-semibold">Mais</h1>
            <div className="rounded-xl border bg-card p-4">
              <h2 className="mb-1 flex items-center gap-2 font-semibold"><Clock className="size-4 text-primary" />Horários de atendimento</h2>
              <p className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`size-2 rounded-full ${status.open && status.configured ? "bg-whatsapp" : "bg-muted-foreground"}`} />{status.label} · horário de Brasília
              </p>
              {hoursList}
            </div>
            <div className="rounded-xl border bg-card p-4 text-sm">
              <h2 className="mb-2 flex items-center gap-2 font-semibold"><Truck className="size-4 text-primary" />Entrega e retirada</h2>
              <p>Entregas das 16:00 às 23:00 em {DELIVERY_CITY}. A taxa é calculada pelo endereço no carrinho.</p>
              {settings.pickup_address && <p className="mt-1 text-muted-foreground">Retirada: {settings.pickup_address}</p>}
            </div>
            <div className="rounded-xl border bg-card p-4 text-sm">
              <h2 className="mb-2 flex items-center gap-2 font-semibold"><Wallet className="size-4 text-primary" />Pagamento</h2>
              <p className="text-muted-foreground">Pix, cartão de crédito, cartão de débito ou dinheiro.</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => copy(PIX_KEY, "chave-mais")}><Copy />{copied === "chave-mais" ? "Chave copiada!" : `Chave Pix: ${PIX_KEY}`}</Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button asChild className="h-12 bg-whatsapp text-whatsapp-foreground"><a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"><Headphones />Falar com a loja</a></Button>
              <Button asChild variant="outline" className="h-12"><a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"><Instagram className="text-primary" />Instagram da loja</a></Button>
              <Button variant="outline" className="h-12" onClick={() => {
                const url = window.location.origin;
                if (navigator.share) navigator.share({ title: STORE_NAME, url }).catch(() => {});
                else copy(url, "site");
              }}><Share2 />{copied === "site" ? "Link copiado!" : "Compartilhar catálogo"}</Button>
              <Button variant="outline" className="h-12" onClick={() => openCategory(FAVORITES)}><Heart className="text-destructive" />Meus favoritos ({favorites.length})</Button>
              <Button variant="outline" className="h-12" onClick={() => goTab("pedidos")}><RotateCcw />Repetir um pedido</Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">Venda de bebidas e produtos de tabacaria somente para maiores de 18 anos.</p>
          </section>
        )}
      </div>

      <footer className="mx-auto mt-6 hidden max-w-7xl flex-wrap items-center justify-between gap-3 border-t px-8 py-6 text-xs text-muted-foreground md:flex">
        <span>{STORE_NAME}</span>
        <span>Venda de bebidas e produtos de tabacaria somente para maiores de 18 anos.</span>
      </footer>

      {count > 0 && !open && (
        <Button
          onClick={() => setOpen(true)}
          className="fixed inset-x-3 bottom-[4.75rem] z-30 flex h-13 items-center justify-between rounded-2xl px-5 py-3.5 shadow-soft md:bottom-6 md:left-auto md:right-6 md:w-96"
        >
          <span className="flex items-center gap-2"><ShoppingCart />{count} {count === 1 ? "item" : "itens"} · Finalizar pedido</span>
          <span className="font-semibold">{brl(total)}</span>
        </Button>
      )}

      <nav aria-label="Navegação principal" className="admin-bottom-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-background/95 backdrop-blur-lg md:hidden">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => { if (id === "categorias") setCat("Todos"); goTab(id); }} aria-current={tab === id ? "page" : undefined} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${tab === id ? "text-primary" : "text-muted-foreground"}`}>
            <Icon className="size-5" />{label}
          </button>
        ))}
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-md">
          <div className="border-b px-4 py-2.5 pr-12">
            <SheetTitle className="inline font-display text-lg font-semibold leading-tight">Seu pedido</SheetTitle>
            <SheetDescription className="ml-2 inline text-xs">
              {count} {count === 1 ? "item" : "itens"} no carrinho
            </SheetDescription>
          </div>
          {receipt && !items.length ? (
            <div className="flex flex-1 flex-col items-center overflow-y-auto px-6 py-8 text-center">
              <img src="/logo-s7ven.png" alt="" width={360} height={312} className="h-20 w-auto" />
              <CheckCircle2 className="mt-6 size-20 text-gold" strokeWidth={1.5} />
              <h2 className="mt-4 font-display text-3xl font-extrabold uppercase text-gold">{tracking.data?.status === "cancelled" ? "Pedido cancelado" : "Pedido enviado!"}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{receipt.scheduledLabel ? `Pedido agendado! A loja está fechada agora e ele chega sozinho ${receipt.scheduledLabel}, sem você precisar fazer nada` : "Seu pedido foi registrado na loja. A mensagem está pronta para você enviar no WhatsApp"}. Em breve nossa equipe vai te responder.</p>
              <div className="mt-5 w-full rounded-xl border bg-card p-4 text-left">
                <p className="mb-2 font-semibold">Resumo do pedido</p>
                <p className="flex justify-between text-sm"><span>{receipt.itemCount} {receipt.itemCount === 1 ? "item" : "itens"}</span><span className="font-semibold">{brl(receipt.total)}</span></p>
              </div>
              <div className="mt-4 w-full space-y-2">
                <Button asChild className="h-11 w-full bg-whatsapp text-whatsapp-foreground"><a href={receipt.url} target="_blank" rel="noopener noreferrer"><MessageCircle />Abrir pedido no WhatsApp</a></Button>
                {receipt.delivery && tracking.data?.trackingUrl && (
                  <Button asChild className="h-11 w-full"><a href={tracking.data.trackingUrl} target="_blank" rel="noopener noreferrer"><Navigation />Acompanhar entrega em tempo real</a></Button>
                )}
                {receipt.delivery && tracking.data && !tracking.data.trackingUrl && tracking.data.status === "out_for_delivery" && <p className="text-sm text-primary">Seu pedido saiu para entrega!</p>}
                <Button variant="outline" className="h-11 w-full border-primary text-primary" onClick={() => { setOpen(false); void navigate({ to: "/", search: {}, resetScroll: true }); }}><ShoppingCart />Ver catálogo novamente</Button>
              </div>
              <p className="mt-8 font-display text-2xl italic text-gold">Obrigado pela preferência!</p>
              <ul className="mt-5 flex w-full justify-around text-xs text-gold">
                <li className="flex flex-col items-center gap-1"><Gem className="size-5" />Qualidade</li>
                <li className="flex flex-col items-center gap-1"><Truck className="size-5" />Agilidade</li>
                <li className="flex flex-col items-center gap-1"><Heart className="size-5" />Sempre com você</li>
              </ul>
            </div>
          ) : (<>
          <div className="flex-1 space-y-1.5 overflow-y-auto px-4 pb-1.5 pt-2">
            <p role="status" className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs ${orderingBlocked || (status.configured && !status.open) ? "border-destructive/40 bg-destructive/10" : "border-primary/40 bg-primary/10"}`}>
              <Clock className={`size-4 shrink-0 ${orderingBlocked || (status.configured && !status.open) ? "text-destructive" : "text-primary"}`} />
              {orderingBlocked || (status.configured && !status.open)
                ? <span className="min-w-0 truncate"><span className="font-semibold">{orderStatus.reason === "paused" ? "Pedidos pausados" : "Loja fechada"}</span><span className="text-muted-foreground"> · explore o catálogo</span></span>
                : pickupOnly
                  ? <span className="min-w-0 truncate"><span className="font-semibold">Somente retirada{pickupUntil}</span><span className="text-muted-foreground"> · entregas encerradas por hoje</span></span>
                  : <span className="min-w-0 truncate"><span className="font-semibold">Pedidos abertos!</span><span className="text-muted-foreground"> · receba no conforto da sua casa</span></span>}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Seus produtos</p>
            {items.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">Seu carrinho está vazio.</p>
            ) : (
              <ul className="max-h-32 space-y-2 overflow-y-auto pr-1">
                {items.map((i) => (
                  <li key={i.key} className="flex items-center gap-2.5">
                    {(() => {
                      // The variation's own photo wins over the cover, so the customer sees exactly what they picked.
                      const photo = itemPhoto(i.product, i.option);
                      return photo ? (
                        <img src={photo} alt={i.product.name} loading="lazy" decoding="async" className="size-10 shrink-0 rounded-md object-contain" />
                      ) : (
                        <span className="text-2xl">{i.product.emoji}</span>
                      );
                    })()}
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="truncate text-sm font-medium">{i.product.name}</p>
                      {i.option && <p className="truncate text-xs text-primary">{i.product.optionLabel}: {i.option}</p>}
                      {i.components && <p className="truncate text-xs text-primary">{comboSummary(i.components, products, i.product)}</p>}
                      <p className="text-xs text-muted-foreground">{brl(i.product.price * i.qty)}</p>
                      {!available(i.product, i.option, i.qty) && <p className="text-xs text-destructive">Indisponível: ajuste a quantidade.</p>}
                    </div>
                    <Qty qty={i.qty} onMinus={() => change(i.key, -1)} onPlus={() => change(i.key, 1)} />
                    <Button variant="ghost" size="icon" className="size-8 shrink-0 text-primary" aria-label={`Remover ${i.product.name}`} onClick={() => change(i.key, -i.qty)}><Trash2 /></Button>
                  </li>
                ))}
              </ul>
            )}

            {pairs.length > 0 && (
              <section aria-label="Peça junto" className="border-t pt-2">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gold">Peça junto</p>
                <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
                  {pairs.map((p) => {
                    const photo = productPhotos(p)[0];
                    return (
                      <li key={p.id} className="flex w-44 shrink-0 items-center gap-2 rounded-lg border bg-card p-1">
                        {photo ? <img src={photo} alt="" loading="lazy" className="size-9 shrink-0 rounded-md bg-photo object-contain" /> : <span className="text-2xl">{p.emoji}</span>}
                        <div className="min-w-0 flex-1 leading-tight">
                          <p className="truncate text-xs font-medium">{p.name}</p>
                          <p className="text-xs text-primary">{brl(p.price)}</p>
                        </div>
                        <Button
                          size="icon"
                          className="size-8 shrink-0 rounded-full"
                          aria-label={p.options?.length ? `Escolher ${p.name}` : `Adicionar ${p.name}`}
                          onClick={() => (p.options?.length ? setDetail(p) : change(keyOf(p.id), 1))}
                        >
                          <Plus />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
            <div className="space-y-1.5 border-t pt-2">
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs font-medium">
                  <span className="sr-only">Nome *</span>
                  <input
                    className="field py-2"
                    placeholder="Nome *"
                    required
                    autoComplete="name"
                    aria-invalid={Boolean(fieldErrors.name?.length)}
                    aria-describedby={fieldErrors.name?.length ? "name-error" : undefined}
                    value={form.name}
                    maxLength={80}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <PhoneField compact hiddenLabel placeholder="WhatsApp *" label="WhatsApp *" value={form.phone} submitted={submitted} onChange={(phone) => setForm({ ...form, phone })} />
              </div>
              {fieldErrors.name?.[0] && <p id="name-error" role="alert" className="text-xs text-destructive">{fieldErrors.name[0]}</p>}
              <div role="group" aria-label="Recebimento do pedido" className="grid grid-cols-2 gap-2">
                <Button size="sm" variant={isDelivery ? "default" : "outline"} aria-pressed={isDelivery} disabled={pickupOnly} onClick={() => { setForm({ ...form, fulfillment: "delivery" }); setError(""); }}><Truck />{pickupOnly ? "Entrega encerrada" : "Entrega"}</Button>
                <Button size="sm" variant={!isDelivery ? "default" : "outline"} aria-pressed={!isDelivery} onClick={() => { setForm({ ...form, fulfillment: "pickup" }); setError(""); }}><Store />Retirada na loja</Button>
              </div>
              {isDelivery && (
                <fieldset className="space-y-1.5" aria-label="Endereço de entrega">
                  {savedAddress && useSavedAddress && (
                    <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-2 text-xs">
                      <MapPin className="size-4 shrink-0 text-primary" />
                      <p className="min-w-0 flex-1 truncate">
                        Mesmo endereço? <span className="text-muted-foreground">{savedAddress.street}, {savedAddress.number}{savedAddress.neighborhood ? ` · ${savedAddress.neighborhood}` : ""}</span>
                      </p>
                      <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={() => void calculateDelivery()}><Check className="size-3.5" />Sim</Button>
                      <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => {
                        setUseSavedAddress(false);
                        setAddressLine("");
                        setForm(f => ({ ...f, street: "", number: "", neighborhood: "" }));
                      }}>Trocar</Button>
                    </div>
                  )}
                  <Button type="button" variant="outline" size="sm" className="h-9 w-full text-xs" disabled={locating} onClick={useMyLocation}>
                    <Navigation className={locating ? "animate-pulse" : ""} />{locating ? "Buscando sua localização…" : "Usar minha localização"}
                  </Button>
                  <label className="relative block text-xs font-medium"><span className="sr-only">Rua e número *</span>
                    <input
                      className="field py-2"
                      required
                      maxLength={120}
                      aria-invalid={Boolean(fieldErrors.address?.length)}
                      aria-expanded={suggestionsOpen}
                      aria-controls="address-suggestions"
                      aria-autocomplete="list"
                      autoComplete="off"
                      placeholder="Rua e número * (ex.: Deodoro, 1696)"
                      value={addressLine}
                      onChange={(e) => {
                        const line = e.target.value;
                        setAddressLine(line);
                        const { street, number } = splitAddressLine(line);
                        setForm({ ...form, street, number });
                      }}
                      onFocus={() => { if (suggestions.length) setSuggestionsOpen(true); }}
                      onBlur={() => { setTimeout(() => setSuggestionsOpen(false), 200); void calculateDelivery(); }}
                    />
                    {suggestionsOpen && (
                      <ul
                        id="address-suggestions"
                        role="listbox"
                        aria-label="Sugestões de endereço em Araçatuba"
                        className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border bg-card font-normal shadow-lg"
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
                  {!distanceMode && (
                    <p className="text-xs">
                      <span className="text-muted-foreground">Bairro:</span>{" "}
                      <span className="font-medium">{form.neighborhood.trim() || "aparece automaticamente"}</span>
                      <span className="text-muted-foreground"> · {DELIVERY_CITY}</span>
                    </p>
                  )}
                </fieldset>
              )}
              {!isDelivery && settings.pickup_address && (
                <div role="status" className="flex items-start gap-2 rounded-lg border border-gold/50 bg-gold/10 px-3 py-2">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-gold" />
                  <p className="min-w-0 leading-snug">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-gold">Retire na loja</span>
                    <span className="text-base font-semibold text-foreground">{settings.pickup_address}</span>
                  </p>
                </div>
              )}
              {isDelivery && fieldErrors.address?.[0] && <p id="address-error" className="text-xs text-destructive">{fieldErrors.address[0]}</p>}
              {isDelivery && distanceMode && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1 text-xs leading-tight">
                      <p className="truncate">
                        <span className="text-muted-foreground">Bairro:</span>{" "}
                        <span className="font-medium">{form.neighborhood.trim() || "automático"}</span>
                        <span className="text-muted-foreground"> · {DELIVERY_CITY.replace(/, ?SP$/, "")}</span>
                      </p>
                      {validQuote && <p role="status" className="font-semibold text-primary">{brl(validQuote.fee)} · {validQuote.km.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} km de moto</p>}
                    </div>
                    <Button size="sm" variant="outline" className="h-8 shrink-0 px-2.5 text-xs" disabled={quoting || !addressComplete || fullAddress.trim().length < 8 || Boolean(validQuote)} onClick={calculateDelivery}><Truck />{quoting ? "Calculando…" : validQuote ? "Calculada" : "Calcular entrega"}</Button>
                  </div>
                  {validQuote && deliveryEstimate && <p role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="size-3.5 shrink-0 text-primary" />Entrega estimada: {deliveryEstimate.min}–{deliveryEstimate.max} min (aproximado)</p>}
                  {deliveryError && <p role="alert" className="text-xs text-destructive">{deliveryError}</p>}
                </div>
              )}
              {isDelivery && settings.delivery_enabled && !distanceMode && settings.fixed_delivery_fee === null && (
                <select aria-label="Bairro ou região" className="field py-2" value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })}>
                  <option value="">Selecione sua região</option>
                  {settings.delivery_zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name} · {brl(z.fee)}</option>
                  ))}
                </select>
              )}
              <div>

                <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Forma de pagamento" aria-describedby={fieldErrors.payment?.length ? "payment-error" : undefined}>
                  {PAYMENT_METHODS.map((m) => (
                    <Button
                      variant="outline"
                      key={m}
                      type="button"
                      aria-pressed={form.payment === m}
                      aria-label={m}
                      onClick={() => setForm({ ...form, payment: m })}
                      className={`h-9 px-1 text-xs ${form.payment === m ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}
                    >
                      {m.replace("Cartão de crédito", "Crédito").replace("Cartão de débito", "Débito")}
                    </Button>
                  ))}
                </div>
              </div>
              {fieldErrors.payment?.[0] && <p id="payment-error" className="text-xs text-destructive">{fieldErrors.payment[0]}</p>}
              {form.payment === "Pix" && displayedTotal > 0 && (
                <div className="space-y-1.5 rounded-lg border border-primary/30 bg-primary/5 p-1.5">
                  {showPixQr && (
                    <div className="mx-auto w-fit rounded-md bg-photo p-1 text-photo-foreground">
                      <QRCodeSVG value={pixPayload} size={120} level="M" marginSize={1} />
                    </div>
                  )}
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5">
                    <Button variant="outline" type="button" size="sm" className="h-8 px-1 text-xs" onClick={() => copy(pixPayload, "codigo")}>
                      {copied === "codigo" ? "Código copiado!" : "Pix copia e cola"}
                    </Button>
                    <Button variant="outline" type="button" size="sm" className="h-8 px-1 text-xs" onClick={() => copy(PIX_KEY, "chave")}>
                      {copied === "chave" ? "Chave copiada!" : `Chave: ${PIX_KEY}`}
                    </Button>
                    <Button variant="outline" type="button" size="sm" className="h-8 px-2 text-xs" aria-expanded={showPixQr} aria-label={showPixQr ? "Ocultar QR code" : "Ver QR code"} onClick={() => setShowPixQr((v) => !v)}>QR</Button>
                  </div>
                </div>
              )}
              {form.payment === "Dinheiro" && (
                <input
                  aria-label="Troco para quanto?"
                  className="field py-2"
                  maxLength={30}
                  placeholder="Troco para quanto? Ex.: R$ 100"
                  value={form.change}
                  onChange={(e) => setForm({ ...form, change: e.target.value })}
                />
              )}
              <input
                aria-label="Observação do pedido (opcional)"
                className="field py-2 text-sm"
                maxLength={300}
                placeholder="Observação (opcional): portaria, interfone…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5 border-t px-4 py-2">
            <dl className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-0.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm">
              <dt className="text-muted-foreground">Produtos</dt>
              <dd className="text-right font-medium">{brl(displayedSubtotal)}</dd>
              <dt className="text-muted-foreground">{isDelivery ? "Entrega" : "Retirada"}</dt>
              <dd className={`text-right font-semibold ${!isDelivery || (distanceMode ? validQuote : settings.fixed_delivery_fee !== null || zone) ? "text-primary" : "text-muted-foreground"}`}>
                {!isDelivery ? "Grátis" : settings.delivery_enabled
                  ? distanceMode ? validQuote || receipt && !items.length ? brl(displayedDeliveryFee) : quoting ? "calculando…" : "calcule acima" : settings.fixed_delivery_fee !== null || zone
                    ? brl(displayedDeliveryFee)
                    : "selecione a região"
                  : "a confirmar"}
              </dd>
              <div className="col-span-2 my-0.5 border-t border-primary/20" />
              <dt className="font-semibold">{isDelivery && distanceMode && !validQuote && items.length ? "Total (sem entrega)" : "Total"}</dt>
              <dd className="text-right font-display text-lg font-bold leading-tight">{brl(displayedTotal)}</dd>
            </dl>
            {status.configured && !status.open && orderStatus.reason !== "paused" && (
              <p className="text-xs text-destructive">{canSchedule ? `Loja fechada agora. Seu pedido fica agendado e chega à loja sozinho ${reopensAt}.` : "Loja fechada no momento. Confira os horários de atendimento."}</p>
            )}
            {orderingBlocked && orderStatus.reason === "paused" && (
              <p className="text-xs text-destructive">Pedidos pausados no momento. Tente novamente mais tarde.</p>
            )}
            {pickupOnly && (
              <p className="text-xs text-destructive">As entregas encerraram às {settings.order_cutoff}. Você ainda pode fazer o pedido para retirar na loja{pickupUntil}.</p>
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button
              disabled={!online || sending || !items.length || (orderingBlocked && !canSchedule)}
              onClick={send}
              className="h-11 w-full rounded-lg bg-whatsapp font-semibold text-whatsapp-foreground"
            >
              <MessageCircle /> {!online ? "Conecte-se para enviar" : sending ? "Registrando pedido…" : canSchedule ? `Agendar pedido para ${reopensAt}` : "Enviar pedido pelo WhatsApp"}
            </Button>
          </div>
          </>)}
        </SheetContent>
      </Sheet>
      {detail && <ProductDetail product={detail} onClose={closeDetail} cart={cart} sel={sel} typed={typed} onSel={(id, v) => setSel((x) => ({ ...x, [id]: v }))} onTyped={(id, v) => setTyped((x) => ({ ...x, [id]: v }))} onChange={change} onBuild={setBuilding} favorite={favorites.includes(detail.id)} onToggleFavorite={toggleFavorite} onShare={setQrModalProduct} />}
      {closedWarn === "show" && (
        <div role="alertdialog" aria-label="Loja fechada" className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-xl border border-primary/40 bg-card p-4 shadow-lg">
          <p className="flex items-center gap-2 text-sm font-semibold"><Clock className="size-4 text-primary" aria-hidden="true" />{settings.paused ? "Pedidos pausados no momento" : "A loja está fechada agora"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{settings.paused ? "Seu carrinho fica guardado. Os pedidos voltam em breve." : `Seu carrinho fica guardado neste aparelho. ${reopensAt ? `Você poderá enviar o pedido ${reopensAt}.` : "Você poderá enviar no horário de atendimento."}`}</p>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => { setClosedWarn("done"); goTab("mais"); }}>Ver horários</Button>
            <Button size="sm" onClick={() => setClosedWarn("done")}>Entendi</Button>
          </div>
        </div>
      )}
      {building && <ComboBuilder key={building.id} product={building} products={products} open onOpenChange={value => { if (!value) setBuilding(null); }} onAdd={selections => { const key = keyOf(building.id, comboOption(selections)); const next = { ...cart, [key]: (cart[key] ?? 0) + 1 }; validateCartAvailability(cartInputs(next), products); setCart(next); setBuilding(null); }} />}
    </div>
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
