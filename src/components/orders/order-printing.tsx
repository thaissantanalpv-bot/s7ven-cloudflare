import { useEffect, useRef, useState } from "react";
import { Printer, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Order } from "@/lib/orders";
import { DEFAULT_PRINTER, PRINTER_STORAGE_KEY, parsePrinterPreferences, orderReceiptHtml, type PrinterPreferences } from "@/lib/order-print";
export function OrderPrinting({ order, onClose }: { order: Order | null; onClose: () => void }) {
  const [preferences, setPreferences] = useState<PrinterPreferences>(DEFAULT_PRINTER);
  const [draft, setDraft] = useState<PrinterPreferences>(DEFAULT_PRINTER);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [html, setHtml] = useState("");
  const [ready, setReady] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    try { setPreferences(parsePrinterPreferences(localStorage.getItem(PRINTER_STORAGE_KEY))); } catch { /* Keep defaults when storage is blocked. */ }
  }, []);
  useEffect(() => {
    setReady(false); setError("");
    if (!order) { setHtml(""); return; }
    const tokens = getComputedStyle(document.documentElement);
    setHtml(orderReceiptHtml(order, preferences.paper, { paper: tokens.getPropertyValue("--receipt-paper").trim(), ink: tokens.getPropertyValue("--receipt-ink").trim() }));
  }, [order, preferences.paper]);
  const save = () => {
    setPreferences(draft);
    try { localStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(draft)); setMessage("Preferências salvas neste aparelho."); }
    catch { setMessage("Preferências aplicadas; este aparelho não permitiu salvá-las."); }
  };
  const print = () => {
    const target = frame.current?.contentWindow;
    if (!target || !ready) return;
    try { target.focus(); target.print(); } catch { setError("Não foi possível abrir a impressão. Tente pelo navegador do aparelho."); }
  };
  return <>
    <Button variant="outline" size="icon" title="Configurar impressora" aria-label="Configurar impressora" onClick={() => { setDraft(preferences); setMessage(""); setSettingsOpen(true); }}><Printer /></Button>
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Impressora térmica</DialogTitle>
        <DialogDescription>A impressora é escolhida na janela de impressão do aparelho. Bluetooth pode exigir o aplicativo ou driver do fabricante.</DialogDescription>
        <label className="block text-sm">Nome da impressora (identificação)<input className="field mt-2" maxLength={80} placeholder="Minha impressora" value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
        <label className="block text-sm">Largura da bobina<select className="field mt-2" value={draft.paper} onChange={event => setDraft({ ...draft, paper: parsePaperWidth(event.target.value) })}><option value="58">58 mm</option><option value="70">70 mm</option><option value="80">80 mm</option></select></label>
        {message && <p role="status" className="text-sm text-primary">{message}</p>}
        <Button onClick={save}><Save />Salvar preferências</Button>
      </DialogContent>
    </Dialog>
    <Dialog open={!!order} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogTitle>Imprimir pedido #{order?.number}</DialogTitle>
        <DialogDescription>{preferences.name || "Impressora térmica"} · Bobina {preferences.paper} mm</DialogDescription>
        <div className="flex justify-center overflow-hidden rounded-md bg-photo py-3">
          {html && <iframe ref={frame} title="Via impressa do pedido" className={`receipt-preview receipt-preview-${preferences.paper}`} srcDoc={html} onLoad={() => setReady(true)} />}
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button disabled={!ready} onClick={print}><Printer />Imprimir</Button>
      </DialogContent>
    </Dialog>
  </>;
}
