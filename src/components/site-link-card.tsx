import { useState } from "react";
import { Link2, Copy, Check, MessageCircle, Instagram, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { INSTAGRAM_URL } from "@/lib/products";
import { ShareLinkBuilder } from "@/components/share-link-builder";

export function SiteLinkCard() {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const url = "https://s7venlounge.shop";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <section aria-label="Link do site" className="mt-6 rounded-2xl border bg-card p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <Link2 className="size-4 text-primary" />
        Link do seu catálogo
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Copie e divulgue no WhatsApp, Instagram e onde quiser.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <input
          readOnly
          value={url}
          aria-label="Endereço do site"
          className="field flex-1 font-mono text-sm"
          onFocus={(e) => e.target.select()}
        />
        <Button onClick={copy} className="shrink-0">
          {copied ? <Check /> : <Copy />}
          {copied ? "Copiado!" : "Copiar"}
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm" className="text-whatsapp">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Confira o catálogo da S7VEN Lounge e Tabacaria e faça seu pedido: ${url}`)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle />
            Enviar no WhatsApp
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
            <Instagram />
            Abrir Instagram
          </a>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowQr((prev) => !prev)}
        >
          <QrCode />
          {showQr ? "Ocultar QR Code" : "QR Code para mesas"}
        </Button>
      </div>
      {showQr && (
        <div className="mt-4 flex flex-col items-center justify-center rounded-xl border bg-background p-4 text-center">
          <p className="mb-3 text-xs text-muted-foreground">
            Aponte a câmera para abrir o catálogo ou imprima para colocar nas mesas e balcão:
          </p>
          <div className="rounded-lg bg-white p-3 shadow-xs">
            <QRCodeSVG value={url} size={160} />
          </div>
          <p className="mt-2 font-mono text-xs text-muted-foreground">{url}</p>
        </div>
      )}
      <ShareLinkBuilder />
    </section>
  );
}
