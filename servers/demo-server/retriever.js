const mqtt = require('mqtt')
const cbor = require('cbor')
const { leafHash, SawtoothClientFactory } = require('./sawtooth-client')

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

const supplyHash = leafHash('supply', 6)
const keyHash = leafHash('key', 6)
const contractHash = leafHash('contract', 6)

class Retriever {
    constructor(serialNum, userPubKey) {
        this.serialNum = serialNum
        this.userPubKey = userPubKey

        this.mqttClient = mqtt.connect(`${uri}`, options)

        this.restApiPort = Math.floor(Math.random() * NUM_OF_PORTS)
        this.restApiUrl = `http://localhost:${ports[`${this.restApiPort}`]}`

        this.sawtoothClient = SawtoothClientFactory({
            restApiUrl: this.restApiUrl
        })

        this.dataAddr = supplyHash + leafHash(this.serialNum, 64)
    }

    async getRecords() {

        // get list of all transactions
        try {
            let transactions = await this.sawtoothClient.get('/transactions')
            console.log(`Transactions received from REST API ${this.restApiPort}`)
    
            let packet = {
                'serialNum': this.serialNum,
                'transactions': []
            }
    
            for (let i = 0; i < transactions.data.data.length; i++) {
                // filter transactions according to serial number
                if (transactions.data.data[i].header.inputs[0] == this.dataAddr) {
        
                    let authorKey = transactions.data.data[i].header.signer_public_key
                    let payload = transactions.data.data[i].payload
                    let decodedPayload = Buffer.from(payload, 'base64')
                    let payloadJson = cbor.decode(decodedPayload)
        
                    console.log(payloadJson)
        
                    // get public key info
                    try {
                        let keyAddress = keyHash + leafHash(authorKey, 64)
                        let keyState = await this.sawtoothClient.get(`/state/${keyAddress}`)
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

            let packetString = JSON.stringify(packet)

            console.log(`Sending packet to client:`)
            console.log(packetString)
    
            this.mqttClient.publish(`/topic/${this.userPubKey}/response/get`, packetString)

        } catch (err) {
            console.log(err)
        }
    }
}

module.exports = {
    Retriever
}
