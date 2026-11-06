import { useState } from "react";
import { Link2, Copy, Check, MessageCircle, Instagram, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { INSTAGRAM_URL } from "@/lib/products";
import { ShareLinkBuilder } from "@/components/share-link-builder";
import { StoriesTools } from "@/components/stories-tools";

/** Tela "Divulgar" do painel: ferramentas de marketing agrupadas em cards temáticos. */
export function MarketingTools() {
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
    <section className="space-y-5 py-7" aria-label="Divulgação e redes sociais">
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <Instagram className="size-4 text-primary" />
          Central do Instagram
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Gere o link direto de uma categoria ou produto para a figurinha de link dos Stories.
        </p>
        <div className="mt-4">
          <ShareLinkBuilder />
        </div>
        <div className="mt-4">
          <StoriesTools />
        </div>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
            <Instagram />
            Abrir Instagram da loja
          </a>
        </Button>
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <Link2 className="size-4 text-primary" />
          WhatsApp & link da bio
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Copie o endereço do catálogo para a bio do Instagram ou envie direto no WhatsApp.
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
            {copied ? "Copiado!" : "Copiar link"}
          </Button>
        </div>
        <Button asChild className="mt-3 w-full bg-whatsapp text-primary-foreground hover:bg-whatsapp/90">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Confira o catálogo da S7VEN Lounge e Tabacaria e faça seu pedido: ${url}`)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle />
            Compartilhar catálogo no WhatsApp
          </a>
        </Button>
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <QrCode className="size-4 text-primary" />
          Atendimento presencial (Lounge)
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          QR Code para mesas e balcão: o cliente aponta a câmera e abre o catálogo.
        </p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowQr((prev) => !prev)}>
          <QrCode />
          {showQr ? "Ocultar QR Code" : "Gerar QR Code para mesa"}
        </Button>
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
      </div>
    </section>
  );
}
