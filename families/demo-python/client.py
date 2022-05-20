import requests
from generate import *

class DemoClient:
    def __init__(self, url):
        # URL of REST API
        self.url = url
        self._signer = generate_signer()

    def init(self, name, value, wait = None):
        return self._send_transaction('init', name, value, wait = wait)

    def update(self, name, value, wait = None):
        return self._send_transaction('update', name, value, wait = wait)

    def _send_request(self, suffix, data = None, content_type = None, name = None):
        if self.url.startswith("http://"):
            url = "{}/{}".format(self.url, suffix)
        else:
            url = "http://{}/{}".format(self.url, suffix)

        headers = {}

        if content_type is not None:
            headers['Content-Type'] = content_type

        try:
            if data is not None:
                result = requests.post(url, headers=headers, data=data)
            else:
                result = requests.get(url, headers=headers)

            if result.status_code == 404:
                raise Exception("No such key: {}".format(name))

            if not result.ok:
                raise Exception("Error {}: {}".format(
                    result.status_code, result.reason))

        except requests.ConnectionError as err:
            raise Exception(
                'Failed to connect to REST API: {}'.format(err)) from err

        except BaseException as err:
            raise Exception(err) from err

        return result.text

    def _send_transaction(self, verb, name, value, wait = None):
        transaction = create_demo_transaction(verb, name, value, self._signer)
        batch = create_batch([transaction], self._signer)
        batch_list = create_batch_list(batch = batch)

        return self._send_request(
            "batches", batch_list, 'application/octet-stream'
        )

client = DemoClient("http://192.168.11.109:8008")
client._send_transaction("init", "Romeo", "12")
