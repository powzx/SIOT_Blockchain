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

class Packager {
    constructor(family, payload, mqttClient) {
        this.payload = payload
        this.mqttClient = mqttClient

        this.restApiPort = Math.floor(Math.random() * NUM_OF_PORTS)
        this.restApiUrl = `http://localhost:${ports[`${this.restApiPort}`]}`

        this.client = SawtoothClientFactory({
            publicKey: this.payload['publicKey'],
            restApiUrl: this.restApiUrl
        })

        this.transactor = this.client.newTransactor({
            familyName: family,
            familyVersion: "1.0",
        })
    }

    packageTransaction() {
        this.payloadBytes = this.transactor.createPayloadBytes(this.payload)
        this.transactionHeaderBytes = this.transactor.createTransactionHeaderBytes(this.payload, this.payloadBytes)
        this.transactionHeaderBytesHash = this.transactor.createTransactionHeaderBytesHash(this.transactionHeaderBytes)

        this.mqttClient.publish(`/topic/txnHash/${this.payload['publicKey']}`, this.transactionHeaderBytesHash)
    }

    packageBatch() {
        this.transactions = this.transactor.createTransactions(this.transactionHeaderBytes, this.txnSignature, this.payloadBytes)
        this.batchHeaderBytes = this.transactor.createBatchHeaderBytes(this.transactions)
        this.batchHeaderBytesHash = this.transactor.createBatchHeaderBytesHash(this.batchHeaderBytes)

        this.mqttClient.publish(`/topic/batchHash/${this.payload['publicKey']}`, this.batchHeaderBytesHash)
    }

    async postToRest() {
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
        }
    }
}
