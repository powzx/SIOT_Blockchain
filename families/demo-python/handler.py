import logging
import hashlib

import cbor

from sawtooth_sdk.processor.handler import TransactionHandler
from sawtooth_sdk.processor.exceptions import InvalidTransaction
from sawtooth_sdk.processor.exceptions import InternalError

LOGGER = logging.getLogger(__name__)

VALID_VERBS = 'init', 'update'

FAMILY_NAME = 'fish'

DEMO_ADDRESS_PREFIX = hashlib.sha512(
    FAMILY_NAME.encode('utf-8')).hexdigest()[:6]

def make_demo_address(name):
    return DEMO_ADDRESS_PREFIX + hashlib.sha512(
        name.encode('utf-8')).hexdigest()[:64]

class DemoTransactionHandler(TransactionHandler):
    @property
    def family_name(self):
        return FAMILY_NAME

    @property
    def family_versions(self):
        return ['1.0']

    @property
    def namespaces(self):
        return [DEMO_ADDRESS_PREFIX]

    def apply(self, transaction, context):
        verb, name, value = _unpack_transaction(transaction)
        state = _get_state_data(name, context)
        updated_state = _do_demo(verb, name, value, state)
        _set_state_data(name, updated_state, context)

def _unpack_transaction(transaction):
    verb, name, value = _decode_transaction(transaction)

    _validate_verb(verb)
    _validate_name(name)
    _validate_value(value)

    return verb, name, value

def _decode_transaction(transaction):
    try:
        content = cbor.loads(transaction.payload)

    except Exception as e:
        raise InvalidTransaction('Invalid payload serialization') from e

    try:
        verb = content['Verb']

    except AttributeError:
        raise InvalidTransaction('Verb is required') from AttributeError

    try:
        name = content['Name']

    except AttributeError:
        raise InvalidTransaction('Name is required') from AttributeError

    try:
        value = content['Value']

    except AttributeError:
        raise InvalidTransaction('Value is required') from AttributeError

    return verb, name, value

def _validate_verb(verb):
    if verb not in VALID_VERBS:
        raise InvalidTransaction('Verb must be "init" or "update"')

def _validate_name(name):
    if not isinstance(name, str):
        raise InvalidTransaction('Name must be a string')

def _validate_value(value):
    if not isinstance(value, int):
        raise InvalidTransaction('Value must be an integer')

def _get_state_data(name, context):
    address = make_demo_address(name)
    state_entries = context.get_state([address])

    try:
        return cbor.loads(state_entries[0].data)
    
    except IndexError:
        return {}
    
    except Exception as e:
        raise InternalError('Failed to load state data') from e

def _set_state_data(name, state, context):
    address = make_demo_address(name)
    encoded = cbor.dumps(state)
    addresses = context.set_state({address: encoded})

    if not addresses:
        raise InternalError('State error')

def _do_demo(verb, name, value, state):
    verbs = {
        'init': _do_init,
        'update': _do_update
    }

    try:
        return verbs[verb](name, value, state)

    except KeyError:
        raise InternalError('Unhandled verb: {}'.format(verb)) from KeyError

def _do_init(name, value, state):
    msg = 'Initializing fish #{n} to {v}'.format(n = name, v = value)
    LOGGER.debug(msg)

    if name in state:
        raise InvalidTransaction(
            'Verb is "init", but fish already exists: Name: {n}, Value: {v}'.format(
                n = name,
                v = state[name]
            )
        )

    updated = dict(state.items())
    updated[name] = value

    return updated

def _do_update(name, value, state):
    msg = 'Updating fish #{n} to {v}'.format(n = name, v = value)
    LOGGER.debug(msg)

    if name not in state:
        raise InvalidTransaction(
            'Verb is "update", but fish #{} does not exist'.format(name)
        )

    updated = dict(state.items())
    updated[name] = value

    return updated
