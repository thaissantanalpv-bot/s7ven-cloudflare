// Chave Pix da loja (CPF) e geração do QR Code "BR Code" (Pix Copia e Cola)
import { STORE_NAME } from "./products";

export const PIX_KEY = "46713887821";
export const PIX_CITY = "ARACATUBA";

const pad = (n: number) => String(n).padStart(2, "0");

/** Monta um campo EMV: ID + tamanho (2 dígitos) + valor. */
const f = (id: string, value: string) => `${id}${pad(value.length)}${value}`;

/** CRC16-CCITT (XModem), exigido pelo padrão do BR Code. */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Deixa o texto no formato aceito pelo Banco Central: maiúsculas, sem acentos. */
function emvText(value: string, max: number): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 .\-/]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/**
 * Gera o payload do Pix (copia e cola / QR Code).
 * Quando há valor, o QR já vem com o total preenchido.
 */
export function buildPixPayload(amount = 0): string {
  const account = f("00", "br.gov.bcb.pix") + f("01", PIX_KEY);
  let payload =
    f("00", "01") +
    f("01", amount > 0 ? "12" : "11") +
    f("26", account) +
    f("52", "0000") +
    f("53", "986");

  if (amount > 0) payload += f("54", amount.toFixed(2));

  payload +=
    f("58", "BR") +
    f("59", emvText(STORE_NAME, 25)) +
    f("60", emvText(PIX_CITY, 15)) +
    f("62", f("05", "***")) +
    "6304";

  return payload + crc16(payload);
}

/** Cópia para a área de transferência com alternativa para navegadores antigos. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

const STORE_NAME_FALLBACK = "S7VEN Lounge e Tabacaria";
