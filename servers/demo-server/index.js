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

/*
const server = https.createServer(options,
  function(req, res) {
    if (req.method == "POST") {
      
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
      })
      req.on('end', () => {
        body = JSON.parse(body)
        //resolve(body)

        console.log(body)

        // select a random port to submit to
        let restApiPort = Math.floor(Math.random() * NUM_OF_PORTS)
        let restApiUrl = `http://localhost:${ports[`${restApiPort}`]}`

        let publicKey = body["publicKey"]
        //let enclave = EnclaveFactory(Buffer.from(publicKey, 'hex'))
        let walletClient = SawtoothClientFactory({
          publicKey: publicKey,
          restApiUrl: restApiUrl
        })
        let walletTransactor = walletClient.newTransactor({
          familyName: "wallet",
          familyVersion: "1.0"
        })

        input.submitPayload({
          "name": body["name"],
          "value": body["value"]
        }, walletTransactor).then((msg) => {
          console.log(msg)
          console.log(`Payload successfully submitted to Rest API ${restApiPort}`)
        })
      })
    } else {
      res.end("Undefined request")
    }
  }
)
*/

var io = socketIo(server)

io.on('connection', (socket) => { 
  console.log('New client connected')

  socket.on('request', (data) => {
    let publicKey = data['publicKey']
    console.log(`Received request from public key: ${publicKey}`)

    let restApiPort = Math.floor(Math.random() * NUM_OF_PORTS)
    let restApiUrl = `http://localhost:${ports[`${restApiPort}`]}`

    walletClient = SawtoothClientFactory({
      publicKey: publicKey,
      restApiUrl: restApiUrl
    })
  
    walletTransactor = walletClient.newTransactor({
      familyName: "wallet",
      familyVersion: "1.0",
      socket: socket
    })

    input.submitPayload({
      "name": data['name'],
      "value": data['value']
    }, walletTransactor).then((msg) => {
      console.log(msg)
      console.log(`Payload successfully submitted to Rest API ${restApiPort}`)
    })
  })

  socket.on('disconnect', () => {
    console.log("A client disconnected")
  })

  /*
  // select a random port to submit to
  let restApiPort = Math.floor(Math.random() * NUM_OF_PORTS)
  let restApiUrl = `http://localhost:${ports[`${restApiPort}`]}`

  let walletClient
  let walletTransactor

  let publicKey

  let payloadBytes
  let transactionHeaderBytes
  let transactionHeaderBytesHash

  let transaction
  let transactions
  let batchHeaderBytes
  let batchHeaderBytesHash

  let batch
  let batchListBytes

  socket.on('init', (data) => {
    publicKey = data['publicKey']
    console.log(`Connection initialized\nPublic Key: ${publicKey}`)

    walletClient = SawtoothClientFactory({
      publicKey: publicKey,
      restApiUrl: restApiUrl
    })
  
    walletTransactor = walletClient.newTransactor({
      familyName: "wallet",
      familyVersion: "1.0"
    })

    socket.emit('permit')
  })

  socket.on('startRequest', (data) => {
    console.log(data)

    payloadBytes = walletTransactor.createPayloadBytes(data)
    transactionHeaderBytes = walletTransactor.createTransactionHeaderBytes(payloadBytes)
    transactionHeaderBytesHash = walletTransactor.createTransactionHeaderBytesHash(transactionHeaderBytes)

    socket.emit('sign', {
      'type': 'transaction',
      'headerHash': transactionHeaderBytesHash,
    })
  })

  socket.on('batchRequest', (data) => {
    let signature = data['signature']

    transaction = walletTransactor.createTransaction(transactionHeaderBytes, signature, payloadBytes)
    transactions = [transaction]
    batchHeaderBytes = walletTransactor.createBatchHeaderBytes(transactions)
    batchHeaderBytesHash = walletTransactor.createBatchHeaderBytesHash(batchHeaderBytes)

    socket.emit('sign', {
      'type': 'batch',
      'headerHash': batchHeaderBytesHash,
    })
  })

  socket.on('endRequest', async (data) => {
    let signature = data['signature']

    batch = walletTransactor.createBatch(batchHeaderBytes, signature, transactions)
    batchListBytes = walletTransactor.createBatchList(batch)

    try {
      console.log(`Submitting report transaction to Sawtooth REST API`)
      // Wait for the response from the validator receiving the transaction
      const txnRes = await walletTransactor.post(batchListBytes).then((msg) => {
        console.log(msg)
        console.log(`Payload successfully submitted to Rest API ${restApiPort}`)
      })
      // Log only a few key items from the response, because it's a lot of info
      // console.log({
      //   status: txnRes.status,
      //   statusText: txnRes.statusText
      // })
      return txnRes
      //return txnRes
    } catch (err) {
      console.log('Error submitting transaction to Sawtooth REST API: ', err)
      //console.log('Transaction: ', batchListBytes)
    } finally {
      socket.emit('terminate')
    }
  })

  socket.on('disconnect', () => {
    console.log('Client request completed')
  })
  */
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