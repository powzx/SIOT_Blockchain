const { TransactionProcessor } = require('sawtooth-sdk/processor');
const WalletHandler = require('./src/tp/demo_handler');

const transactionProcessor = new TransactionProcessor('tcp://localhost:4004');

transactionProcessor.addHandler(new WalletHandler());
transactionProcessor.start();

process.on('SIGUSR2', () => {
    transactionProcessor._handleShutdown();
})
