import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import express from 'express'
import { makeMicroservice } from '../index'

let app = express()
let microservice = makeMicroservice(app, 'test-microservice')

vi.mock('amqplib', () => ({
  connect: vi.fn().mockResolvedValue({
    createChannel: vi.fn().mockResolvedValue({
      assertQueue: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    }),
    close: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('mongodb', () => ({
  MongoClient: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    db: vi.fn().mockReturnValue({}),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}))

describe('Microservice', () => {
  beforeAll(async () => {
    await microservice.init()
  })

  afterAll(async () => {
    await microservice.shutdown()
  })

  it('should connect to RabbitMQ', async () => {
    const amqplib = await import('amqplib')
    expect(amqplib.connect).toHaveBeenCalledWith(process.env.RABBITMQ_URL)
  })

  it('should connect to MongoDB', async () => {
    const { MongoClient } = await import('mongodb')
    expect(MongoClient).toHaveBeenCalledWith(process.env.MONGODB_URL)
  })
})
