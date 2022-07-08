const mqtt = require('mqtt')

const fs = require("fs")
const path = require("path")

const { Packager } = require('./packager')
const { Retriever } = require('./retriever')

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

const server = mqtt.connect(`${uri}`, options)

server.on('connect', function() {
  server.subscribe('/topic/dispatch/+')

  console.log('Server is successfully connected to the MQTT broker')
})

server.on('message', async function(topic, message) {
  console.log(`Received a message of topic ${topic}`)
  let msgJson = JSON.parse(message.toString())
  console.log(msgJson)

  let packager
  let retriever

  switch (topic) {
    case '/topic/dispatch/init':
      console.log(`Initializing user ${msgJson['data']} from public key: ${msgJson['publicKey']}...`)

      packager = new Packager('key', msgJson)
      packager.attachListeners()
      packager.packageTransaction()
      break
    case '/topic/dispatch/post':
      console.log(`Processing new POST request...`)

      packager = new Packager('supply', msgJson)
      packager.attachListeners()
      packager.packageTransaction()
      break
    case '/topic/dispatch/get':
      console.log(`Processing new GET request...`)

      retriever = new Retriever(msgJson['serialNum'], msgJson['userPubKey'])
      retriever.getRecords()
      break
    default:
      console.log(`No specified handler for the topic ${topic}`)
      break
  }
})
