import type { Express } from 'express'
import { connect as amqpConnect, type Connection, type Channel, type ConsumeMessage } from 'amqplib'
import { MongoClient, Db } from 'mongodb'
import dotenv from 'dotenv'

dotenv.config()

type Microservice = {
  init: () => Promise<void>
  shutdown: () => Promise<void>
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

  return {
    init: async () => {
      try {
        const onMessage = (msg: ConsumeMessage | null) => {
          if (msg) {
            console.log('Received message:', msg.content.toString())
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

        app.listen(3000, () => {
          console.log('Microservice is running on port 3000')
        })
      } catch (error) {
        console.error('Error during initialization:', error)
        // Optionally add further error handling or recovery logic here
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
        // Optionally add further error handling or recovery logic here
      }
    },
  }
}
