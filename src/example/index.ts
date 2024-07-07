import { makeMicroservice } from '../index'
import express from 'express'
import * as pkg from '../../package.json'

const app = express()

const serviceName = pkg.name
const microservice = makeMicroservice(app, serviceName)
microservice
  .app()
  .get('/', (req, res) => {
    res.send('hello')
  })
  .get('/a', (req, res) => {
    res.send('aaaa')
  })

await microservice.init()
