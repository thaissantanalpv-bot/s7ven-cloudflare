import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setStorePaused } from "@/lib/store-settings.functions";
import { storeSettingsQuery, publicStoreSettingsQuery } from "@/lib/store-settings.query";

/** Um toque para pausar/retomar os pedidos do catálogo (o catálogo continua aberto para consulta). */
export function StorePauseButton() {
  const settings = useQuery(storeSettingsQuery);
  const client = useQueryClient();
  const save = useServerFn(setStorePaused);
  const [busy, setBusy] = useState(false);
  if (!settings.data) return null;
  const paused = settings.data.paused;
  const toggle = async () => {
    if (!paused && !window.confirm("Pausar os pedidos do catálogo agora? Os clientes ainda poderão ver os produtos.")) return;
    setBusy(true);
    try {
      await save({ data: { paused: !paused } });
      client.setQueryData(storeSettingsQuery.queryKey, { ...settings.data, paused: !paused });
      void client.invalidateQueries({ queryKey: publicStoreSettingsQuery.queryKey });
      toast.success(paused ? "Pedidos liberados no catálogo." : "Pedidos pausados no catálogo.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button variant={paused ? "destructive" : "outline"} onClick={toggle} disabled={busy} aria-pressed={paused}>
      {paused ? <Play /> : <Pause />}
      {paused ? "Pedidos pausados · Retomar" : "Pausar pedidos"}
    </Button>
  );
}
