import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, Copy } from "lucide-react";
import { copyToClipboard } from "@/lib/pix";

/**
 * Dado do pedido que copia o valor ao tocar, para colar em outro site
 * (o da entregadora, por exemplo) sem precisar digitar de novo.
 */
export function CopyField({
  icon: Icon,
  label,
  copyLabel,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  copyLabel: string;
  value: string;
  hint?: string;
}) {
  const [state, setState] = useState<"idle" | "done" | "fail">("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    const ok = await copyToClipboard(value);
    setState(ok ? "done" : "fail");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 1800);
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={`Copiar ${copyLabel}`}
      className="flex w-full items-start gap-2 rounded-lg border bg-background px-3 py-2 text-left transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="block break-words text-sm">{value}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <span
        className={`flex shrink-0 items-center gap-1 text-xs font-semibold ${
          state === "fail" ? "text-destructive" : state === "done" ? "text-whatsapp" : "text-muted-foreground"
        }`}
      >
        {state === "done" ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
        {state === "done" ? "Copiado" : state === "fail" ? "Falhou" : "Copiar"}
      </span>
    </button>
  );
}
