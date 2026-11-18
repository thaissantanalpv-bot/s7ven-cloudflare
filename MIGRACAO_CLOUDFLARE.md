# SEVEN / Cloudflare Workers - preparação de homologação

Esta cópia é para `s7ven-cloudflare`, não para o repositório sincronizado ao Lovable.
Destinos: Cloudflare da Thaís + Supabase `rorjblbxpxicuapwpnxb` (sa-east-1).
**Não alterar DNS ou conectar ao banco Lovable para teste.**

## Alterações

- `vite.config.ts`: migrou do wrapper Lovable/Nitro para o plugin oficial `@cloudflare/vite-plugin` + TanStack Start; manteve React, Tailwind, aliases e configuração PWA.
- `src/server.ts`: entrada Workers usando o handler padrão do TanStack com a proteção de erro já existente.
- `src/integrations/lovable/index.ts`: login Google via `supabase.auth.signInWithOAuth` em lugar do broker Lovable (depende de habilitar o provedor Google no novo Supabase).
- `wrangler.jsonc`: configuração independente Cloudflare Workers.
- `package.json`: inclui Wrangler e plugin Cloudflare; remove build-wrapper Lovable.
- `.env` antigo removido; `.env.example` documenta variáveis sem incluir credenciais.
- `bun.lock` antigo removido porque não corresponde às novas dependências; gerar um lockfile novo (`npm install --package-lock-only`) após validar dependências.

## Configuração Cloudflare (precisa ser feita no dashboard antes de testes funcionais)

Em **Workers Builds / Build Variables**, configurar:

- `VITE_SUPABASE_URL` = `https://rorjblbxpxicuapwpnxb.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = a chave publishable do novo Supabase BR (não é service role).

Em **Worker / Settings / Variables and Secrets**, configurar:

- `SUPABASE_URL` e `VITE_SUPABASE_URL` = URL do Supabase BR.
- `SUPABASE_PUBLISHABLE_KEY` e `VITE_SUPABASE_PUBLISHABLE_KEY` = chave publishable do Supabase BR.
- `SUPABASE_SERVICE_ROLE_KEY` = **secret**, nunca `VITE_` nem commit. Permite ações privilegiadas no servidor.
- `DELIVERY_SESSION_SECRET` = **secret** aleatório forte, não reaproveitar chave de produção.

Evite deixar o nome de qualquer variável apontando para o projeto Lovable.

Build command: `npm run build`
Deploy command: `npx wrangler deploy`
Preview command: `npm run preview`

### Pendências antes de produzir pedidos reais

1. Build e deploy Workers: **não validados neste pacote** (sem acesso ao registry npm). Use o log da Cloudflare para depurar, e execute `npm run build` / `npx wrangler deploy --dry-run` antes do deploy se possível.
2. Login e Google OAuth: login por e-mail/senha deve ser testado com os 2 usuários migrados; configurar `Site URL`, Redirect URLs, Google no Supabase se necessário. Sessões antigas do Lovable não são reaproveitadas.
3. E-mails, assistente Astra, edição de imagens por IA e Google Maps chamam conectores/serviços Lovable; **não migram automaticamente**. A distância tarifada, geocodificação e integração Alfa podem precisar de chaves próprias. Não habilitar checkout dependente dessas funções antes de adaptar.
4. Programação de pedidos: cron de liberação e secrets não estão configurados na Cloudflare; pedidos agendados podem ficar parados.
5. Push notifications: `VAPID_PRIVATE_JWK` e testes necessários.
6. RLS: `relrowsecurity=true` não comprova que permissões estão corretas. Testar visitante, admin e chamadas service-role.
7. Vídeo faltante em um produto (`uploads/0aa83781-bd6c-4d22-9a5c-27002994db2c.mp4`).
8. Cópia do banco foi feita em 17/11/2026: sincronizar pedidos, estoque, clientes e configurações feitos depois do backup antes do corte.
9. Cloudflare Workers Free tem limites de CPU/requisições/tamanho de bundle. Verificar consumo e políticas de segurança antes de produção.
10. Domínio da Thaís: só ajustar nameservers/DNS após aprovação integral e backup dos registros existentes.

## Segurança

Não faça `git push --force`, não commite `.env`, nunca coloque `service_role` em variáveis de build `VITE_`, e mantenha serviços da XPForge separados.
