const PREFS_KEY = "s7ven_notification_settings";

export interface NotificationSettings {
  soundEnabled: boolean;
  soundType: "whatsapp" | "classic";
  browserEnabled: boolean;
  volume: number; // 0 a 100
}

export const DEFAULT_NOTIF_SETTINGS: NotificationSettings = {
  soundEnabled: true,
  soundType: "whatsapp",
  browserEnabled: false,
  volume: 80,
};

export function getNotificationSettings(): NotificationSettings {
  if (typeof window === "undefined") return DEFAULT_NOTIF_SETTINGS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULT_NOTIF_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_NOTIF_SETTINGS;
}

export function saveNotificationSettings(next: NotificationSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {}
}

// Web Audio API para tocar o bip característico duplo estilo WhatsApp
export function playWhatsAppChime(volumePercent?: number) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    const vol = Math.max(0, Math.min(100, volumePercent ?? getNotificationSettings().volume ?? 80)) / 100;

    // Primeiro tom (alto, curto)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(850, now);
    osc1.frequency.exponentialRampToValueAtTime(1150, now + 0.08);
    gain1.gain.setValueAtTime(Math.max(0.0001, 0.3 * vol), now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.1);

    // Segundo tom (mais agudo e brilhante estilo mensagem recebida)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(1150, now + 0.11);
    osc2.frequency.exponentialRampToValueAtTime(1550, now + 0.22);
    gain2.gain.setValueAtTime(Math.max(0.0001, 0.35 * vol), now + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.11);
    osc2.stop(now + 0.33);
  } catch {}
}

export async function requestBrowserNotification(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const perm = await Notification.requestPermission();
    return perm === "granted";
  } catch {
    return false;
  }
}

export function triggerBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: "/icons/s7ven-192.png",
      });
    } catch {}
  }
}
