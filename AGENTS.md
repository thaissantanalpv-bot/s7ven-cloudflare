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
