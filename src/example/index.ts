import { makeMicroservice } from '../index'
import express from 'express'
import * as pkg from '../../package.json'
import { events } from './config/events'

const app = express()

const serviceName = pkg.name
const microservice = makeMicroservice(app, serviceName, events)
microservice
  .app()
  .post('/invoice.create', (req, res) => {
    res.send('hello')
  })
  .get('/sla', (req, res) => {
    res.send('aaaa')
  })

await microservice.init()
