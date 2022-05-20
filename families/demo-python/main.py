from sawtooth_sdk.processor.core import TransactionProcessor
from handler import DemoTransactionHandler

def main():
    processor = TransactionProcessor(url = 'tcp://validator-0:4004')
    handler = DemoTransactionHandler()
    processor.add_handler(handler)
    processor.start()

main()
