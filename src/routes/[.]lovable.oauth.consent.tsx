import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { oauthConsent } from "@/lib/oauth-consent";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  staticData: { sitemap: false },
  validateSearch: (s: Record<string, unknown>) => ({ authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "" }),
  head: () => ({ meta: [
    { title: "Conectar assistente — S7VEN" },
    { name: "description", content: "Autorize a consulta do catálogo S7VEN por um assistente na sua conta." },
    { property: "og:title", content: "Conectar assistente — S7VEN" },
    { property: "og:description", content: "Controle as conexões de assistentes com a S7VEN." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Este link de conexão está incompleto. Inicie a conexão novamente no assistente.");
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error("Não foi possível verificar sua conta. Tente novamente.");
    if (!data.session) throw redirect({ to: "/auth", search: { next: location.pathname + location.searchStr + location.hash } });
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id");
    if (!id) throw new Error("Link de conexão incompleto.");
    const { data, error } = await oauthConsent.getAuthorizationDetails(id);
    if (error || !data) throw new Error("Esta conexão expirou ou não está disponível. Inicie novamente no assistente.");
    const immediate = data.redirect_url ?? data.redirect_to;
    if (immediate && !data.client) throw redirect({ href: immediate });
    const { data: account, error: accountError } = await supabase.auth.getUser();
    if (accountError || !account.user) throw new Error("Entre novamente na sua conta para continuar.");
    return { details: data, email: account.user.email };
  },
  pendingComponent: () => <main className="mx-auto max-w-md px-5 py-16" role="status">Carregando conexão…</main>,
  errorComponent: ({ error }) => <main className="mx-auto max-w-md px-5 py-16"><img src="/logo-s7ven.png" alt="S7VEN" className="mb-8 h-20 w-auto" /><h1 className="text-2xl font-semibold">Conexão indisponível</h1><p role="alert" className="mt-4 text-muted-foreground">{error instanceof Error ? error.message : "Não foi possível carregar a conexão."}</p><Button asChild variant="outline" className="mt-6"><a href="/">Voltar ao catálogo</a></Button></main>,
  component: Consent,
});

function Consent() {
  const { details, email } = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = details.client?.name ?? details.client?.client_name ?? "Assistente";
  const scopes = details.scopes ?? (details.scope ?? "").split(" ").filter(Boolean);
  const scopeNames: Record<string, string> = { openid: "Identificação da sua conta", email: "Seu endereço de e-mail", profile: "Seu perfil básico" };
  async function decide(approve: boolean) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = approve ? await oauthConsent.approveAuthorization(authorization_id) : await oauthConsent.denyAuthorization(authorization_id);
      if (result.error) throw new Error("Não foi possível concluir sua escolha. Tente novamente.");
      const target = result.data?.redirect_url ?? result.data?.redirect_to;
      if (!target) throw new Error("Não foi possível voltar ao assistente. Inicie a conexão novamente.");
      window.location.assign(target);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível concluir. Tente novamente.");
      setBusy(false);
    }
  }
  async function switchAccount() {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    if (error) { setError("Não foi possível sair da conta."); setBusy(false); return; }
    window.location.assign(`/auth?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }
  return <main className="mx-auto max-w-md px-5 py-12">
    <img src="/logo-s7ven.png" alt="S7VEN" className="mb-8 h-20 w-auto object-contain" />
    <h1 className="break-words text-2xl font-semibold">Conectar {name} à S7VEN</h1>
    <div className="my-6 border-y border-border py-4"><p className="break-all text-sm">{email}</p><Button variant="link" size="sm" disabled={busy} onClick={switchAccount}>Trocar conta</Button></div>
    <p>{name} poderá consultar produtos, preços, opções e disponibilidade da loja usando sua conta.</p>
    {details.redirect_uri && <p className="mt-4 break-all text-sm text-muted-foreground">Destino: {details.redirect_uri}</p>}
    {scopes.length > 0 && <ul className="mt-4 list-inside list-disc space-y-2 text-sm">{scopes.map(scope => <li key={scope}>{scopeNames[scope] ?? `Permissão adicional solicitada: ${scope}`}</li>)}</ul>}
    <p className="mt-5 text-sm text-muted-foreground">Essa conexão não permite alterar a loja, acessar dados de clientes ou contornar suas permissões.</p>
    {error && <p role="alert" className="mt-4 text-destructive">{error}</p>}
    <div className="mt-8 flex flex-wrap gap-3"><Button disabled={busy} onClick={() => decide(true)}>{busy ? "Aguarde…" : "Permitir conexão"}</Button><Button disabled={busy} variant="outline" onClick={() => decide(false)}>Cancelar conexão</Button></div>
  </main>;
}