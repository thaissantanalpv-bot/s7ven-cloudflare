import { render,screen,fireEvent,cleanup } from '@testing-library/react';
import { afterEach,describe,it,expect } from 'vitest';
import { useState } from 'react';
import { brazilPhoneSchema,formatBrazilPhone,phoneError } from '@/lib/phone';
import { PhoneField } from '@/components/orders/phone-field';
afterEach(cleanup);
describe('Brazilian WhatsApp validation',()=>{
 it('formats mobile, landline and international paste',()=>{expect(formatBrazilPhone('18999999999')).toBe('(18) 99999-9999');expect(formatBrazilPhone('1833334444')).toBe('(18) 3333-4444');expect(formatBrazilPhone('+55 18 99999-9999')).toBe('(18) 99999-9999');});
 it('returns clear errors and normalizes valid numbers',()=>{expect(phoneError('')).toContain('Informe');expect(phoneError('18999')).toContain('incompleto');expect(phoneError('20999999999')).toContain('DDD inválido');expect(phoneError('18888888888')).toContain('Número inválido');expect(brazilPhoneSchema.parse('(18) 99999-9999')).toBe('5518999999999');expect(brazilPhoneSchema.safeParse('18000000000').success).toBe(false);});
 it('shows blur errors and clears them when corrected',()=>{function Demo(){const[value,setValue]=useState('');return <PhoneField value={value} onChange={setValue} submitted={false}/>;}render(<Demo/>);const input=screen.getByRole('textbox');fireEvent.change(input,{target:{value:'18999'}});fireEvent.blur(input);expect(screen.getByRole('alert')).toHaveTextContent('incompleto');fireEvent.change(input,{target:{value:'18999999999'}});expect(input).toHaveValue('(18) 99999-9999');expect(screen.queryByRole('alert')).not.toBeInTheDocument();});
});
