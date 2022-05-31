const https = require('https')
const fs = require("fs")
const path = require("path")
const axios = require("axios")

//const { EnclaveFactory } = require('./enclave')
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

certFile = fs.readFileSync(path.join(__dirname, "server_data", "cert.pem"))
keyFile = fs.readFileSync(path.join(__dirname, "server_data", "key.pem"))
passphraseFile = fs.readFileSync(path.join(__dirname, "server_data", "passphrase.txt")).toString()

const options = {
  key: keyFile,
  cert: certFile,
  passphrase: passphraseFile
}

const server = https.createServer(options,
  async function(req, res) {
    if (req.method == "POST") {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
      })
      req.on('end', async () => {
        body = JSON.parse(body)

        let publicKey = body["publicKey"]
        let type = body["type"]

        delete body["publicKey"]
        delete body['type']

        // select a random port to submit to
        let restApiPort = Math.floor(Math.random() * NUM_OF_PORTS)
        let restApiUrl = `http://localhost:${ports[`${restApiPort}`]}`
        let walletClient = SawtoothClientFactory({
          publicKey: publicKey,
          restApiUrl: restApiUrl
        })

        if (type == 'start') {
          console.log(`Received initiation data from ${publicKey}: ${JSON.stringify(body)}`)

          let walletTransactor = walletClient.newTransactor({
            familyName: "wallet",
            familyVersion: "1.0"
          })

          let payloadBytes = walletTransactor.createPayloadBytes(body)
          let transactionHeaderBytes = walletTransactor.createTransactionHeaderBytes(payloadBytes)
          let transactionHeaderBytesHash = walletTransactor.createTransactionHeaderBytesHash(transactionHeaderBytes)

          res.end(JSON.stringify({
            "payloadBytes": payloadBytes,
            "transactionHeaderBytes": transactionHeaderBytes,
            "transactionHeaderBytesHash": transactionHeaderBytesHash
          }))

          console.log(`Sending transaction header bytes hash: ${transactionHeaderBytesHash}`)

          // input.submitPayload({
          //   "name": body["name"],
          //   "value": body["value"]
          // }, walletTransactor).then((msg) => {
          //   console.log(msg)
          //   console.log(`Payload successfully submitted to Rest API ${restApiPort}`)
          // })
        } else if (type == 'interim') {
          console.log(`Received interim data from ${publicKey}: ${JSON.stringify(body)}`)

          //let enclave = EnclaveFactory(Buffer.from(publicKey, 'hex'))
          let walletTransactor = walletClient.newTransactor({
            familyName: "wallet",
            familyVersion: "1.0"
          })

          let transactions = walletTransactor.createTransactions(Buffer.from(body["transactionHeaderBytes"]), body["txnSignature"], Buffer.from(body["payloadBytes"]))
          let batchHeaderBytes = walletTransactor.createBatchHeaderBytes(transactions)
          let batchHeaderBytesHash = walletTransactor.createBatchHeaderBytesHash(batchHeaderBytes)

          res.end(JSON.stringify({
            "transactions": transactions,
            "batchHeaderBytes": batchHeaderBytes,
            "batchHeaderBytesHash": batchHeaderBytesHash
          }))

          console.log(`Sending batch header bytes hash: ${batchHeaderBytesHash}`)

        } else if (type == 'end') {
          console.log(`Received final data from ${publicKey}: ${JSON.stringify(body)}`)

          let walletTransactor = walletClient.newTransactor({
            familyName: "wallet",
            familyVersion: "1.0"
          })

          let batch = walletTransactor.createBatch(Buffer.from(body["batchHeaderBytes"]), body["batchSignature"], body["transactions"])
          let batchList = walletTransactor.createBatchList(batch)
          
          while (true) {
            try {
              const res = await axios({
                method: 'post',
                baseURL: restApiUrl,
                url: '/batches',
                headers: { 'Content-Type': 'application/octet-stream' },
                data: batchList
              })
              console.log(batchList)
              console.log(res)
              return res
            } catch (err) {
              console.log('error', err)
              console.log(batchList)
            }
          }

          /*
          try {
            console.log(`Submitting report transaction to Sawtooth REST API`)
            // Wait for the response from the validator receiving the transaction
            const txnRes = await walletTransactor.postToSawtooth(batchList)
            // Log only a few key items from the response, because it's a lot of info
            console.log({
              status: txnRes.status,
              statusText: txnRes.statusText
            })

            res.end("Successfully submitted to Sawtooth REST API")
            return txnRes
          } catch (err) {
            res.end('Server error occurred.')
            console.log('Error submitting transaction to Sawtooth REST API: ', err)
          }
          */

        } else {
          res.end("Undefined request")
        }
      })
    } else {
      res.end("Undefined request")
    }
  }
)

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