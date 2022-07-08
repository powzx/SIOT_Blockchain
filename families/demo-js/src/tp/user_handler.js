const { InternalError } = require('sawtooth-sdk/processor/exceptions');
const { TransactionHandler } = require('sawtooth-sdk/processor/handler');
const { decodeCbor, hash, toInternalError, setEntry, applySet } = require ('../lib/helper');

const FAMILY_NAME = "user", VERSION = "1.0", NAMESPACE = [hash(FAMILY_NAME).substring(0, 6)];

class UserHandler extends TransactionHandler {
    constructor() {
        super(FAMILY_NAME, [VERSION], NAMESPACE);
    }

    apply(transactionRequest, context) {
        console.log("Applying transaction on network...")
        return decodeCbor(transactionRequest.payload)
            .catch(toInternalError)
            .then((payload) => {
                console.log(payload)

                const username = payload.key;
                const data = JSON.stringify(payload.data);
                let address = NAMESPACE[0] + hash(username).substring(0, 64);

                context.getState([address]).then(
                    (possibleAddressValues) => {
                        let stateValue = possibleAddressValues[address];
                        if (stateValue && stateValue.length) {
                            let value = cbor.decodeFirstSync(stateValue);
                            console.log(value)
                            if (value['data']) {
                                throw new InvalidTransaction("Username is already taken!");
                            }
                            
                            setEntry(context, address, data)
                        }
                    }
                );

                // let getPromise = context.getState([address]);
                // let actionPromise = getPromise.then(
                //     (possibleAddressValues) => {
                //         let stateValue = possibleAddressValues[address];
                //         if (stateValue && stateValue.length) {
                //             let value = cbor.decodeFirstSync(stateValue);
                //             console.log(value)
                //             if (value['publicKey']) {
                //                 throw new InvalidTransaction("Username is already taken!");
                //             } else {
                //                 actionFn(context, address, username, data)
                //             }
                //         }
                //     }
                // );

                // return actionPromise.then(addresses => {
                //     if (addresses.length === 0) {
                //         throw new InternalError('State error!');
                //     }
                //     console.log(`Username: ${username} Public Key: ${payload.data.publicKey}`);
                // })
            });
    }
}

module.exports = UserHandler;
