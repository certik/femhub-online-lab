"""Common JSON-RPC utilities for core and services. """

import uuid
import logging
import urlparse
import functools

import tornado.web
import tornado.escape
import tornado.httpclient

class AsyncJSONRPCRequestHandler(tornado.web.RequestHandler):
    """Simple handler of JSON-RPC requests. """

    __methods__ = None

    def return_result(self, result=None):
        """Return properly formatted JSON-RPC result response. """
        response = { 'result': result, 'error': None, 'id': self.id }
        body = tornado.escape.json_encode(response)

        self.write(body)
        self.finish()

        logging.info("JSON-RPC: method call ended successfully")

    def return_error(self, code, message, data=None):
        """Return properly formatted JSON-RPC error response. """
        error = { 'code': code, 'message': message }

        if data is not None:
            error['data'] = data

        response = { 'result': None, 'error': error }

        if hasattr(self, 'id'):
            response['id'] = self.id

        body = tornado.escape.json_encode(response)

        self.write(body)
        self.finish()

        logging.info("JSON-RPC: error: %(message)s (%(code)s)" % vars())

    def return_parse_error(self, data=None):
        """Return 'Parse error' JSON-RPC error response. """
        self.return_error(-32700, "Parse error", data)

    def return_invalid_request(self, data=None):
        """Return 'Invalid request' JSON-RPC error response. """
        self.return_error(-32600, "Invalid request", data)

    def return_method_not_found(self, data=None):
        """Return 'Method not found' JSON-RPC error response. """
        self.return_error(-32601, "Method not found", data)

    def return_invalid_params(self, data=None):
        """Return 'Invalid params' JSON-RPC error response. """
        self.return_error(-32602, "Invalid params", data)

    def return_internal_error(self, data=None):
        """Return 'Server error' JSON-RPC error response. """
        self.return_error(-32603, "Server error", data)

    @tornado.web.asynchronous
    def post(self):
        """Receive and process JSON-RPC requests. """
        logging.info("JSON-RPC: received RPC method call")

        try:
            data = tornado.escape.json_decode(self.request.body)
        except ValueError:
            self.return_parse_error()
        else:
            method = data.get('method', None)

            if method is None:
                self.return_invalid_request()
                return

            params = data.get('params', None)

            if params is None:
                self.return_invalid_request()
                return

            if method not in self.__methods__:
                self.return_method_not_found()
                return

            func = getattr(self, method)

            if func is not None:
                if type(params) == dict:
                    try:
                        func(**params)
                    except TypeError:
                        pass
                    else:
                        return

                if type(params) == list:
                    try:
                        func(*params)
                    except TypeError:
                        pass
                    else:
                        return

                self.return_invalid_params()
            else:
                self.return_internal_error()

class JSONRPCProxy(object):
    """Simple proxy for making JSON-RPC requests. """

    def __init__(self, url, rpc=None):
        if rpc is not None:
            self.url = urlparse.urljoin(url, rpc)
        else:
            self.url = url

    def call(self, method, params, okay=None, fail=None):
        """Make an asynchronous JSON-RPC method call. """
        http_client = tornado.httpclient.AsyncHTTPClient()

        body = tornado.escape.json_encode({
            'jsonrpc': '2.0',
            'method': method,
            'params': params,
            'id': uuid.uuid4().hex,
        });

        logging.info("JSON-RPC: call '%s' method on %s" % (method, self.url))

        http_request = tornado.httpclient.HTTPRequest(self.url, method='POST', body=body)
        http_client.fetch(http_request, functools.partial(self._on_response_handler, okay, fail))

    def _on_response_handler(self, okay, fail, response):
        """Parse and process response from a JSON-RPC server. """
        if response.code == 200:
            try:
                data = tornado.escape.json_decode(response.body)
            except ValueError:
                logging.error("JSON-RPC: error: parsing response failed")
            else:
                error = data.get('error', None)

                if error is not None:
                    if fail is None:
                        logging.error("JSON-RPC: error: %s" % error['message'])
                    else:
                        fail(error)
                else:
                    if okay is not None:
                        result = data.get('result', None)

                        if result is None:
                            logging.error("JSON-RPC: error: didn't receive any results")
                        else:
                            okay(result)
        else:
            logging.error("JSON-RPC: error: got %s HTTP response code" % response.code)

