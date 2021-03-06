/*
Run 'npm install' followed by 'node index.js' to run this demo transaction processor.
It will attempt to connect to a validator at localhost:4004
*/

const { TransactionProcessor } = require('sawtooth-sdk/processor');
const WalletHandler = require('./src/tp/demo_handler');
const KeyHandler = require('./src/tp/key_handler');
const SupplyHandler = require('./src/tp/supply_handler');

const transactionProcessor = new TransactionProcessor(`tcp://${process.env.VALIDATOR_NUM}:4004`);

transactionProcessor.addHandler(new WalletHandler());
transactionProcessor.addHandler(new KeyHandler());
transactionProcessor.addHandler(new SupplyHandler());
transactionProcessor.start();

process.on('SIGUSR2', () => {
    transactionProcessor._handleShutdown();
})
