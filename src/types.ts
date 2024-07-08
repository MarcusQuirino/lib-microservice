export type EventResponse = {
  data: {}
  error?: {
    status: number
    message: string
  }
}

export type EventHandler = {
  (...args: any[]): EventResponse
}
