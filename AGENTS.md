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

- Keep catalog product/cart logic on the public catalog route and preserve per-option cart keys so existing saved carts continue to work.
- Track anonymous browser/session UUIDs with bounded writes; poll admin-only unique-browser aggregates for inactivity-based abandonment notices. Convert only on successful order insertion; never infer contact details.
- Record checkout conversion atomically with a session upsert on successful order insertion; checkout must never wait for optional visit telemetry, and blocked browser storage uses an in-memory identity.
- Store shared delivery and weekly hours in `store_settings`; validate writes through authenticated server functions and admin-only RLS so customers cannot change store operations.
- Shared delivery pricing precedence: enabled distance tiers, then fixed fee, then regions; keep pickup free.
- Calculate road-distance quotes through Google Maps in sealed browser-session flows; bind private short-lived quotes to address and settings and validate them during checkout so customers cannot choose their own fee.
- Keep product photo AI editing admin-authenticated and stream original-image edits; applying a result replaces only the selected draft photo through private native storage and requires the usual product save.
- Grant store administration through protected `user_roles` and a server-managed invitation checked against confirmed auth email; never grant privileges from browser state or editable metadata.
- Use TanStack Query for shared settings and the pathless authenticated layout for the panel, keeping public catalog reads independent of login.
- Persist customer orders through a validated public checkout server function with server-calculated catalog prices, random idempotency keys and bounded submission frequency; never expose private order reads publicly.
- Persist catalog fulfillment independently of sales source; default legacy carts/orders to delivery and calculate pickup without address, region, or delivery fees on both client and server.
- Share cart availability checks between catalog submission and server pricing, including aggregate product/variation quantities and missing saved-cart products; only navigate to WhatsApp after server validation and stock reservation succeed.
- Keep order management in an admin-only panel module with authenticated status writes, conflict detection, paginated polling and user-activated audio; WhatsApp stage actions open prefilled messages rather than claiming automatic delivery.
- Preserve the imported baseline; expose only allowlisted sales fields, including admin-selected highlights. Raw overrides/writes stay admin-only.
- Store product photos in private native storage with anonymous reads limited to catalog-linked paths and admin-only uploads/full reads; this protects unpublished uploads without blocking admin previews.
- Use separate public and admin catalog query keys so restricted override data cannot leak through a shared cache.
- Keep cover/additional paths in image/images and resolve signed URLs separately; admin saves must never persist expiring URLs.
- ProductCardPhotos uses productPhotos for inline navigation independent of enlargement; keep every saved photo accessible.
- Reserve tracked product and variation stock atomically on order insertion using row locks, and reject stale prices; this prevents overselling across concurrent customers.
- Represent grouped fixed-price combos as catalog products with comboGroups and structured order components; encode combo choices in separate option keys to preserve legacy carts, validate group membership server-side, and reserve all main/component quantities together in sorted row-lock order.
- Persist counter sales in orders with a source and cashier, using admin-verified server-calculated checkout and the existing reservation trigger; this unifies history without duplicate stock deductions. Keep counter sales out of delivery stages and new-order alerts.
- Keep manifest identity/start URL `/painel` and online admin auth. Generate guarded production-only offline caching for public catalog HTML/assets, never admin/auth/API. Persist public products/settings and viewed photos; refresh on reconnect and require online checkout.
- Keep the administrative assistant in a single account-scoped text transcript with admin-only reads and server-managed writes; authenticate the streaming endpoint independently and send only allowlisted dashboard aggregates to AI to protect customer data.
- Use AI SDK Responses and AI Elements with saved history, bounded leases and durable terminal blocks to prevent duplicate paid requests; analysis never writes operations.

- WhatsApp photo links open the public catalog gallery by product ID, never an expiring storage URL; checkout still waits for validated order insertion.
