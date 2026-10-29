<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep product/cart logic on the public catalog route, with sections as its validated `aba` search param; preserve per-option keys (`components/catalog/cart-keys`) for saved carts.
- Track anonymous UUIDs with bounded writes and admin-only abandonment aggregates; record checkout conversion atomically via session upsert on order insertion, never infer contacts, never block checkout on telemetry, and fall back to in-memory identity when browser storage is blocked.
- Store shared delivery and weekly hours in `store_settings`; validate writes through authenticated server functions and admin-only RLS so customers cannot change store operations.
- Shared delivery pricing precedence: enabled distance tiers, then fixed fee, then regions; keep pickup free.
- Centralize Maps routes: body HMAC, city validation, short-lived address/settings/travel-mode quotes, checkout revalidation, server-claimed hourly store/network budget before paid calls. Duration is informational.
- Grant store administration through protected `user_roles` and a server-managed invite checked against confirmed auth email; never grant privileges from browser state or editable metadata.
- Use TanStack Query for shared settings and the pathless authenticated panel layout; public catalog reads stay login-independent.
- Persist customer orders through a validated public checkout server function with server-calculated prices, random idempotency keys and bounded submission frequency; never expose private order reads publicly.
- Persist catalog fulfillment independently of sales source; default legacy carts/orders to delivery and calculate pickup without address, region, or delivery fees on both client and server.
- Share cart availability checks between catalog submission and server pricing, including aggregate quantities and missing saved-cart products; navigate to WhatsApp only after server validation and stock reservation succeed.
- Admin orders use authenticated conflict-checked writes, paginated polling and user-activated audio; combined WhatsApp actions navigate only after save, never send automatically.
- Preserve the imported baseline; expose only allowlisted sales fields (incl. struck-through `compareAtPrice`; `price` is what's charged). Customers never see paused products; saved-cart checks still use them. Raw writes stay admin-only.
- Store photos privately: anonymous reads only for catalog-linked paths, admin-only uploads/full reads; index the exact cover/gallery lookup expressions. Persist paths in image/images, never signed URLs; keep public/admin catalog query keys separate so restricted data never leaks through cache.
- Reserve stock under sorted row locks; reject stale prices. Admin cancellation is terminal: snapshot product/variation/component control flags at insertion (current flags for legacy orders), restore once, record missing/untracked items without recreating them. Exclude cancelled sales from revenue, retaining totals and conversion events.
- Represent fixed-price combos as catalog products with comboGroups and structured order components; encode choices in separate option keys to preserve legacy carts, validate group membership server-side, and reserve all quantities together in sorted row-lock order.
- The store uses an external POS, so the panel has no counter-sale screen; legacy `source = counter` orders stay readable in history/reports and out of delivery stages and new-order alerts.
- Keep manifest identity/start URL `/painel` and online admin auth. Cache offline only public catalog HTML/assets, products/settings and viewed photos — never admin/auth/API; refresh on reconnect and require online checkout.
- Keep the admin assistant in one account-scoped transcript (admin-only reads, server-managed writes); authenticate streaming independently, send only allowlisted dashboard aggregates to AI, use bounded leases and durable terminal blocks against duplicate paid requests; analysis never writes operations.
- WhatsApp photos use public galleries, never expiring URLs; checkout waits for validated insertion.
- Delivery tracking links are admin-set per catalog delivery order and exposed publicly only as stage + link by order id, because customers must never read other order data.
- Admin sales reports read period-bounded order fields and return aggregates, excluding cancelled sales and avoiding combo component revenue duplication.
- New catalog orders notify admin devices by Web Push via a dedicated-scope worker apart from the offline one; admin-owned subscriptions, sent server-side after insertion without blocking checkout.
- Subdirectories have their own AGENTS.md; read it before changing files there.
- Customer ratings are public only through a per-order random token sent in the delivered WhatsApp message; one rating per order, written server-side, admin-only reads.
