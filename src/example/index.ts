import { makeMicroservice } from '../index'
import express from 'express'
import * as pkg from '../../package.json'

const app = express()

app.get('/', (req, res) => {
  res.send('hello')
})

const serviceName = pkg.name
const microservice = makeMicroservice(app, serviceName)

microservice.init()
