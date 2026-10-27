import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Acesso à loja — S7VEN" },
      { name: "description", content: "Acesso seguro às configurações da S7VEN Lounge e Tabacaria." },
      { property: "og:title", content: "Acesso à loja — S7VEN" },
      { property: "og:description", content: "Entre na área de administração da S7VEN." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "reset" | "password">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) {
      setMode("password");
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/painel" });
    });
  }, [navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        setMessage(
          error
            ? "Não foi possível enviar o e-mail. Tente novamente."
            : "Se a conta existir, você receberá um e-mail para redefinir a senha.",
        );
      } else if (mode === "password") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) setMessage("Não foi possível atualizar a senha.");
        else await navigate({ to: "/painel" });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        setMessage(
          error
            ? "Não foi possível criar a conta. Confira os dados ou tente entrar."
            : "Confira seu e-mail para confirmar a conta antes de entrar.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error)
          setMessage("E-mail ou senha incorretos, ou conta ainda não confirmada.");
        else await navigate({ to: "/painel" });
      }
    } catch {
      setMessage("Não foi possível conectar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    setMessage("");
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth`,
      });
      if (result && !result.error) {
        if (!result.redirected) await navigate({ to: "/painel" });
        return;
      }
      const { error: supaErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/painel` },
      });
      if (supaErr) setMessage(supaErr.message || "Não foi possível entrar com Google.");
    } catch (err) {
      const text = err instanceof Error ? err.message : "Não foi possível conectar ao Google.";
      setMessage(text);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen px-5 py-8">
      <Button asChild variant="ghost">
        <a href="/">
          <ArrowLeft />
          Ir ao catálogo
        </a>
      </Button>
      <main className="mx-auto mt-16 max-w-sm">
        <p className="font-display text-4xl font-extrabold">
          S<span className="text-primary">7</span>VEN.
        </p>
        <div className="mb-7 mt-10 flex items-start gap-3">
          <LockKeyhole className="mt-1 text-primary" />
          <div>
            <h1 className="font-display text-2xl font-semibold">
              {mode === "signup"
                ? "Criar sua conta"
                : mode === "reset"
                  ? "Recuperar acesso"
                  : mode === "password"
                    ? "Nova senha"
                    : "Área da loja"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Acesso restrito à administração.
            </p>
          </div>
        </div>
        {(mode === "login" || mode === "signup") && (
          <>
            <Button
              variant="outline"
              disabled={busy}
              className="h-12 w-full"
              onClick={google}
            >
              Continuar com Google <ArrowRight />
            </Button>
            <div className="my-6 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              ou com seu e-mail
              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}
        <form onSubmit={submit} className="space-y-4">
          {mode !== "password" && (
            <label className="block text-sm">
              E-mail
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field mt-2"
              />
            </label>
          )}
          {mode !== "reset" && (
            <label className="block text-sm">
              Senha
              <input
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field mt-2"
              />
            </label>
          )}
          {message && (
            <p role="status" className="text-sm text-primary">
              {message}
            </p>
          )}
          <Button disabled={busy} className="h-12 w-full" type="submit">
            {busy
              ? "Aguarde…"
              : mode === "signup"
                ? "Criar conta"
                : mode === "reset"
                  ? "Enviar e-mail"
                  : mode === "password"
                    ? "Salvar nova senha"
                    : "Entrar"}
            <ArrowRight />
          </Button>
        </form>
        <div className="mt-5 flex flex-wrap justify-between gap-2">
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setMode(mode === "reset" ? "login" : "reset");
              setMessage("");
            }}
          >
            <Mail />
            {mode === "reset" ? "Voltar para entrar" : "Esqueci a senha"}
          </Button>
        </div>
      </main>
    </div>
  );
}
