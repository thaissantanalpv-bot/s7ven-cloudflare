import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, BellOff, CheckCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getPushPublicKey,
  removePushSubscription,
  savePushSubscription,
  sendTestPush,
} from "@/lib/push.functions";
import { PUSH_WORKER_SCOPE, PUSH_WORKER_URL, deviceLabelFromAgent } from "@/lib/push";

type PushState = "checking" | "unsupported" | "embedded" | "denied" | "off" | "on";

function supported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function keyBytes(key: string) {
  const b64 = key
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(key.length / 4) * 4, "=");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function activeRegistration() {
  const reg = await navigator.serviceWorker.register(PUSH_WORKER_URL, { scope: PUSH_WORKER_SCOPE });
  if (reg.active) return reg;
  const worker = reg.installing ?? reg.waiting;
  if (worker)
    await new Promise<void>((resolve) => {
      const check = () => {
        if (worker.state === "activated") resolve();
      };
      worker.addEventListener("statechange", check);
      check();
    });
  return reg;
}

async function existingSubscription() {
  const reg = await navigator.serviceWorker.getRegistration(PUSH_WORKER_SCOPE);
  return reg ? reg.pushManager.getSubscription() : null;
}

function toInput(sub: PushSubscription) {
  const json = sub.toJSON();
  return {
    endpoint: sub.endpoint,
    keys: { p256dh: json.keys?.["p256dh"] ?? "", auth: json.keys?.["auth"] ?? "" },
    deviceLabel: deviceLabelFromAgent(navigator.userAgent),
  };
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const getKey = useServerFn(getPushPublicKey);
  const save = useServerFn(savePushSubscription);
  const remove = useServerFn(removePushSubscription);
  const test = useServerFn(sendTestPush);

  useEffect(() => {
    if (!supported()) return setState("unsupported");
    if (window.self !== window.top) return setState("embedded");
    if (Notification.permission === "denied") return setState("denied");
    let alive = true;
    void existingSubscription()
      .then(async (sub) => {
        if (!alive) return;
        if (sub && Notification.permission === "granted") {
          setState("on");
          // Keep this device registered (the push service can renew it silently).
          await save({ data: toInput(sub) }).catch(() => {});
        } else setState("off");
      })
      .catch(() => alive && setState("off"));
    return () => {
      alive = false;
    };
  }, [save]);

  const enable = useCallback(async () => {
    setError("");
    setMessage("");
    if (!supported()) return setState("unsupported");
    if (window.self !== window.top) return setState("embedded");
    setBusy(true);
    try {
      const permission =
        Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const { publicKey } = await getKey();
      const reg = await activeRegistration();
      let sub = await reg.pushManager.getSubscription();
      const current = sub?.options.applicationServerKey;
      if (sub && current && new Uint8Array(current).join() !== keyBytes(publicKey).join()) {
        await sub.unsubscribe();
        sub = null;
      }
      sub ??= await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(publicKey),
      });
      await save({ data: toInput(sub) });
      setState("on");
      setMessage("Avisos ativados neste aparelho.");
    } catch (e) {
      setError(
        e instanceof Error && e.message.length < 120
          ? e.message
          : "Não foi possível ativar os avisos. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }, [getKey, save]);

  const disable = useCallback(async () => {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const sub = await existingSubscription();
      if (sub) {
        await remove({ data: { endpoint: sub.endpoint } }).catch(() => {});
        await sub.unsubscribe();
      }
      setState("off");
      setMessage("Avisos desativados neste aparelho.");
    } catch {
      setError("Não foi possível desativar os avisos.");
    } finally {
      setBusy(false);
    }
  }, [remove]);

  const sendTest = useCallback(async () => {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const sub = await existingSubscription();
      if (!sub) {
        setState("off");
        throw new Error("Ative os avisos neste aparelho antes de testar.");
      }
      await test({ data: { endpoint: sub.endpoint } });
      setMessage("Aviso de teste enviado. Ele chega em alguns segundos.");
    } catch (e) {
      setError(
        e instanceof Error && e.message.length < 120
          ? e.message
          : "O aviso de teste não foi enviado.",
      );
    } finally {
      setBusy(false);
    }
  }, [test]);

  return { state, busy, message, error, enable, disable, sendTest };
}

const stateText: Record<PushState, string> = {
  checking: "Conferindo este aparelho...",
  unsupported: "Este navegador não recebe avisos. No celular, use o Google Chrome.",
  embedded:
    "Abra o painel em s7venlounge.shop/painel (ou pelo ícone S7VEN do celular) para ativar.",
  denied:
    "Os avisos foram bloqueados. Toque no cadeado ao lado do endereço do site, em Permissões > Notificações, escolha Permitir e volte aqui.",
  off: "Desativado neste aparelho.",
  on: "Ativado: o aviso chega mesmo com o painel fechado e a tela bloqueada.",
};

export function PushNotificationsCard() {
  const push = usePushNotifications();
  return (
    <div className="space-y-3 border-t pt-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Smartphone className="size-4 text-primary" />
            Aviso de pedido novo no celular
          </div>
          <p className="text-xs text-muted-foreground">
            Chega na tela do celular como uma mensagem do WhatsApp, com som e vibração. Ative em
            cada celular ou computador que deve receber.
          </p>
          <p
            className={`text-xs font-medium ${push.state === "on" ? "text-primary" : push.state === "denied" ? "text-destructive" : "text-muted-foreground"}`}
          >
            {stateText[push.state]}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {push.state === "on" ? (
          <>
            <Button variant="outline" disabled={push.busy} onClick={push.sendTest}>
              <BellRing className="size-4" /> Enviar aviso de teste
            </Button>
            <Button variant="ghost" disabled={push.busy} onClick={push.disable}>
              <BellOff className="size-4" /> Desativar neste aparelho
            </Button>
          </>
        ) : push.state === "off" || push.state === "denied" ? (
          <Button disabled={push.busy} onClick={push.enable}>
            <BellRing className="size-4" />{" "}
            {push.busy ? "Ativando..." : "Ativar avisos neste aparelho"}
          </Button>
        ) : null}
      </div>
      {push.message && (
        <p className="flex items-center gap-1 text-xs text-primary" role="status">
          <CheckCircle className="size-3.5" /> {push.message}
        </p>
      )}
      {push.error && (
        <p className="text-xs text-destructive" role="alert">
          {push.error}
        </p>
      )}
    </div>
  );
}

/** Compact button for the orders board; hidden once this device already receives notifications. */
export function PushQuickButton() {
  const push = usePushNotifications();
  if (push.state !== "off" && push.state !== "denied") return null;
  return (
    <Button
      variant="outline"
      disabled={push.busy}
      onClick={push.enable}
      title={
        push.error ||
        (push.state === "denied"
          ? stateText.denied
          : "Receber aviso no celular quando chegar pedido")
      }
    >
      <BellRing className="size-4" />
      <span className="hidden sm:inline">
        {push.busy ? "Ativando..." : "Ativar avisos no celular"}
      </span>
    </Button>
  );
}
