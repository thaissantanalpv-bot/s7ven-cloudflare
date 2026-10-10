import { parsePhoneNumberFromString, AsYouType } from 'libphonenumber-js/max';
import { z } from 'zod';
const DDDS = new Set(['11','12','13','14','15','16','17','18','19','21','22','24','27','28','31','32','33','34','35','37','38','41','42','43','44','45','46','47','48','49','51','53','54','55','61','62','63','64','65','66','67','68','69','71','73','74','75','77','79','81','82','83','84','85','86','87','88','89','91','92','93','94','95','96','97','98','99']);
function nationalDigits(value: string) {
  const digits=value.replace(/\D/g,'');
  return (digits.length > 11 && digits.startsWith('55')) || value.trim().startsWith('+55') ? digits.slice(2) : digits;
}
export function formatBrazilPhone(value: string) { return new AsYouType('BR').input(nationalDigits(value).slice(0,11)); }
export function phoneError(value: string): string {
  const digits = nationalDigits(value);
  if (!digits) return 'Informe seu número de WhatsApp com DDD.';
  if (digits.length !== 10 && digits.length !== 11) return 'Número incompleto: informe o DDD e os 8 ou 9 dígitos do telefone.';
  if (!DDDS.has(digits.slice(0,2))) return 'DDD inválido. Confira os dois primeiros dígitos.';
  const parsed=parsePhoneNumberFromString(`+55${digits}`);
  if (!parsed?.isValid() || parsed.country !== 'BR') return 'Número inválido. Para celular, use 9 após o DDD e confira os demais dígitos.';
  return '';
}
export const brazilPhoneSchema=z.string().max(30,'Número muito longo. Informe somente DDD e telefone.').superRefine((value,ctx)=>{const message=phoneError(value);if(message)ctx.addIssue({code:'custom',message});}).transform(value=>`55${nationalDigits(value)}`);
export function normalizePhone(value: string) { return `55${nationalDigits(value)}`; }
