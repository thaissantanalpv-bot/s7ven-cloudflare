import { useMemo } from "react";
import { Clock, Store, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scheduleSlots } from "@/lib/order-schedule";
import type { StoreSettings } from "@/lib/store-settings";

export function OrderSchedulePicker({ settings, now, fulfillment, at, onFulfillment, onChange, compact = false }: {
  settings: StoreSettings;
  now: Date;
  fulfillment: "delivery" | "pickup";
  at: string;
  onFulfillment: (value: "delivery" | "pickup") => void;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const slots = useMemo(() => scheduleSlots(settings, fulfillment, now), [settings, fulfillment, now]);
  const dates = [...new Set(slots.map(s => s.date))];
  const selected = slots.find(s => s.at === at);
  const date = selected?.date ?? dates[0] ?? "";
  const times = slots.filter(s => s.date === date);
  const controls = (
    <div className="min-w-0 space-y-3">
      {!compact && <p className="flex items-center gap-2 text-sm font-semibold"><Clock className="size-4 shrink-0 text-primary" />Agendar para outro dia e horário</p>}
      {!compact && <div role="group" aria-label="Modalidade do agendamento" className="grid grid-cols-2 gap-2">
        <Button size="sm" variant={fulfillment === "pickup" ? "default" : "outline"} aria-pressed={fulfillment === "pickup"} onClick={() => onFulfillment("pickup")}><Store />Retirada</Button>
        <Button size="sm" variant={fulfillment === "delivery" ? "default" : "outline"} aria-pressed={fulfillment === "delivery"} onClick={() => onFulfillment("delivery")}><Truck />Entrega</Button>
      </div>}
      {dates.length ? <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
        <label className="min-w-0 text-xs font-medium">Dia
          <select aria-label="Dia do agendamento" className="field mt-1 min-w-0" value={date} onChange={e => onChange(slots.find(s => s.date === e.target.value)?.at ?? "")}>
            {dates.map(d => <option key={d} value={d}>{new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "2-digit" }).format(new Date(`${d}T12:00:00-03:00`))}</option>)}
          </select>
        </label>
        <label className="min-w-0 text-xs font-medium">Horário
          <select aria-label="Horário do agendamento" className="field mt-1 min-w-0" value={selected?.at ?? ""} onChange={e => onChange(e.target.value)}>
            <option value="">Selecione</option>
            {times.map(s => <option key={s.at} value={s.at}>{s.time}</option>)}
          </select>
        </label>
      </div> : <p role="status" className="text-sm text-muted-foreground">Nenhum horário disponível para esta modalidade.</p>}
      {at && !selected && <p role="alert" className="text-xs text-destructive">O horário escolhido não está mais disponível.</p>}
      {at && <Button size="sm" variant="link" className="h-auto px-0" onClick={() => onChange("")}>Remover agendamento</Button>}
    </div>
  );
  if (!compact) return controls;
  return (
    <details key={at ? "scheduled" : "optional"} open={at ? true : undefined} className="border-b py-2">
      <summary className="cursor-pointer text-xs font-medium text-primary">{at ? `Agendado · ${selected?.date.slice(8, 10) ?? ""}/${selected?.date.slice(5, 7) ?? ""} às ${selected?.time ?? ""}` : "Agendar para outro dia e horário"}</summary>
      <div className="pt-3">{controls}</div>
    </details>
  );
}