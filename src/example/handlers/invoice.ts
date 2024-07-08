import type { EventResponse } from '../../types'

type InvoiceEvent = {
  data: {
    invoice: {
      buyerID: string
      amount: {
        totalAmount: number
        currencyCode: 'USD' | 'CAD' | 'BRL'
      }
      appID: string
    }
  }
}

export function createInvoice(event: InvoiceEvent): EventResponse {
  console.dir(event)
  return {
    data: 'invoice created',
  }
}
