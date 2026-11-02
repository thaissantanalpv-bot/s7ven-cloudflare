import { useState } from "react";
import { CalendarPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DAYS, saoPauloClock, type SpecialDay, type StoreSettings } from "@/lib/store-settings";

const longDate = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${DAYS[d.getUTCDay()]}, ${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
};

/** Feriados e datas especiais: substituem o horário semanal só naquela data. */
export function SpecialDaysEditor({ draft, update }: { draft: StoreSettings; update: (next: StoreSettings) => void }) {
  const today = saoPauloClock().date;
  const [date, setDate] = useState(today);
  const days = [...draft.special_days].sort((a, b) => a.date.localeCompare(b.date));
  const exists = draft.special_days.some(d => d.date === date);

  const setDay = (target: string, patch: Partial<SpecialDay>) =>
    update({ ...draft, special_days: draft.special_days.map(d => (d.date === target ? { ...d, ...patch } : d)) });

  const add = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || exists) return;
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const regular = draft.opening_hours.find(h => h.day === weekday && h.enabled) ?? draft.opening_hours.find(h => h.enabled);
    // Datas que já passaram saem da lista ao adicionar uma nova.
    const kept = draft.special_days.filter(d => d.date >= today);
    update({ ...draft, special_days: [...kept, { date, label: "Feriado", enabled: true, open: regular?.open ?? "20:00", close: regular?.close ?? "01:00" }] });
  };

  return (
    <div className="mt-8 rounded-xl border bg-card p-4">
      <h3 className="text-lg font-semibold">Feriados e datas especiais</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Nessas datas vale o horário abaixo no lugar do horário da semana. As entregas continuam até o horário limite das entregas; depois, só retirada até fechar.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input type="date" aria-label="Data especial" className="field w-auto" min={today} value={date} onChange={e => setDate(e.target.value)} />
        <Button type="button" variant="outline" className="gap-2" disabled={!date || exists} onClick={add}>
          <CalendarPlus className="size-4" />
          {exists ? "Data já adicionada" : "Adicionar data"}
        </Button>
      </div>
      {days.length > 0 && (
        <div className="mt-4 divide-y">
          {days.map(d => (
            <div key={d.date} className={`flex flex-wrap items-center gap-3 py-4 ${d.date < today ? "opacity-60" : ""}`}>
              <div className="min-w-44 flex-1">
                <p className="text-sm font-medium">{longDate(d.date)}{d.date === today && <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary">Hoje</span>}</p>
                <input aria-label={`Nome da data ${d.date}`} className="field mt-2 max-w-60 py-1.5" placeholder="Ex.: Feriado" maxLength={60} value={d.label} onChange={e => setDay(d.date, { label: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch aria-label={`Abrir em ${d.date}`} checked={d.enabled} onCheckedChange={value => setDay(d.date, { enabled: value })} />
                {d.enabled ? "Aberto" : "Fechado"}
              </label>
              {d.enabled && (
                <div className="flex items-center gap-2">
                  <input aria-label={`Abertura ${d.date}`} type="time" className="field w-28" value={d.open} onChange={e => setDay(d.date, { open: e.target.value })} />
                  <span className="text-xs text-muted-foreground">até</span>
                  <input aria-label={`Fechamento ${d.date}`} type="time" className="field w-28" value={d.close} onChange={e => setDay(d.date, { close: e.target.value })} />
                  {d.open > d.close && <span className="text-xs text-muted-foreground">(+1 dia)</span>}
                </div>
              )}
              <Button type="button" variant="ghost" size="icon" aria-label={`Remover ${d.date}`} onClick={() => update({ ...draft, special_days: draft.special_days.filter(x => x.date !== d.date) })}>
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
