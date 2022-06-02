const protobuf = require('sawtooth-sdk/protobuf')
const cbor = require('cbor')
const { randomBytes, createHash } = require('crypto')
const axios = require('axios')

const leafHash = (input, length) => {
  return createHash('sha512').update(input).digest('hex').toLowerCase().slice(0, length)
}

const SawtoothClientFactory = (factoryOptions) => {
  return {
    async get(url) {
      try {
        const res = await axios({
          method: 'get',
          baseURL: factoryOptions.restApiUrl,
          url
        })
        return res
      } catch (err) {
        console.log('error', err)
      }
    },
    newTransactor(transactorOptions) {
      const _familyNamespace = transactorOptions.familyNamespace || leafHash(transactorOptions.familyName, 6)
      const _familyVersion = transactorOptions.familyVersion || '1.0'
      const _familyEncoder = transactorOptions.familyEncoder || cbor.encode
      const socket = transactorOptions.socket
      return {
        calculateAddress(key) {
          return _familyNamespace + leafHash(key, 64)
        },

        async post(payload, txnOptions) {

          // Encode the payload
          const payloadBytes = _familyEncoder(payload)
          const address = this.calculateAddress(payload.key)

          // Encode a transaction header
          const transactionHeaderBytes = protobuf.TransactionHeader.encode({
            familyName: transactorOptions.familyName,
            familyVersion: _familyVersion,
            inputs: [address],
            outputs: [address],
            signerPublicKey: factoryOptions.publicKey,
            batcherPublicKey: factoryOptions.publicKey,
            dependencies: [],
            nonce: randomBytes(32).toString('hex'),
            payloadSha512: createHash('sha512').update(payloadBytes).digest('hex'),
            ...txnOptions // overwrite above defaults with passed options
          }).finish()

          // Sign the txn header: For Flutter implementation
          const transactionHeaderBytesHash = createHash('sha256').update(transactionHeaderBytes).digest()
          let txnSignature = ''

          // Waiting for transaction signature from Flutter app
          // User has ability to reject the transaction
          await new Promise((resolve, reject) => {
            socket.emit('sign', {
              'type': 'transaction',
              'hash': transactionHeaderBytesHash,
              'payload': JSON.stringify(payload)
            }, (ack) => {
              if (ack['isApproved']) {
                resolve(ack)
                txnSignature = ack['signature']
                console.log(`Received signature: ${txnSignature}`)
              } else {
                reject("Transaction is not approved for signing")
              }
            })
          }).catch(error => {
            throw error
          })

          // Create the transaction
          const transaction = protobuf.Transaction.create({
            header: transactionHeaderBytes,
            headerSignature: txnSignature,
            payload: payloadBytes
          })

          // Batch the transactions and encode a batch header
          const transactions = [transaction]
          const batchHeaderBytes = protobuf.BatchHeader.encode({
            signerPublicKey: factoryOptions.publicKey,
            transactionIds: transactions.map((txn) => txn.headerSignature),
          }).finish()

          // Sign the batch header: For Flutter implementation
          const batchHeaderBytesHash = createHash('sha256').update(batchHeaderBytes).digest()
          let batchSignature = ''

          // Waiting for batch signature from the Flutter app
          // No additional confirmation is needed from the user at this point
          await new Promise((resolve) => {
            socket.emit('sign', {
              'type': 'batch',
              'hash': batchHeaderBytesHash,
              'payload': JSON.stringify(payload)
            }, (signature) => {
              resolve(signature)
              batchSignature = signature
              console.log(`Received signature: ${batchSignature}`)
            })
          })
          
          // Create the batch
          const batch = protobuf.Batch.create({
            header: batchHeaderBytes,
            headerSignature: batchSignature,
            transactions: transactions
          })

          // Batch the batches into a batch list
          const batchListBytes = protobuf.BatchList.encode({
            batches: [batch]
          }).finish()

          // Post the batch list
          try {
            const res = await axios({
              method: 'post',
              baseURL: factoryOptions.restApiUrl,
              url: '/batches',
              headers: { 'Content-Type': 'application/octet-stream' },
              data: batchListBytes
            })

            socket.emit('success')

            return res
          } catch (err) {
            socket.emit('error')
            console.log('error', err)
          }
        }
      }
    }
  }
}

module.exports = {
  leafHash,
  SawtoothClientFactory
}