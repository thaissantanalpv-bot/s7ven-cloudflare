import { useState } from "react";
import { Bell, Volume2, VolumeX, Volume1, CheckCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button as UiButton } from "@/components/ui/button";
import { PushNotificationsCard } from "@/components/push-notifications";
import {
  getNotificationSettings,
  saveNotificationSettings,
  playWhatsAppChime,
  type NotificationSettings,
} from "@/lib/order-audio";

export function AdminSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(() => getNotificationSettings());
  const [tested, setTested] = useState(false);

  const update = (partial: Partial<NotificationSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveNotificationSettings(next);
  };

  const testAlert = (volOverride?: number) => {
    if (settings.soundEnabled) {
      const vol = volOverride ?? settings.volume ?? 80;
      if (settings.soundType === "whatsapp") {
        playWhatsAppChime(vol);
      } else {
        const audio = new Audio("/sounds/new-order-alert.mp3");
        audio.volume = Math.max(0, Math.min(1, vol / 100));
        void audio.play().catch(() => {});
      }
    }
    setTested(true);
    setTimeout(() => setTested(false), 2500);
  };

  return (
    <div className="space-y-6 py-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Bell className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Notificações de Novos Pedidos</h2>
            <p className="text-xs text-muted-foreground">
              Alertas sonoros e visuais estilo WhatsApp para computador e celular.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {/* Alerta sonoro */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-medium text-sm">
                <Volume2 className="size-4 text-primary" />
                Som de notificação de pedido
              </div>
              <p className="text-xs text-muted-foreground">
                Toca um alerta ao receber um novo pedido no catálogo.
              </p>
            </div>
            <Switch
              aria-label="Ativar som de notificação"
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => update({ soundEnabled: checked })}
            />
          </div>

          {/* Controle de Volume */}
          {settings.soundEnabled && (
            <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(settings.volume ?? 80) === 0 ? (
                    <VolumeX className="size-4 text-muted-foreground" />
                  ) : (settings.volume ?? 80) < 50 ? (
                    <Volume1 className="size-4 text-primary" />
                  ) : (
                    <Volume2 className="size-4 text-primary" />
                  )}
                  <span className="text-sm font-medium">Volume do alerta sonoro</span>
                </div>
                <span className="text-xs font-mono font-semibold text-primary">
                  {settings.volume ?? 80}%
                </span>
              </div>
              <Slider
                aria-label="Ajustar volume"
                min={0}
                max={100}
                step={5}
                value={[settings.volume ?? 80]}
                onValueChange={(val) => {
                  const vol = val[0] ?? 80;
                  update({ volume: vol });
                }}
                onValueCommit={(val) => {
                  const vol = val[0] ?? 80;
                  if (vol > 0) testAlert(vol);
                }}
              />
              <p className="text-[11px] text-muted-foreground">
                Arraste para aumentar ou diminuir. Solte o controle para ouvir a prévia.
              </p>
            </div>
          )}

          {/* Estilo do som */}
          {settings.soundEnabled && (
            <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Estilo do Alerta Sonoro
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => update({ soundType: "whatsapp" })}
                  className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors ${
                    settings.soundType === "whatsapp"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "bg-card hover:border-muted-foreground/30"
                  }`}
                >
                  <span className="text-sm">Estilo WhatsApp</span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Toque de mensagem rápido (Web Audio)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => update({ soundType: "classic" })}
                  className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors ${
                    settings.soundType === "classic"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "bg-card hover:border-muted-foreground/30"
                  }`}
                >
                  <span className="text-sm">Campainha Contínua</span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Toque de sirene em loop até atender
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Aviso no celular/computador mesmo com o painel fechado */}
          <PushNotificationsCard />

          {/* Testar notificação */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-4 border-t">
            <div>
              <p className="text-sm font-medium">Testar Notificação</p>
              <p className="text-xs text-muted-foreground">
                Verifique como o som e o alerta aparecem no seu aparelho agora.
              </p>
            </div>
            <UiButton
              variant="outline"
              onClick={() => testAlert()}
              className="flex items-center gap-2"
            >
              {tested ? <CheckCircle className="size-4 text-whatsapp" /> : <Volume2 className="size-4" />}
              {tested ? "Alerta Testado!" : "Testar som e alerta"}
            </UiButton>
          </div>
        </div>
      </div>
    </div>
  );
}
