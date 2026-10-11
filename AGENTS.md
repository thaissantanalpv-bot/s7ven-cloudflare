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
- Store shared delivery and weekly hours in `store_settings`; validate writes through authenticated server functions and admin-only RLS so customers cannot change store operations.
- Grant store administration through protected `user_roles` and a server-managed invitation checked against confirmed auth email; never grant privileges from browser state or editable metadata.
- Use TanStack Query for shared settings and the pathless authenticated layout for the panel, keeping public catalog reads independent of login.
- Persist customer orders through a validated public checkout server function with server-calculated catalog prices, random idempotency keys and bounded submission frequency; never expose private order reads publicly.
- Keep order management in an admin-only panel module with authenticated status writes, conflict detection, paginated polling and user-activated audio; WhatsApp stage actions open prefilled messages rather than claiming automatic delivery.
- Keep the imported catalog as the immutable public baseline; merge validated `catalog_products` overrides only in admin reads and server checkout, because override reads are now admin-only.
- Store product photos in private native storage with anonymous reads limited to catalog-linked paths and admin-only uploads/full reads; this protects unpublished uploads without blocking admin previews.
- Use separate public and admin catalog query keys so restricted override data cannot leak through a shared cache.
- Keep the cover in image and additional photo paths in images within catalog overrides; resolve signed URLs separately from editable paths so galleries preserve legacy covers and admin saves never persist expiring URLs.
- Reserve tracked product and variation stock atomically on order insertion using row locks, and reject stale prices; this prevents overselling across concurrent customers.
- Persist counter sales in orders with a source and cashier, using admin-verified server-calculated checkout and the existing reservation trigger; this unifies history without duplicate stock deductions. Keep counter sales out of delivery stages and new-order alerts.
