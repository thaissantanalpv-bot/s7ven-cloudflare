import { useEffect, useState } from "react";
import { Smartphone, Share, PlusSquare, EllipsisVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export function AdminAppAccess() {
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const mode = window.matchMedia("(display-mode: standalone)");
    const update = () => setInstalled(mode.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    update();
    mode.addEventListener("change", update);
    return () => mode.removeEventListener("change", update);
  }, []);
  if (installed) return null;
  return <>
    <Button variant="outline" size="icon" aria-label="Adicionar S7VEN à tela inicial" title="Adicionar à tela inicial" onClick={() => setOpen(true)}><Smartphone className="size-4" /></Button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-lg pb-8">
        <img src="/icons/s7ven-192.png" alt="S7VEN" width={64} height={64} className="mb-5 rounded-lg" />
        <SheetTitle>S7VEN na tela inicial</SheetTitle>
        <SheetDescription className="mt-3">Adicione o painel pelo navegador do celular. O ícone abrirá sua loja diretamente.</SheetDescription>
        <div className="mt-6 space-y-6 text-sm">
          <div><h3 className="mb-2 font-semibold">Android · Chrome</h3><p className="flex items-start gap-3 text-muted-foreground"><EllipsisVertical className="size-5 shrink-0" /><span>Abra o menu do navegador e escolha “Adicionar à tela inicial” ou “Instalar app”. Confirme em “Adicionar”.</span></p></div>
          <div><h3 className="mb-2 font-semibold">iPhone · Safari</h3><p className="flex items-start gap-3 text-muted-foreground"><Share className="size-5 shrink-0" /><span>Toque em Compartilhar, depois em “Adicionar à Tela de Início” e confirme em “Adicionar”.</span></p></div>
          <p className="border-t pt-4 text-xs text-muted-foreground">Use o endereço publicado da loja. O acesso continua protegido pela sua conta e precisa de internet.</p>
        </div>
        <Button className="mt-6 w-full" onClick={() => setOpen(false)}><PlusSquare className="size-4" />Entendi</Button>
      </SheetContent>
    </Sheet>
  </>;
}