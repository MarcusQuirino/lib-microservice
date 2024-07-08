import { createInvoice } from '../handlers/invoice'
import type { EventResponse, EventHandler } from '../../types'

function sla(): EventResponse {
  return { data: 'sla' }
}

export const events = new Map<string, EventHandler>([
  ['/invoice.post', createInvoice],
  ['/sla', sla],
])
