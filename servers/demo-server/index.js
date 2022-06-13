const express = require('express')
const socketIo = require('socket.io')
const https = require('https')
const mqtt = require('mqtt')
const cbor = require('cbor')

const fs = require("fs")
const path = require("path")

const input = require('./input')
const { SawtoothClientFactory } = require('./sawtooth-client')
const { Packager } = require('./packager')

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

const uri = 'mqtts://192.168.11.109:8883'

var caFile = fs.readFileSync(path.join(__dirname, "mqtt", "ca.crt"))
var certFile = fs.readFileSync(path.join(__dirname, "mqtt", "client.crt"))
var keyFile = fs.readFileSync(path.join(__dirname, "mqtt", "client.key"))

const options = {
  rejectUnauthorized: false,
  connectTimeout: 5000,
  ca: [ caFile ],
  cert: certFile,
  key: keyFile
}

var client = mqtt.connect(`${uri}`, options)

client.on('connect', function() {
  client.subscribe('/topic/#')

  console.log('The dispatcher is successfully connected to the MQTT broker')
})

client.on('message', async function(topic, message) {
  console.log(`Received a message of topic ${topic}`)

  let msgJson = JSON.parse(message.toString())
  let packager

  switch (topic) {
    case '/topic/dispatch/init':
      packager = new Packager('key', msgJson, client)
      packager.packageTransaction()
      break
    case '/topic/dispatch/post':
      packager = new Packager('supply', msgJson, client)
      packager.packageTransaction()
      break
    case '/topic/dispatch/get':
      break
    default:
      console.log(`No specified handler for the topic ${topic}`)
      break
  }
})

/*
var app = express()

certFile = fs.readFileSync(path.join(__dirname, "server_data", "cert.pem"))
keyFile = fs.readFileSync(path.join(__dirname, "server_data", "key.pem"))
//passphraseFile = fs.readFileSync(path.join(__dirname, "server_data", "passphrase.txt")).toString()

const options = {
  key: keyFile,
  cert: certFile
}

const server = https.createServer(options, app)

var io = socketIo(server)

io.on('connection', (socket) => { 
  console.log('New client connected')
  console.log(`Number of connected clients: ${Object.keys(io.sockets.sockets).length}`)

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
      "key": publicKey,
      "data": user
    }, keyTransactor).then((msg) => {
      console.log(msg)
      console.log(`User successfully initialized via REST API ${restApiPort}`)

      socket.emit('initOk')
    })
  })

  socket.on('post', async (data) => {

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
      "key": data['serialNum'],
      "data": data['data']
    }, supplyTransactor).then((msg) => {
      console.log(msg)
      console.log(`Payload successfully submitted to REST API ${restApiPort}`)
    })
  })

  socket.on('get', async (data) => {
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

    keyClient = SawtoothClientFactory({
      publicKey: publicKey,
      restApiUrl: restApiUrl
    })

    keyTransactor = keyClient.newTransactor({
      familyName: "key",
      familyVersion: "1.0",
      socket: socket
    })

    // get list of all transactions
    try {
      transactions = await supplyClient.get('/transactions')
      console.log(`Transactions received from REST API ${restApiPort}`)

      let packet = {
        'serialNum': data['serialNum'],
        'transactions': []
      }

      for (let i = 0; i < transactions.data.data.length; i++) {
        // filter transactions according to serial number
        if (transactions.data.data[i].header.inputs[0] == supplyTransactor.calculateAddress(data['serialNum'])) {

          let authorKey = transactions.data.data[i].header.signer_public_key
          let payload = transactions.data.data[i].payload
          let decodedPayload = Buffer.from(payload, 'base64')
          let payloadJson = cbor.decode(decodedPayload)

          console.log(payloadJson)

          // get public key info
          try {
            let keyAddress = keyTransactor.calculateAddress(authorKey)
            let keyState = await keyClient.get(`/state/${keyAddress}`)
            let keyStatePayload = keyState.data.data

            let decodedKeyStatePayload = Buffer.from(keyStatePayload, 'base64')
            let keyStatePayloadJson = cbor.decode(decodedKeyStatePayload)

            console.log(keyStatePayloadJson)

            packet.transactions.push({
              'authorKey': authorKey,
              'authorName': keyStatePayloadJson[`${authorKey}`],
              'transaction': payloadJson
            })
          } catch (err) {
            console.log(err)
          }
        }
      }

      console.log(`Sending packet to client:`)
      console.log(JSON.stringify(packet))

      socket.emit('result', JSON.stringify(packet))
    } catch (err) {
      console.log(err)
    }
  })

  socket.on('disconnect', () => {
    console.log("A client disconnected")
    console.log(`Number of connected clients: ${Object.keys(io.sockets.sockets).length}`)
  })
})

server.listen(3000, function(req, res) {
  console.log("This server is listening to port 3000")
})
*/
