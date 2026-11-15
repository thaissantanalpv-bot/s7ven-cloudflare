import { describe, expect, it } from "vitest";
import { scheduleSlots, validateSchedule } from "@/lib/order-schedule";
import { EMPTY_SETTINGS } from "@/lib/store-settings";

const now = new Date("2026-11-15T05:00:00Z");
const settings = { ...EMPTY_SETTINGS, hours_enabled: true, opening_hours: EMPTY_SETTINGS.opening_hours.map(h => ({ ...h, enabled: h.day !== 1, open: "16:00", close: "01:00" })), special_days: [{ date: "2026-11-16", label: "Especial", enabled: true, open: "20:00", close: "01:00" }] };
describe("Agendamento de retirada e entrega", () => {
  it("respeita o horário semanal e não aceita a loja fechada", () => {
    expect(validateSchedule(settings, "2026-11-15T19:00:00Z", "pickup", now).at.toISOString()).toBe("2026-11-15T19:00:00.000Z");
    expect(() => validateSchedule(settings, "2026-11-15T18:30:00Z", "pickup", now)).toThrow();
  });
  it("substitui a segunda fechada pelo horário especial cadastrado", () => {
    expect(validateSchedule(settings, "2026-11-16T23:00:00Z", "pickup", now).at.toISOString()).toBe("2026-11-16T23:00:00.000Z");
    expect(() => validateSchedule(settings, "2026-11-16T19:00:00Z", "pickup", now)).toThrow();
    expect(scheduleSlots({ ...settings, special_days: [] }, "pickup", now).some(s => s.date === "2026-11-16" && s.time === "20:00")).toBe(false);
  });
  it("permite retirada após meia-noite e bloqueia entrega após 23h", () => {
    expect(validateSchedule(settings, "2026-11-17T03:30:00Z", "pickup", now).at.toISOString()).toBe("2026-11-17T03:30:00.000Z");
    expect(() => validateSchedule(settings, "2026-11-17T03:30:00Z", "delivery", now)).toThrow();
    expect(() => validateSchedule(settings, "2026-11-17T02:00:00Z", "delivery", now)).toThrow();
  });
  it("recusa horários passados e pedidos pausados", () => {
    expect(() => validateSchedule(settings, "2026-11-15T03:30:00Z", "pickup", now)).toThrow();
    expect(scheduleSlots({ ...settings, paused: true }, "pickup", now)).toEqual([]);
  });
});