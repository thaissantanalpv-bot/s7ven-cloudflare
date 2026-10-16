import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface OrderItemLine {
  name?: string
  option?: string
  qty?: number
  price?: number
}

interface Props {
  number?: number
  customerName?: string
  customerPhone?: string
  fulfillment?: string
  address?: string
  payment?: string
  changeFor?: string
  notes?: string
  items?: OrderItemLine[]
  subtotal?: number
  deliveryFee?: number
  total?: number
}

const brl = (v?: number) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const Email = ({
  number,
  customerName,
  customerPhone,
  fulfillment,
  address,
  payment,
  changeFor,
  notes,
  items = [],
  subtotal,
  deliveryFee,
  total,
}: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Novo pedido #{number ?? ''} — {customerName ?? 'cliente'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Novo pedido #{number ?? ''}</Heading>
        <Text style={text}>
          <strong>{customerName ?? 'Cliente'}</strong> · {customerPhone ?? ''}
        </Text>
        <Text style={text}>
          {fulfillment === 'pickup' ? 'Retirada no balcão' : `Entrega: ${address ?? ''}`}
        </Text>
        <Text style={text}>
          Pagamento: {payment ?? ''}
          {changeFor ? ` · Troco para ${changeFor}` : ''}
        </Text>
        {notes ? <Text style={text}>Observações: {notes}</Text> : null}
        <Hr style={hr} />
        <Section>
          {items.map((item, i) => (
            <Text key={i} style={itemLine}>
              {item.qty ?? 1}× {item.name ?? 'Item'}
              {item.option ? ` — ${item.option}` : ''} · {brl((item.price ?? 0) * (item.qty ?? 1))}
            </Text>
          ))}
        </Section>
        <Hr style={hr} />
        <Text style={text}>Subtotal: {brl(subtotal)}</Text>
        <Text style={text}>Taxa de entrega: {brl(deliveryFee)}</Text>
        <Text style={totalStyle}>Total: {brl(total)}</Text>
        <Text style={footer}>S7VEN Lounge e Tabacaria — aviso automático de novo pedido</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => `Novo pedido #${data.number ?? ''} — S7VEN`,
  displayName: 'Aviso de novo pedido',
  to: 'thais.santana.lpv@gmail.com',
  previewData: {
    number: 42,
    customerName: 'Maria Silva',
    customerPhone: '(18) 99999-0000',
    fulfillment: 'delivery',
    address: 'Rua Joaquim Cândido, 2282, Conjunto Residencial Toyokazu Kawata, Araçatuba, SP',
    payment: 'Pix',
    items: [
      { name: 'Energético Bally 2 Litros', option: '', qty: 2, price: 14.9 },
      { name: 'Gelo de Sabor', option: 'Cereja Ice', qty: 1, price: 8 },
    ],
    subtotal: 37.8,
    deliveryFee: 11.1,
    total: 48.9,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 24px', maxWidth: '520px' }
const heading = { color: '#111111', fontSize: '22px', margin: '0 0 12px' }
const text = { color: '#333333', fontSize: '14px', lineHeight: '22px', margin: '4px 0' }
const itemLine = { color: '#333333', fontSize: '14px', lineHeight: '22px', margin: '2px 0' }
const totalStyle = { color: '#111111', fontSize: '16px', fontWeight: 'bold' as const, margin: '8px 0' }
const hr = { borderColor: '#e5e5e5', margin: '16px 0' }
const footer = { color: '#999999', fontSize: '12px', marginTop: '24px' }
