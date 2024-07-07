import express from 'express'
import type { Express, Request, Response, NextFunction } from 'express'
import { connect as amqpConnect, type Connection, type Channel, type ConsumeMessage } from 'amqplib'
import { MongoClient, Db } from 'mongodb'
import dotenv from 'dotenv'

dotenv.config()

type Microservice = {
  init: () => Promise<void>
  shutdown: () => Promise<void>
  app: () => Express
}

async function connectToRabbitMQ(
  serviceName: string,
  onMessage: (msg: ConsumeMessage | null) => void,
): Promise<{ connection: Connection; channel: Channel }> {
  try {
    const connection = await amqpConnect(process.env.RABBITMQ_URL as string)
    const channel = await connection.createChannel()
    await channel.assertQueue(serviceName)
    channel.consume(serviceName, onMessage)
    console.log('Connected to RabbitMQ and listening for messages')
    return { connection, channel }
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error)
    throw error
  }
}

async function connectToMongoDB(): Promise<{ client: MongoClient; db: Db }> {
  try {
    const client = new MongoClient(process.env.MONGODB_URL as string)
    await client.connect()
    const db = client.db()
    console.log('Connected to MongoDB')
    return { client, db }
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error)
    throw error
  }
}

export function makeMicroservice(app: Express, serviceName: string): Microservice {
  let rabbitMqConnection: Connection | null = null
  let rabbitMqChannel: Channel | null = null
  let mongoClient: MongoClient | null = null
  let db: Db | null = null

  const requestResponseMap = new Map<string, Response>()

  return {
    app: () => {
      app.use(express.json()) // Ensure the app can parse JSON request bodies

      app.use((req: Request, res: Response, next: NextFunction) => {
        if (rabbitMqChannel) {
          const requestId = `${Date.now()}-${Math.random()}` // Generate a unique request ID
          requestResponseMap.set(requestId, res)

          const requestData = {
            requestId,
            method: req.method,
            path: req.path,
            body: req.body,
            query: req.query,
            headers: req.headers,
          }

          try {
            rabbitMqChannel.sendToQueue(serviceName, Buffer.from(JSON.stringify(requestData)))
            console.log('Request pushed to RabbitMQ:', requestData)
          } catch (err) {
            console.error('Failed to push request to RabbitMQ:', err)
            res.status(500).send('Failed to process request')
          }
        } else {
          res.status(500).send('RabbitMQ channel not available')
        }
      })

      app.listen(3000, () => {
        console.log('Microservice is running on port 3000')
      })

      return app
    },
    init: async () => {
      try {
        const onMessage = (msg: ConsumeMessage | null) => {
          if (msg) {
            console.log('Received message:', msg.content.toString())
            const messageData = JSON.parse(msg.content.toString())

            const res = requestResponseMap.get(messageData.requestId)
            if (res) {
              res.send(`Processed: ${messageData.path}`)
              requestResponseMap.delete(messageData.requestId)
            }

            // Process the message here
            rabbitMqChannel?.ack(msg)
          }
        }

        const rabbitMQ = await connectToRabbitMQ(serviceName, onMessage)
        rabbitMqConnection = rabbitMQ.connection
        rabbitMqChannel = rabbitMQ.channel

        const mongoDB = await connectToMongoDB()
        mongoClient = mongoDB.client
        db = mongoDB.db
      } catch (error) {
        console.error('Error during initialization:', error)
      }
    },
    shutdown: async () => {
      try {
        if (rabbitMqChannel) {
          await rabbitMqChannel.close()
        }
        if (rabbitMqConnection) {
          await rabbitMqConnection.close()
        }
        console.log('RabbitMQ connection closed')

        if (mongoClient) {
          await mongoClient.close()
        }
        console.log('MongoDB connection closed')

        console.log('Microservice is shutting down')
        process.exit(0)
      } catch (error) {
        console.error('Error during shutdown:', error)
      }
    },
  }
}

function getRoutes(app: Express) {
  const routes: { method: string; path: string }[] = []

  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      // Routes registered directly on the app
      const { path, stack } = middleware.route
      const method = stack[0].method.toUpperCase()
      routes.push({ method, path })
    } else if (middleware.name === 'router') {
      // Routes added using router.use()
      middleware.handle.stack.forEach((handler: any) => {
        const route = handler.route
        if (route) {
          const { path, stack } = route
          const method = stack[0].method.toUpperCase()
          routes.push({ method, path })
        }
      })
    }
  })

  console.log(routes)
}
