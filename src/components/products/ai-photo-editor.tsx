import { useState } from "react";
import { Sparkles, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { streamImage } from "@/lib/photos/stream-image";

export function AiPhotoEditor({ source, productName, onApply, onBusy }: { source: string; productName: string; onApply: (file: File) => Promise<void>; onBusy: (busy: boolean) => void }) {
  const [prompt, setPrompt] = useState("Melhore nitidez e iluminação, mantendo o produto fiel à foto original.");
  const [result, setResult] = useState("");
  const [final, setFinal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const generate = async () => {
    const inputSource = final && result ? result : source;
    setBusy(true); onBusy(true); setError(""); setFinal(false);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Entre novamente para editar fotos.");
      const photo = await fetch(inputSource);
      if (!photo.ok) throw new Error("Não foi possível carregar a foto.");
      const blob = await photo.blob();
      const form = new FormData();
      form.set("image", new File([blob], "produto.png", { type: blob.type }));
      form.set("prompt", prompt); form.set("productName", productName);
      await streamImage("/api/edit-photo", form, (src, done) => { setResult(src); setFinal(done); }, undefined, { Authorization: `Bearer ${data.session.access_token}` });
    } catch(e) { setFinal(false); setError(e instanceof Error ? e.message : "Não foi possível editar a foto."); }
    finally { setBusy(false); onBusy(false); }
  };
  const apply = async () => {
    setBusy(true); onBusy(true); setError("");
    try {
      const blob = await (await fetch(result)).blob();
      await onApply(new File([blob], "produto-ia.png", { type: "image/png" }));
    } catch(e) { setError(e instanceof Error ? e.message : "Não foi possível aplicar a foto."); }
    finally { setBusy(false); onBusy(false); }
  };
  return <div className="space-y-3 border-y py-4" aria-label="Editor de fotos com IA">
    <h3 className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-primary" />Fotos com IA</h3>
    <div className="grid grid-cols-2 gap-3"><figure><img src={source} alt="Foto original" className="aspect-square w-full rounded bg-photo object-contain" /><figcaption className="mt-1 text-xs text-muted-foreground">Original</figcaption></figure><figure>{result ? <img src={result} alt="Foto editada com IA" className={`aspect-square w-full rounded bg-photo object-contain transition-[filter] ${final ? "blur-0" : "blur-2xl"}`} /> : <div className="grid aspect-square place-items-center rounded border bg-photo"><Sparkles className="text-photo-foreground" /></div>}<figcaption className="mt-1 text-xs text-muted-foreground">{busy ? "Editando…" : "Resultado"}</figcaption></figure></div>
    <label className="block text-sm">Alteração desejada<textarea className="field mt-1" rows={3} maxLength={2000} value={prompt} disabled={busy} onChange={e => setPrompt(e.target.value)} /></label>
    <p className="text-xs text-muted-foreground">Cada edição consome créditos de IA. Confira rótulos e detalhes antes de aplicar.</p>
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={busy || !prompt.trim()} onClick={generate}><Sparkles />{busy ? "Aguarde…" : result && final ? "Refinar resultado" : "Editar com IA"}</Button>{result && <><Button type="button" disabled={busy || !final} onClick={apply}><Check />Usar esta foto</Button><Button type="button" size="icon" variant="ghost" disabled={busy} aria-label="Voltar à foto original" title="Voltar à foto original" onClick={() => { setResult(""); setFinal(false); setError(""); }}><RotateCcw /></Button></>}</div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}