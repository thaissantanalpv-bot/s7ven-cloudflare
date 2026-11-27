import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEVEN_DELIVERY_TIERS, type StoreSettings } from "@/lib/store-settings";

export function DistanceTiersEditor({ settings, onChange }: { settings: StoreSettings; onChange: (s: StoreSettings) => void }) {
  return <div className="mt-5 space-y-4">
    <label className="block text-sm">Endereço de saída (rua, número, cidade e CEP)<input className="field mt-2" maxLength={300} value={settings.delivery_origin} onChange={e => onChange({ ...settings, delivery_origin: e.target.value })} /></label>
    <Button type="button" variant="outline" onClick={() => onChange({
      ...settings,
      delivery_distance_tiers: SEVEN_DELIVERY_TIERS.map((tier) => ({ ...tier })),
    })}>Preencher tabela da Seven</Button>
    {[...settings.delivery_distance_tiers].sort((a,b) => a.upToKm-b.upToKm).map((tier, index, tiers) => <div key={tier.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_36px] items-end gap-2 border-b py-3">
      <label className="text-xs">{index ? `Acima de ${tiers[index-1]?.upToKm} até (km)` : "Até (km)"}<input className="field mt-2" aria-label={`Limite km ${index+1}`} type="number" min="0.1" max="500" step="0.1" value={tier.upToKm} onChange={e => onChange({ ...settings, delivery_distance_tiers: settings.delivery_distance_tiers.map(t => t.id === tier.id ? { ...t, upToKm: Number(e.target.value) } : t) })} /></label>
      <label className="text-xs">Taxa (R$)<input className="field mt-2" aria-label={`Taxa km ${index+1}`} type="number" min="0" max="1000" step="0.01" value={tier.fee} onChange={e => onChange({ ...settings, delivery_distance_tiers: settings.delivery_distance_tiers.map(t => t.id === tier.id ? { ...t, fee: Number(e.target.value) } : t) })} /></label>
      <Button size="icon" variant="ghost" aria-label={`Excluir faixa ${index+1}`} onClick={() => onChange({ ...settings, delivery_distance_tiers: settings.delivery_distance_tiers.filter(t => t.id !== tier.id) })}><Trash2 /></Button>
    </div>)}
    <Button variant="outline" disabled={settings.delivery_distance_tiers.length >= 50} onClick={() => onChange({ ...settings, delivery_distance_tiers: [...settings.delivery_distance_tiers, { id: crypto.randomUUID(), upToKm: Math.max(0,...settings.delivery_distance_tiers.map(t => t.upToKm))+1, fee: 0 }] })}><Plus />Adicionar faixa</Button>
    <p className="text-xs text-muted-foreground">Distância pela rota de carro, somente ida. Fora da última faixa: retirada ou contato com a loja.</p>
  </div>;
}
