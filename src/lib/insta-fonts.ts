// Unicode font styles for Instagram captions/stories: copy & paste anywhere.
// Each style maps A-Z a-z (and 0-9 when Unicode provides them) to styled codepoints.

type Range = { upper: number; lower: number; digits?: number };

const STYLES: { id: string; label: string; ranges: Range[] }[] = [
  { id: "bold", label: "Negrito", ranges: [{ upper: 0x1d400, lower: 0x1d41a, digits: 0x1d7ce }] },
  { id: "italic", label: "Itálico", ranges: [{ upper: 0x1d434, lower: 0x1d44e }] },
  { id: "bold-italic", label: "Negrito itálico", ranges: [{ upper: 0x1d468, lower: 0x1d482 }] },
  { id: "script", label: "Manuscrita", ranges: [{ upper: 0x1d49c, lower: 0x1d4b6 }] },
  { id: "script-bold", label: "Manuscrita forte", ranges: [{ upper: 0x1d4d0, lower: 0x1d4ea }] },
  { id: "fraktur", label: "Gótica", ranges: [{ upper: 0x1d504, lower: 0x1d51e }] },
  { id: "double", label: "Vazada", ranges: [{ upper: 0x1d538, lower: 0x1d552, digits: 0x1d7d8 }] },
  { id: "mono", label: "Máquina", ranges: [{ upper: 0x1d670, lower: 0x1d68a, digits: 0x1d7f6 }] },
  { id: "sans", label: "Moderna", ranges: [{ upper: 0x1d5a0, lower: 0x1d5ba, digits: 0x1d7e2 }] },
  { id: "sans-bold", label: "Moderna forte", ranges: [{ upper: 0x1d5d4, lower: 0x1d5ee, digits: 0x1d7ec }] },
];

// Letters whose styled glyph sits outside the sequential block.
const EXCEPTIONS: Record<number, number> = {
  0x1d455: 0x210e, // italic h
  0x1d49d: 0x212c, 0x1d4a0: 0x2130, 0x1d4a1: 0x2131, 0x1d4a3: 0x210b,
  0x1d4a4: 0x2110, 0x1d4a7: 0x2112, 0x1d4a8: 0x2133, 0x1d4ad: 0x211b,
  0x1d4ba: 0x212f, 0x1d4bc: 0x210a, 0x1d4c4: 0x2134,
  0x1d506: 0x212d, 0x1d50b: 0x210c, 0x1d50c: 0x2111, 0x1d515: 0x211c,
  0x1d51d: 0x2128,
  0x1d53a: 0x2102, 0x1d53f: 0x210d, 0x1d545: 0x2115, 0x1d547: 0x2119,
  0x1d548: 0x211a, 0x1d549: 0x211d, 0x1d551: 0x2124,
};

function mapChar(ch: string, ranges: Range[]): string {
  const code = ch.codePointAt(0)!;
  for (const r of ranges) {
    let target: number | null = null;
    if (code >= 65 && code <= 90) target = r.upper + (code - 65);
    else if (code >= 97 && code <= 122) target = r.lower + (code - 97);
    else if (code >= 48 && code <= 57 && r.digits !== undefined) target = r.digits + (code - 48);
    if (target !== null) return String.fromCodePoint(EXCEPTIONS[target] ?? target);
  }
  return ch;
}

export type InstaFont = { id: string; label: string; sample: string };

export const instaFonts: InstaFont[] = STYLES.map((s) => ({
  id: s.id,
  label: s.label,
  sample: "S7VEN Lounge",
}));

export function applyInstaFont(text: string, styleId: string): string {
  const style = STYLES.find((s) => s.id === styleId);
  if (!style) return text;
  return [...text].map((ch) => mapChar(ch, style.ranges)).join("");
}
