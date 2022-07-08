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
  2: "8028",
  3: "8029",
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

        this.family = family

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

        // this.mqttClient.on('connect', function() {
        //     console.log(`A new packager is successfully connected to the MQTT broker`)
        // })
    }

    async handleMessage(topic, message) {

        // let msgJson = JSON.parse(message.toString())
        
        switch (topic) {
            case `/topic/${this.publicKey}/txnSig`:
                this.txnSignature = message.toString()
                console.log(`Received Transaction Signature: ${this.txnSignature}`)
                this.packageBatch()
                break
            case `/topic/${this.publicKey}/batchSig`:
                this.batchSignature = message.toString()
                console.log(`Received Batch Signature: ${this.batchSignature}`)
                await this.postToRest()
                break
            default:
                console.log(`No specified handler for the topic ${topic}`)
                break
        }
    }

    hexToBytes(hex) {
        for (var bytes = [], c = 0; c < hex.length; c += 2)
            bytes.push(parseInt(hex.substr(c, 2), 16));
        return bytes;
    }

    attachListeners() {
        this.mqttClient.on('message', async (topic, message) => await this.handleMessage(topic, message))
        console.log('A new packager is successfully initialised')
    }

    packageTransaction() {
        this.targetAddr = this.transactor.calculateAddress(this.payload['key'])
        this.payloadBytes = this.transactor.createPayloadBytes(this.payload)
        this.transactionHeaderBytes = this.transactor.createTransactionHeaderBytes(this.targetAddr, this.payloadBytes)
        this.transactionHeaderBytesHash = this.transactor.createTransactionHeaderBytesHash(this.transactionHeaderBytes)

        this.mqttClient.subscribe(`/topic/${this.publicKey}/txnSig`)

        console.log(`Publishing transaction hash: ${this.transactionHeaderBytesHash.toString('hex')}`)
        // console.log(`Transaction Hash Bytes: ${this.transactionHeaderBytesHash}`)

        this.mqttClient.publish(`/topic/${this.publicKey}/txnHash`, this.transactionHeaderBytesHash)
    }

    packageBatch() {
        this.mqttClient.unsubscribe(`/topic/${this.publicKey}/txnSig`)

        this.transactions = this.transactor.createTransactions(this.transactionHeaderBytes, this.txnSignature, this.payloadBytes)
        this.batchHeaderBytes = this.transactor.createBatchHeaderBytes(this.transactions)
        this.batchHeaderBytesHash = this.transactor.createBatchHeaderBytesHash(this.batchHeaderBytes)

        this.mqttClient.subscribe(`/topic/${this.publicKey}/batchSig`)

        console.log(`Publishing batch hash: ${this.batchHeaderBytesHash.toString('hex')}`)
        // console.log(`Batch Hash Bytes: ${this.batchHeaderBytesHash}`)

        this.mqttClient.publish(`/topic/${this.publicKey}/batchHash`, this.batchHeaderBytesHash)
    }

    async postToRest() {
        this.mqttClient.unsubscribe(`/topic/${this.publicKey}/batchSig`)

        this.batch = this.transactor.createBatch(this.batchHeaderBytes, this.batchSignature, this.transactions)
        this.batchListBytes = this.transactor.createBatchListBytes(this.batch)

        console.log(`Submitting report transaction to Sawtooth REST API ${this.restApiPort}`)
        console.log(this.payload)

        try {
            const txnRes = await this.transactor.postToRest(this.batchListBytes)
            console.log({
                status: txnRes.status,
                statusText: txnRes.statusText
            })
            
            // if (this.family == 'supply') {
            //     this.mqttClient.publish(`/topic/updates/${this.payload['key']}`, JSON.stringify(this.payload))
            //     console.log(`Broadcasting updates on key ${this.payload['key']}`)
            // }

            this.mqttClient.publish(`/topic/${this.payload['key']}/response/post`, JSON.stringify(this.payload))
            console.log(`Broadcasting updates on key ${this.payload['key']}`)

            return txnRes
        } catch (err) {
            console.log(`Error submitting transaction to Sawtooth REST API ${this.restApiPort}: `, err)
            console.log('Transaction: ', this.payload)
        } finally {
            console.log('A packager has finalized and disconnected from the MQTT broker')
            this.mqttClient.end()
        }
    }
}

module.exports = {
    Packager
}
