const crypto = require('crypto');
const cbor = require('cbor');
const { InvalidTransaction, InternalError } = require('sawtooth-sdk/processor/exceptions')

const hash = (x) => 
    crypto.createHash('sha512').update(x).digest('hex').toLowerCase()

const decodeCbor = (buffer) => 
    new Promise((resolve, reject) =>
        cbor.decodeFirst(buffer, (err, obj) => (err ? reject(err) : resolve(obj)))
    )

const decodeData = (payload) => {
    return new Promise((resolve, reject) => {
        let result = JSON.parse(payload);
        result ? resolve(result) : reject(result);
    })
}

const toInternalError = (err) => {
    let message = (err.message) ? err.message : err
    throw new InternalError(message)
}

const setEntry = (context, address, stateValue) => {
    let entries = {
        [address]: cbor.encode(stateValue)
    }
    return context.setState(entries)
}

module.exports = {
    hash,
    decodeCbor,
    decodeData,
    toInternalError,
    setEntry
}
