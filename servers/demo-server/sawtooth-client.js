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
      //const client = transactorOptions.client
      return {
        calculateAddress(key) {
          return _familyNamespace + leafHash(key, 64)
        },

        createPayloadBytes(payload) {
          return _familyEncoder(payload)
        },

        createTransactionHeaderBytes(address, payloadBytes) {
          return protobuf.TransactionHeader.encode({
            familyName: transactorOptions.familyName,
            familyVersion: _familyVersion,
            inputs: [address],
            outputs: [address],
            signerPublicKey: factoryOptions.publicKey,
            batcherPublicKey: factoryOptions.publicKey,
            dependencies: [],
            // nonce: 'f2e5661a',
            nonce: randomBytes(32).toString('hex'),
            payloadSha512: createHash('sha512').update(payloadBytes).digest('hex'),
            //...txnOptions // overwrite above defaults with passed options
          }).finish()
        },

        createTransactionHeaderBytesHash(transactionHeaderBytes) {
          return createHash('sha256').update(transactionHeaderBytes).digest()
        },

        createTransactions(transactionHeaderBytes, txnSignature, payloadBytes) {
          let transaction = protobuf.Transaction.create({
            header: transactionHeaderBytes,
            headerSignature: txnSignature,
            payload: payloadBytes
          })

          return [transaction]
        },

        createBatchHeaderBytes(transactions) {
          return protobuf.BatchHeader.encode({
            signerPublicKey: factoryOptions.publicKey,
            transactionIds: transactions.map((txn) => txn.headerSignature),
          }).finish()
        },

        createBatchHeaderBytesHash(batchHeaderBytes) {
          return createHash('sha256').update(batchHeaderBytes).digest()
        },

        createBatch(batchHeaderBytes, batchSignature, transactions) {
          return protobuf.Batch.create({
            header: batchHeaderBytes,
            headerSignature: batchSignature,
            transactions: transactions
          })
        },

        createBatchListBytes(batch) {
          return protobuf.BatchList.encode({
            batches: [batch]
          }).finish()
        },

        async postToRest(batchListBytes) {
          try {
            const res = await axios({
              method: 'post',
              baseURL: factoryOptions.restApiUrl,
              url: '/batches',
              headers: { 'Content-Type': 'application/octet-stream' },
              data: batchListBytes
            })

            return res
          } catch (err) {
            console.log('Error:', err.response.data)
          }
        },
      }
    }
  }
}

module.exports = {
  leafHash,
  SawtoothClientFactory
}
