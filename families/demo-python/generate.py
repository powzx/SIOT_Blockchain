import hashlib
import logging
import random

import cbor

from handler import make_demo_address

from sawtooth_signing import create_context
from sawtooth_signing import CryptoFactory

from sawtooth_sdk.protobuf import transaction_pb2
from sawtooth_sdk.protobuf import batch_pb2
from sawtooth_sdk.protobuf.batch_pb2 import BatchList

LOGGER = logging.getLogger(__name__)

class DemoPayLoad:
    def __init__(self, verb, name, value):
        self._verb = verb
        self._name = name
        self._value = value

        self._cbor = None
        self._sha512 = None

    def to_hash(self):
        return {
            'Verb': self._verb,
            'Name': self._name,
            'Value': self._value
        }

    def to_cbor(self):
        if self._cbor is None:
            self._cbor = cbor.dumps(self.to_hash(), sort_keys = True)

        return self._cbor

    def sha512(self):
        if self._sha512 is None:
            self._sha512 = hashlib.sha512(self.to_cbor()).hexdigest()

        return self._sha512

def generate_signer():
    # Generate for each identity
    context = create_context('secp256k1')
    private_key = context.new_random_private_key()
    signer = CryptoFactory(context).new_signer(private_key)
    
    return signer

def create_demo_transaction(verb, name, value, signer):
    payload = DemoPayLoad(verb = verb, name = name, value = value)
    addr = make_demo_address(name)

    header = transaction_pb2.TransactionHeader(
        signer_public_key = signer.get_public_key().as_hex(),
        family_name = 'fish',
        family_version = '1.0',
        inputs = [addr],
        outputs = [addr],
        dependencies = [],
        payload_sha512 = payload.sha512(),
        batcher_public_key = signer.get_public_key().as_hex(),
        nonce = hex(random.randint(0, 2**64))
    )

    header_bytes = header.SerializeToString()
    signature = signer.sign(header_bytes)

    transaction = transaction_pb2.Transaction(
        header = header_bytes,
        payload = payload.to_cbor(),
        header_signature = signature
    )

    return transaction

def create_batch(transactions, signer):
    transaction_signatures = [t.header_signature for t in transactions]
    
    header = batch_pb2.BatchHeader(
        signer_public_key = signer.get_public_key().as_hex(),
        transaction_ids = transaction_signatures
    )

    header_bytes = header.SerializeToString()
    signature = signer.sign(header_bytes)

    batch = batch_pb2.Batch(
        header = header_bytes,
        transactions = transactions,
        header_signature = signature
    )

    return batch

def create_batch_list(batch):
    batch_list = BatchList(batches = [batch])

    return batch_list.SerializeToString()
