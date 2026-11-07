import { useEffect, useRef, useState } from "react";
import { Download, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "story-stickers";
type Item = { path: string; url: string };

/** Figurinhas enviadas pela administração; armazenamento privado, só administradores acessam. */
export function UploadedStickers() {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data, error } = await supabase.storage.from(BUCKET).list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } });
    if (error) { toast.error("Não foi possível carregar suas figurinhas."); return; }
    const files = (data ?? []).filter((f) => f.id);
    if (!files.length) { setItems([]); return; }
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(files.map((f) => f.name), 3600);
    setItems((signed ?? []).flatMap((s) => (s.signedUrl && s.path ? [{ path: s.path, url: s.signedUrl }] : [])));
  };
  useEffect(() => { void load(); }, []);

  const upload = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true);
    let ok = 0;
    for (const file of Array.from(list)) {
      if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) { toast.error(`${file.name}: envie imagens de até 5 MB.`); continue; }
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      const { error } = await supabase.storage.from(BUCKET).upload(`${crypto.randomUUID()}.${ext}`, file, { contentType: file.type });
      if (error) toast.error(`${file.name}: falha ao enviar.`); else ok++;
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    if (ok) toast.success(`${ok} figurinha(s) adicionada(s).`);
    await load();
  };

  const remove = async (path: string) => {
    if (!confirm("Remover esta figurinha?")) return;
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) { toast.error("Não foi possível remover."); return; }
    setItems((prev) => prev.filter((i) => i.path !== path));
  };

  const download = async (item: Item) => {
    const blob = await (await fetch(item.url)).blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = item.path;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Minhas figurinhas</h3>
          <p className="text-xs text-muted-foreground">Envie as figurinhas que você baixou (PNG transparente fica melhor).</p>
        </div>
        <Button size="sm" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}
          Adicionar figurinha
        </Button>
        <input ref={input} type="file" accept="image/*" multiple hidden aria-label="Arquivo da figurinha" onChange={(e) => void upload(e.target.files)} />
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhuma figurinha enviada ainda.</p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {items.map((item) => (
            <div key={item.path} className="rounded-lg border bg-muted/40 p-1">
              <img src={item.url} alt="Figurinha enviada" loading="lazy" className="aspect-square w-full object-contain" />
              <div className="mt-1 flex justify-between">
                <Button size="icon" variant="ghost" className="size-7" aria-label="Baixar figurinha" onClick={() => void download(item)}><Download /></Button>
                <Button size="icon" variant="ghost" className="size-7" aria-label="Remover figurinha" onClick={() => void remove(item.path)}><Trash2 /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
