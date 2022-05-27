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

certFile = fs.readFileSync(path.join(__dirname, "server_data", "cert.pem"))
keyFile = fs.readFileSync(path.join(__dirname, "server_data", "key.pem"))
passphraseFile = fs.readFileSync(path.join(__dirname, "server_data", "passphrase.txt")).toString()

const options = {
  key: keyFile,
  cert: certFile,
  passphrase: passphraseFile
}

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