import { ordersOpen, saoPauloClock, type StoreSettings } from "./store-settings";

export function scheduleSlots(settings: StoreSettings, fulfillment: "delivery" | "pickup", now = new Date()) {
  if (!settings.hours_enabled || settings.paused) return [];
  const today = saoPauloClock(now).date;
  const start = new Date(`${today}T00:00:00-03:00`).getTime();
  const slots: { at: string; date: string; time: string }[] = [];
  for (let day = 0; day < 30; day++) {
    for (let minute = 0; minute < 1440; minute += 30) {
      const instant = new Date(start + (day * 1440 + minute) * 60000);
      if (instant.getTime() <= now.getTime()) continue;
      const status = ordersOpen(settings, instant);
      if (!status.open || (fulfillment === "delivery" && !status.delivery)) continue;
      const clock = saoPauloClock(instant);
      slots.push({ at: instant.toISOString(), date: clock.date, time: clock.current });
    }
  }
  return slots;
}

export function validateSchedule(settings: StoreSettings, at: string, fulfillment: "delivery" | "pickup", now = new Date()) {
  const chosen = new Date(at);
  if (!Number.isFinite(chosen.getTime()) || !scheduleSlots(settings, fulfillment, now).some(s => s.at === chosen.toISOString())) {
    throw new Error("Esse horário não está disponível. Escolha outro dia e horário para o pedido.");
  }
  return { at: chosen, label: scheduleLabel(chosen) };
}

export function scheduleLabel(at: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(at);
}