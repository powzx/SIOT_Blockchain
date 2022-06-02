const express = require('express')
const socketIo = require('socket.io')
const https = require('https')

const fs = require("fs")
const path = require("path")

const input = require('./input')
const { SawtoothClientFactory } = require('./sawtooth-client')

const NUM_OF_PORTS = 20
const ports = {
  0: "8008",
  1: "8009",
  2: "8010",
  3: "8011",
  4: "8012",
  5: "8013",
  6: "8014",
  7: "8015",
  8: "8016",
  9: "8017",
  10: "8018",
  11: "8019",
  12: "8020",
  13: "8021",
  14: "8022",
  15: "8023",
  16: "8024",
  17: "8025",
  18: "8026",
  19: "8027"
}

/*
const enclave = EnclaveFactory(Buffer.from(env.privateKey, 'hex'))

const walletClient = SawtoothClientFactory({
  enclave: enclave,
  restApiUrl: env.restApiUrl
})

const walletTransactor = walletClient.newTransactor({
  familyName: "wallet",
  familyVersion: "1.0"
})
*/

var app = express()

certFile = fs.readFileSync(path.join(__dirname, "server_data", "cert.pem"))
keyFile = fs.readFileSync(path.join(__dirname, "server_data", "key.pem"))
passphraseFile = fs.readFileSync(path.join(__dirname, "server_data", "passphrase.txt")).toString()

const options = {
  key: keyFile,
  cert: certFile,
  passphrase: passphraseFile
}

const server = https.createServer(options, app)

var io = socketIo(server)

io.on('connection', (socket) => { 
  console.log('New client connected')

  let publicKey = ''

  socket.on('init', async (data) => {
    publicKey = data['publicKey']
    let user = data['data']

    console.log(`Initializing user ${user} from public key: ${publicKey}`)

    let restApiPort = Math.floor(Math.random() * NUM_OF_PORTS)
    let restApiUrl = `http://localhost:${ports[`${restApiPort}`]}`

    keyClient = SawtoothClientFactory({
      publicKey: publicKey,
      restApiUrl: restApiUrl
    })

    keyTransactor = keyClient.newTransactor({
      familyName: "key",
      familyVersion: "1.0",
      socket: socket
    })

    input.submitPayload({
      "publicKey": publicKey,
      "data": user
    }, keyTransactor).then((msg) => {
      console.log(msg)
      console.log(`User successfully initialized via REST API ${restApiPort}`)

      socket.emit('initOk')
    })
  })

  socket.on('request', async (data) => {

    let restApiPort = Math.floor(Math.random() * NUM_OF_PORTS)
    let restApiUrl = `http://localhost:${ports[`${restApiPort}`]}`

    supplyClient = SawtoothClientFactory({
      publicKey: publicKey,
      restApiUrl: restApiUrl
    })
  
    supplyTransactor = supplyClient.newTransactor({
      familyName: "supply",
      familyVersion: "1.0",
      socket: socket
    })

    input.submitPayload({
      "serialNum": data['serialNum'],
      "data": data['data']
    }, supplyTransactor).then((msg) => {
      console.log(msg)
      console.log(`Payload successfully submitted to REST API ${restApiPort}`)
    })
  })

  socket.on('disconnect', () => {
    console.log("A client disconnected")
  })
})

server.listen(3000, function(req, res) {
  console.log("This server is listening to port 3000")
})

// Test scripts for client

/*
input.submitPayload({
  "name": "johndo",
  "value": 10000
}, walletTransactor).then((ewa) => {
  console.log(ewa)
})
*/

/*
input.getBatchList(walletClient).then((data) => {
  console.log(data)
})
*/

/*
let transactionId = ''
input.getTransaction(walletClient, transactionId).then((data) => {
  console.log(data)
})
*/

/*
input.getState(walletClient).then((data) => {
  console.log(data['data']['data'])
})
*/