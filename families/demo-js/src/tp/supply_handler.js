const { InternalError } = require('sawtooth-sdk/processor/exceptions');
const { TransactionHandler } = require('sawtooth-sdk/processor/handler');
const { decodeCbor, hash, toInternalError, setEntry, applySet } = require ('../lib/helper');

const FAMILY_NAME = "supply", VERSION = "1.0", NAMESPACE = [hash(FAMILY_NAME).substring(0, 6)];

class SupplyHandler extends TransactionHandler {
    constructor() {
        super(FAMILY_NAME, [VERSION], NAMESPACE);
    }

    apply(transactionRequest, context) {
        console.log("Applying transaction on network...")
        return decodeCbor(transactionRequest.payload)
            .catch(toInternalError)
            .then((payload) => {
                console.log(payload)

                const serialNum = payload.serialNum;
                const data = JSON.stringify(payload.data);
                let address = NAMESPACE[0] + hash(serialNum).substring(0, 64);
                let actionFn = applySet;
                let getPromise = context.getState([address]);
                let actionPromise = getPromise.then(
                    actionFn(context, address, serialNum, data)
                )

                return actionPromise.then(addresses => {
                    if (addresses.length === 0) {
                        throw new InternalError('State error!');
                    }
                    console.log(`Serial Number: ${serialNum} Data: ${data}`);
                })
            });
    }
}

module.exports = SupplyHandler;
