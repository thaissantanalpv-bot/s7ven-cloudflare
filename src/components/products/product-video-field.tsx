import { useEffect, useState } from "react";
import * as tus from "tus-js-client";
import { Trash2, Upload, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { MAX_VIDEO_BYTES, videoExtension, youtubeId, type ProductDraft } from "@/lib/catalog";

/** Resumable upload (6 MB chunks) so long phone videos survive slow or unstable connections. */
async function uploadVideo(file: File, path: string, contentType: string, onProgress: (pct: number) => void) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Entre novamente para enviar o vídeo.");
  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "x-upsert": "false" },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: { bucketName: "product-videos", objectName: path, contentType, cacheControl: "3600" },
      chunkSize: 6 * 1024 * 1024,
      onError: () => reject(new Error("Não foi possível enviar o vídeo. Confira a internet e tente de novo.")),
      onProgress: (sent, total) => onProgress(total ? Math.round((sent / total) * 100) : 0),
      onSuccess: () => resolve(),
    });
    upload.start();
  });
}

export function ProductVideoField({ draft, preview, onChange, onBusy }: { draft: ProductDraft; preview: string; onChange: (patch: Pick<ProductDraft, "video"> | Pick<ProductDraft, "youtube">) => void; onBusy: (busy: boolean) => void }) {
  const [videoUrl, setVideoUrl] = useState(preview);
  const [progress, setProgress] = useState<number | null>(null);
  const [link, setLink] = useState(draft.youtube ? `https://youtu.be/${draft.youtube}` : "");
  const [error, setError] = useState("");
  useEffect(() => () => { if (videoUrl.startsWith("blob:")) URL.revokeObjectURL(videoUrl); }, [videoUrl]);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    const ext = videoExtension(file);
    if (!ext) { setError("Use vídeo MP4, MOV ou WEBM."); return; }
    if (file.size > MAX_VIDEO_BYTES) { setError("O vídeo passa de 1 GB. Use o link do YouTube para vídeos maiores."); return; }
    const contentType = file.type || (ext === "mov" ? "video/quicktime" : `video/${ext}`);
    const path = `uploads/${crypto.randomUUID()}.${ext}`;
    setError(""); setProgress(0); onBusy(true);
    try {
      await uploadVideo(file, path, contentType, setProgress);
      setVideoUrl(URL.createObjectURL(file));
      onChange({ video: path });
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível enviar o vídeo."); }
    finally { setProgress(null); onBusy(false); }
  };
  return <div className="space-y-3 border-t pt-4">
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-semibold">Vídeo do produto</h3>
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary"><Upload className="size-4" />{progress !== null ? `Enviando… ${progress}%` : draft.video ? "Trocar vídeo" : "Enviar vídeo"}
        <input aria-label="Enviar vídeo do produto" type="file" accept="video/*" className="sr-only" disabled={progress !== null} onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; void pick(f); }} />
      </label>
    </div>
    <p className="text-xs text-muted-foreground">Sem limite de duração · até 1 GB por vídeo (MP4, MOV ou WEBM). Mantenha esta janela aberta durante o envio.</p>
    {progress !== null && <div className="h-2 overflow-hidden rounded bg-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>}
    {draft.video && <div className="space-y-2">
      {videoUrl ? <video src={videoUrl} controls playsInline preload="metadata" className="max-h-64 w-full rounded-md bg-photo" /> : <p className="text-sm text-muted-foreground">Vídeo enviado.</p>}
      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => { setVideoUrl(""); onChange({ video: "" }); }}><Trash2 />Remover vídeo</Button>
    </div>}
    <label className="block text-sm"><span className="flex items-center gap-2"><Youtube className="size-4" />Ou cole um link do YouTube (sem limite de tamanho)</span>
      <input className="field mt-1" inputMode="url" placeholder="https://youtu.be/…" value={link} onChange={e => {
        const text = e.target.value; setLink(text);
        const id = youtubeId(text);
        if (!text.trim()) { setError(""); onChange({ youtube: "" }); }
        else if (id) { setError(""); onChange({ youtube: id }); }
        else { setError("Link do YouTube inválido. Copie o link pelo botão Compartilhar do vídeo."); onChange({ youtube: "" }); }
      }} />
    </label>
    {draft.youtube && <p className="text-xs text-muted-foreground">O vídeo do YouTube aparece dentro do produto. Pode ser “não listado”, mas não “privado”.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
