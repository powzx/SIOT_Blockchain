const { InternalError } = require('sawtooth-sdk/processor/exceptions');
const { TransactionHandler } = require('sawtooth-sdk/processor/handler');
const { decodeCbor, hash, toInternalError, setEntry, applySet } = require ('../lib/helper');

const FAMILY_NAME = "wallet", VERSION = "1.0", NAMESPACE = [hash(FAMILY_NAME).substring(0, 6)];

class WalletHandler extends TransactionHandler {
    constructor() {
        super(FAMILY_NAME, [VERSION], NAMESPACE);
    }

    apply(transactionRequest, context) {
        return decodeCbor(transactionRequest.payload)
            .catch(toInternalError)
            .then((payload) => {
                console.log(payload)

                const name = payload.name;
                const value = JSON.stringify(payload.value);
                let address = NAMESPACE[0] + hash(name).substring(0, 64);
                let actionFn = applySet;
                let getPromise = context.getState([address]);
                let actionPromise = getPromise.then(
                    actionFn(context, address, name, value)
                )

                return actionPromise.then(addresses => {
                    if (addresses.length === 0) {
                        throw new InternalError('State error!');
                    }
                    console.log(`Name: ${name} Value: ${value}`);
                })
            });

                /*
                if (!payload.action) {
                    throw new InvalidTransaction("No action found in the payload.");
                }
                if (!payload.id) {
                    throw new InvalidTransaction("No ID found in the payload.");
                }
                if (!payload.data) {
                    throw new InvalidTransaction("No data found in the payload.");
                }

                let action = payload.action;

                switch (action) {
                    case "deposit":
                        context.getState([address])
                            .then((possibleAddressValues) => {
                                let stateValue = possibleAddressValues[address];
                                if (stateValue && stateValue.length) {
                                    let value = cbor.decodeFirstSync(stateValue);
                                    if (value[id]) {
                                        value[id].amount = value[id].amount + payload['data']['amount'];

                                        setEntry(context, address, value[id]);
                                    }
                                }
                            })
                        setEntry(context, address, payload.data);

                    case "withdraw":
                        context.getState([address])
                            .then((possibleAddressValues) => {
                                let stateValue = possibleAddressValues[address];
                                if (stateValue && stateValue.length) {
                                    let value = cbor.decodeFirstSync(stateValue);
                                    if (value[id]) {
                                        if (value[id].amount - payload['data']['amount'] >= 0) {
                                            value[id].amount = value[id].amount - payload['data']['amount'];
                                        } else {
                                            throw new InvalidTransaction("Insufficient funds to complete the transaction");
                                        }

                                        setEntry(context, address, value[id]);
                                    }
                                }
                            });

                    default:
                        throw new InvalidTransaction("The action is invalid or not supported by this transaction processor.");
                }
            })
            .catch((err) => {
                throw new InternalError("Internal error while decoding the payload.");
            })*/
    }
}

module.exports = WalletHandler;
