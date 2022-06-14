const mqtt = require('mqtt')
const { SawtoothClientFactory } = require('./sawtooth-client')

const fs = require("fs")
const path = require("path")

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

class Packager {
    constructor(family, payload) {
        this.payload = {
            'key': payload['key'],
            'data': payload['data']
        }

        this.publicKey = payload['publicKey']
        this.mqttClient = mqtt.connect(`${uri}`, options)

        this.restApiPort = Math.floor(Math.random() * NUM_OF_PORTS)
        this.restApiUrl = `http://localhost:${ports[`${this.restApiPort}`]}`

        this.sawtoothClient = SawtoothClientFactory({
            publicKey: this.publicKey,
            restApiUrl: this.restApiUrl
        })

        this.transactor = this.sawtoothClient.newTransactor({
            familyName: family,
            familyVersion: "1.0",
        })

        this.mqttClient.on('connect', function() {
            console.log(`A new packager is successfully connected to the MQTT broker`)
        })

        this.mqttClient.on('message', async function(topic, message) {
            let msgJson = JSON.parse(message.toString())

            switch (topic) {
                case `/topic/${this.publicKey}/txnSig`:
                    this.txnSignature = msgJson['signature']
                    packageBatch()
                    break
                case `/topic/${this.publicKey}/batchSig`:
                    this.batchSignature = msgJson['signature']
                    await postToRest()
                    break
                default:
                    console.log(`No specified handler for the topic ${topic}`)
                    break
            }
        })
    }

    packageTransaction() {
        this.targetAddr = this.transactor.calculateAddress(this.payload['key'])
        this.payloadBytes = this.transactor.createPayloadBytes(this.payload)
        this.transactionHeaderBytes = this.transactor.createTransactionHeaderBytes(this.targetAddr, this.payloadBytes)
        this.transactionHeaderBytesHash = this.transactor.createTransactionHeaderBytesHash(this.transactionHeaderBytes)

        this.mqttClient.subscribe(`/topic/${this.publicKey}/txnSig`)

        console.log(`Publishing transaction hash: ${this.transactionHeaderBytesHash}`)
        this.mqttClient.publish(`/topic/${this.publicKey}/txnHash`, this.transactionHeaderBytesHash)
    }

    packageBatch() {
        this.mqttClient.unsubscribe(`/topic/${this.publicKey}/txnSig`)

        this.transactions = this.transactor.createTransactions(this.transactionHeaderBytes, this.txnSignature, this.payloadBytes)
        this.batchHeaderBytes = this.transactor.createBatchHeaderBytes(this.transactions)
        this.batchHeaderBytesHash = this.transactor.createBatchHeaderBytesHash(this.batchHeaderBytes)

        this.mqttClient.subscribe(`/topic/${this.publicKey}/batchSig`)

        console.log(`Publishing batch hash: ${this.batchHeaderBytesHash.toString()}`)
        this.mqttClient.publish(`/topic/${this.publicKey}/batchHash`, this.batchHeaderBytesHash.toString())
    }

    async postToRest() {
        this.mqttClient.unsubscribe(`/topic/${this.publicKey}/batchSig`)

        this.batch = this.transactor.createBatch(this.batchHeaderBytes, this.batchSignature, this.transactions)
        this.batchListBytes = this.transactor.createBatchListBytes(this.batch)

        console.log(`Submitting report transaction to Sawtooth REST API`)
        console.log(this.payload)

        try {
            const txnRes = await this.transactor.postToRest(this.batchListBytes)
            console.log({
                status: txnRes.status,
                statusText: txnRes.statusText
            })
            return txnRes
        } catch (err) {
            console.log('Error submitting transaction to Sawtooth REST API: ', err)
            console.log('Transaction: ', this.payload)
        } finally {
            this.mqttClient.end()
        }
    }
}

module.exports = {
    Packager
}
