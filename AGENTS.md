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
- Anonymous catalog analytics: bounded writes, admin-only aggregates, people = browser ids merged by keyed device HMAC, preview hosts untracked; atomic checkout conversion upsert on order insert; never infer contacts or block checkout; in-memory fallback when storage is blocked.
- Store shared delivery, weekly hours and date-specific special days in `store_settings`; resolve hours per Sao Paulo date (special day replaces that weekday, incl. after-midnight carry-over) in shared client/server helpers, and validate writes through authenticated server functions and admin-only RLS so customers cannot change store operations.
- Shared delivery pricing precedence: enabled distance tiers, then fixed fee, then regions; keep pickup free.
- Centralize Maps routes: body HMAC, city validation, short-lived address/settings/travel-mode quotes, checkout revalidation, server-claimed hourly store/network budget before paid calls. Duration is informational.
- Grant store administration through protected `user_roles` and a server-managed invite checked against confirmed auth email; never grant privileges from browser state or editable metadata.
- Use TanStack Query for shared settings and the pathless authenticated panel layout; public catalog reads stay login-independent.
- Persist customer orders through a validated public checkout server function with server-calculated prices, random idempotency keys and bounded submission frequency; never expose private order reads publicly.
- Persist catalog fulfillment independently of sales source; default legacy carts/orders to delivery and calculate pickup without address, region, or delivery fees on both client and server.
- Share cart availability checks between catalog submission and server pricing, including aggregate quantities and missing saved-cart products; navigate to WhatsApp only after server validation and stock reservation succeed.
- Admin orders use authenticated conflict-checked writes, paginated polling and user-activated audio; combined WhatsApp actions navigate only after save, never send automatically.
- Live catalog reads use stored rows only; deletes stick and strip combos; expose allowlisted sales fields (`compareAtPrice` struck through; `price` charged). Customers never see paused products; saved carts check them. Raw writes: admin-only.
- Store photos privately: anonymous reads only for catalog-linked paths, admin-only uploads/full reads; index the exact cover/gallery lookup expressions. Persist paths in image/images, never signed URLs; keep public/admin catalog query keys separate so restricted data never leaks through cache.
- Reserve stock under sorted row locks; reject stale prices. Admin cancellation is terminal: snapshot product/variation/component control flags at insertion (current flags for legacy orders), restore once, record missing/untracked items without recreating them. Exclude cancelled sales from revenue, retaining totals and conversion events.
- Represent fixed-price combos as catalog products with comboGroups and structured order components; encode choices in separate option keys to preserve legacy carts, validate group membership server-side, and reserve all quantities together in sorted row-lock order.
- The store uses an external POS, so the panel has no counter-sale screen; legacy `source = counter` orders stay readable in history/reports and out of delivery stages and new-order alerts.
- Manifest start URL `/painel`, online admin auth. Offline cache only public catalog HTML/assets, products/settings, viewed photos — never admin/auth/API; online checkout.
- Keep the admin assistant in one account transcript (admin reads, server writes); authenticate streaming separately; send AI only allowlisted aggregates and store-owned catalog fields, no customer records; bounded leases and durable blocks stop duplicate paid requests; it never writes operations.
- WhatsApp photos use public galleries, not expiring URLs.
- Delivery tracking links are admin-set per delivery order; public reads return only stage + link so customers never see other order data.
- Admin reports (sales, frequent customers by normalized phone) read period-bounded order fields, return aggregates, exclude cancelled sales and never double-count combo components.
- New catalog orders notify admin devices by Web Push via a dedicated-scope worker apart from the offline one; admin-owned subscriptions, sent server-side after insertion without blocking checkout.
- Subdirectories have their own AGENTS.md; read before editing there.
- Catalog look (colors, allowlisted fonts, corners, home texts, banner photo path/position) lives in `store_settings.catalog_appearance`, parsed field-by-field with fallback and saved only by its own admin server function so other settings saves never overwrite it; the banner photo is a private `product-photos` path made anon-readable by `is_catalog_photo` and served as a signed URL from the settings read.
- Ratings: public via per-order token link only, one per order, server-written.
- Generate social product images with a shared browser canvas; use native file sharing with a download fallback because web links cannot attach image files to WhatsApp.
- Keep real social font designs separate from copyable Unicode styles; bundle licensed font files, load via browser FontFace and export transparent text with measured glyph bounds because copying text cannot preserve font families.
- Render themed Story stickers locally with bundled fonts and the same canvas for previews and transparent exports; paginate rendering and prepare file blobs before share clicks to preserve mobile user activation.
