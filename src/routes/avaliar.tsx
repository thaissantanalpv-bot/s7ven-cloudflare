import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Star, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ratingInfo, submitRating } from "@/lib/ratings.functions";

const LABELS = ["", "Muito ruim", "Ruim", "Regular", "Bom", "Excelente"];

export const Route = createFileRoute("/avaliar")({
  staticData: { sitemap: false },
  validateSearch: z.object({ pedido: z.string().optional(), k: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Avalie seu pedido — S7VEN Lounge e Tabacaria" },
      { name: "description", content: "Conte como foi seu pedido na S7VEN Lounge e Tabacaria." },
      { property: "og:title", content: "Avalie seu pedido — S7VEN Lounge e Tabacaria" },
      { property: "og:description", content: "Conte como foi seu pedido na S7VEN Lounge e Tabacaria." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RatePage,
});

function RatePage() {
  const { pedido, k } = Route.useSearch();
  const valid = z.string().uuid().safeParse(pedido).success && z.string().uuid().safeParse(k).success;
  const getInfo = useServerFn(ratingInfo);
  const send = useServerFn(submitRating);
  const info = useQuery({
    queryKey: ["rating-info", pedido, k],
    queryFn: () => getInfo({ data: { id: pedido!, token: k! } }),
    enabled: valid,
    retry: false,
  });
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!rating) return setError("Escolha de 1 a 5 estrelas.");
    setSending(true);
    setError("");
    try {
      await send({ data: { id: pedido!, token: k!, rating, comment } });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar sua avaliação.");
    } finally {
      setSending(false);
    }
  };

  const message = !valid
    ? "Link de avaliação inválido."
    : info.isError
      ? info.error instanceof Error ? info.error.message : "Não foi possível abrir a avaliação."
      : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-5 rounded-2xl border bg-card p-6 text-center shadow-sm">
        <img src="/logo-s7ven.png" alt="S7VEN Lounge e Tabacaria" className="mx-auto h-14 w-auto" />
        {message ? (
          <p className="text-sm text-muted-foreground">{message}</p>
        ) : info.isPending ? (
          <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" aria-label="Carregando" />
        ) : done || info.data?.rated ? (
          <div className="space-y-2">
            <Check className="mx-auto size-10 text-whatsapp" />
            <h1 className="font-display text-xl font-semibold">Obrigado pela avaliação!</h1>
            <p className="text-sm text-muted-foreground">Sua opinião ajuda a S7VEN a melhorar.</p>
          </div>
        ) : !info.data?.delivered ? (
          <p className="text-sm text-muted-foreground">A avaliação do seu pedido abre depois que ele for entregue.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-xl font-semibold">Como foi o seu pedido?</h1>
              <p className="text-sm text-muted-foreground">Toque nas estrelas para avaliar.</p>
            </div>
            <div className="flex justify-center gap-1" role="radiogroup" aria-label="Nota">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
                  onClick={() => { setRating(n); setError(""); }}
                  className="p-1"
                >
                  <Star className={`size-10 ${n <= rating ? "fill-gold text-gold" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <p className="h-5 text-sm font-medium">{LABELS[rating]}</p>
            <textarea
              className="field min-h-20 w-full resize-none text-sm"
              maxLength={300}
              placeholder="Quer deixar um comentário? (opcional)"
              aria-label="Comentário"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="h-11 w-full" disabled={sending} onClick={() => void submit()}>
              {sending && <Loader2 className="animate-spin" />}Enviar avaliação
            </Button>
          </div>
        )}
        <Link to="/" className="block text-sm text-primary underline-offset-2 hover:underline">Ver catálogo</Link>
      </div>
    </main>
  );
}
