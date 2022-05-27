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
      return {

        /*
        createPayloadBytes(payload) {
          // Encode the payload
          const payloadBytes = _familyEncoder(payload)
          return payloadBytes
        },

        createTransactionHeaderBytes(payloadBytes, txnOptions) {
          // Encode a transaction header
          const transactionHeaderBytes = protobuf.TransactionHeader.encode({
            familyName: transactorOptions.familyName,
            familyVersion: _familyVersion,
            inputs: [_familyNamespace],
            outputs: [_familyNamespace],
            signerPublicKey: factoryOptions.publicKey,
            batcherPublicKey: factoryOptions.publicKey,
            dependencies: [],
            nonce: randomBytes(32).toString('hex'),
            payloadSha512: createHash('sha512').update(payloadBytes).digest('hex'),
            ...txnOptions // overwrite above defaults with passed options
          }).finish()

          return transactionHeaderBytes
        },

        createTransactionHeaderBytesHash(transactionHeaderBytes) {
          // Sign the txn header: For Flutter implementation
          const transactionHeaderBytesHash = createHash('sha256').update(transactionHeaderBytes).digest('hex')
          return transactionHeaderBytesHash
        },

        createTransaction(transactionHeaderBytes, txnSignature, payloadBytes) {
          // Create the transaction
          const transaction = protobuf.Transaction.create({
            header: transactionHeaderBytes,
            headerSignature: txnSignature,
            payload: payloadBytes
          })

          return transaction
        },

        createBatchHeaderBytes(transaction) {
          // Batch the transactions and encode a batch header
          const transactions = [transaction]
          const batchHeaderBytes = protobuf.BatchHeader.encode({
            signerPublicKey: factoryOptions.publicKey,
            transactionIds: transactions.map((txn) => txn.headerSignature),
          }).finish()

          return batchHeaderBytes;
        },

        createBatchHeaderBytesHash(batchHeaderBytes) {
          // Sign the batch header: For Flutter implementation
          const batchHeaderBytesHash = createHash('sha256').update(batchHeaderBytes).digest('hex')
          return batchHeaderBytesHash
        },

        createBatchList(batchHeaderBytes, batchSignature, transactions) {
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

          return batchListBytes
        },

        async post(batchListBytes) {
          // Post the batch list
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
            console.log('error', err)
          }
        }
        */

        async post(payload, txnOptions) {

          // Encode the payload
          const payloadBytes = _familyEncoder(payload)

          // Encode a transaction header
          const transactionHeaderBytes = protobuf.TransactionHeader.encode({
            familyName: transactorOptions.familyName,
            familyVersion: _familyVersion,
            inputs: [_familyNamespace],
            outputs: [_familyNamespace],
            signerPublicKey: factoryOptions.publicKey,
            batcherPublicKey: factoryOptions.publicKey,
            dependencies: [],
            nonce: randomBytes(32).toString('hex'),
            payloadSha512: createHash('sha512').update(payloadBytes).digest('hex'),
            ...txnOptions // overwrite above defaults with passed options
          }).finish()

          // Sign the txn header. This signature will also be the txn address
          const txnSignature = factoryOptions.enclave.sign(transactionHeaderBytes).toString('hex')

          // Sign the txn header: For Flutter implementation
          //const transactionHeaderBytesHash = createHash('sha256').update(transactionHeaderBytes).digest('hex')


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

          // Sign the batch header and create the batch
          const batchSignature = factoryOptions.enclave.sign(batchHeaderBytes).toString('hex')

          // Sign the batch header: For Flutter implementation
          //const batchHeaderBytesHash = createHash('sha256').update(batchHeaderBytes).digest('hex')


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
            return res
          } catch (err) {
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