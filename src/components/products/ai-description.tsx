import { useState } from "react";
import { Sparkles, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { ProductDraft } from "@/lib/catalog";

/** Optional AI helper: drafts a short description from the web; nothing changes until the admin taps "Usar". */
export function AiDescription({ draft, onUse, onBusy }: { draft: ProductDraft; onUse: (text: string) => void; onBusy: (busy: boolean) => void }) {
  const [suggestion, setSuggestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const generate = async () => {
    if (draft.name.trim().length < 2) { setError("Escreva o nome do produto antes de usar a IA."); return; }
    setBusy(true); onBusy(true); setError(""); setSuggestion("");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Entre novamente para usar a IA.");
      const res = await fetch("/api/describe-product", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ name: draft.name, category: draft.category, optionLabel: draft.optionLabel, variations: draft.variations.map(v => v.name).filter(Boolean), photo: draft.image }),
      });
      const body = await res.json().catch(() => ({})) as { description?: string; error?: string };
      if (!res.ok || !body.description) throw new Error(body.error ?? "A IA não conseguiu criar a descrição agora.");
      setSuggestion(body.description);
    } catch (e) { setError(e instanceof Error ? e.message : "A IA não conseguiu criar a descrição agora."); }
    finally { setBusy(false); onBusy(false); }
  };
  return <div className="mt-2 space-y-2">
    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void generate()}><Sparkles />{busy ? "Pesquisando o produto…" : suggestion ? "Gerar outra descrição" : "Sugerir descrição com IA"}</Button>
    {suggestion && <div className="space-y-2 rounded border border-primary/40 bg-primary/5 p-3" aria-label="Descrição sugerida pela IA">
      <p className="text-xs font-medium text-primary">Sugestão da IA · confira antes de usar</p>
      <p className="whitespace-pre-line text-sm">{suggestion}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => { onUse(suggestion); setSuggestion(""); }}><Check />Usar esta descrição</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setSuggestion("")}><X />Descartar</Button>
      </div>
    </div>}
    {!suggestion && !error && <p className="text-xs text-muted-foreground">Opcional: a IA pesquisa o produto na internet e sugere um texto curto. Cada sugestão consome créditos de IA.</p>}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </div>;
}
