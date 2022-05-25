const http = require('http')
const { resolve } = require('path')

const { EnclaveFactory } = require('./enclave')
const env = require('./env')
const input = require('./input')
const { SawtoothClientFactory } = require('./sawtooth-client')

const enclave = EnclaveFactory(Buffer.from(env.privateKey, 'hex'))

const walletClient = SawtoothClientFactory({
  enclave: enclave,
  restApiUrl: env.restApiUrl
})

const walletTransactor = walletClient.newTransactor({
  familyName: "wallet",
  familyVersion: "1.0"
})

const server = http.createServer(
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

        input.submitPayload({
          "name": body["name"],
          "value": body["value"]
        }, walletTransactor).then((msg) => {
          console.log(msg)
        })
      })
    } else {
      res.end("Undefined request")
    }
  }
)

server.listen(3000)
console.log("Server is running on port 3000")

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
let transactionId = '55a5098c0dce4c3a965180d49d2ccbe410087d57a1d20d3ca4ce372956277afe2d8651ac47928afb7574cd82990e79165e267fd62ed388d087306054799e99dd'
input.getTransaction(walletClient, transactionId).then((data) => {
  console.log(data)
})
*/

/*
input.getState(walletClient).then((data) => {
  console.log(data['data']['data'])
})
*/