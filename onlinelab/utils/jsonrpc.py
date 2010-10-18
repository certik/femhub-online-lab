"""Common JSON-RPC utilities for core and services. """

import uuid
import logging
import urlparse
import functools

import tornado.web
import tornado.escape
import tornado.httpclient

import extensions

def datetime(obj):
    """Encode ``datetime`` object as a string. """
    if obj is not None:
        return obj.strftime("%Y-%m-%d %H:%M:%S")
    else:
        return None

def unicode_encode_dict(d):
    p = {}
    for k in d:
        k = unicode.encode(k)
        p[k] = d[k]
    return p

class JSONRPCError(Exception):
    """Base class for JSON-RPC errors. """

    def __init__(self, data):
        self.data = data

class ParseError(JSONRPCError):
    name = 'parse_error'

class InvalidRequest(JSONRPCError):
    name = 'invalid_request'

class MethodNotFound(JSONRPCError):
    name = 'method_not_found'

class InvalidParams(JSONRPCError):
    name = 'invalid_params'

class InternalError(JSONRPCError):
    name = 'internal_error'

class AuthenticationRequired(JSONRPCError):
    name = 'authentication_required'

def authenticated(func):
    """Mark a function as requiring authentication. """
    func.authenticated = True
    return func

class AsyncJSONRPCRequestHandler(extensions.ExtRequestHandler):
    """Simple handler of JSON-RPC requests. """

    __methods__ = None

    def return_result(self, result=None):
        """Return properly formatted JSON-RPC result response. """
        response = { 'result': result, 'error': None, 'id': self.id }
        body = tornado.escape.json_encode(response)

        try:
            self.write(body)
            self.finish()
        except IOError:
            logging.warning("JSON-RPC: warning: connection was closed")
        else:
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

        try:
            self.set_status(400)
            self.write(body)
            self.finish()
        except IOError:
            logging.warning("JSON-RPC: warning: connection was closed")
        else:
            logging.info("JSON-RPC: error: %s (%s, %s)" % (message, code, data))

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

    def return_authentication_required(self, data=None):
        """Return 'Authentication required' JSON-RPC error response. """
        self.return_error(-1, "Authentication required", data)

    def return_description(self):
        """Return description of methods available in this handler. """
        procs = []

        for name in self.__methods__:
            func = getattr(self, name.replace('.', '__'), None)

            if func is not None:
                procs.append({
                    'name': name,
                    'summary': func.__doc__,
                    'authenticated': getattr(func, 'authenticated', False),
                })

        self.return_result({'procs': procs})

    @tornado.web.asynchronous
    def post(self):
        """Receive and process JSON-RPC requests. """
        logging.info("JSON-RPC: received RPC method call")

        try:
            try:
                data = tornado.escape.json_decode(self.request.body)
            except ValueError:
                raise ParseError
            else:
                for name in ['jsonrpc', 'id', 'method', 'params']:
                    value = data.get(name, None)

                    if value is not None:
                        setattr(self, name, value)
                    else:
                        raise InvalidRequest("'%s' parameter is mandatory" % name)

                if self.method == 'system.describe':
                    self.return_description()
                    return

                if self.method not in self.__methods__:
                    raise MethodNotFound("'%s' is not a valid method" % self.method)

                func = getattr(self, self.method.replace('.', '__'))

                if func is None:
                    raise InternalError("'%s' method hasn't been implemented" % self.method)

                if getattr(func, 'authenticated', False) and not self.current_user.is_authenticated():
                    raise AuthenticationRequired("%s' method requires authentication" % self.method)

                if type(self.params) == dict:
                    try:
                        params = unicode_encode_dict(self.params)
                        func(**params)
                    except TypeError, exc:
                        raise InvalidParams(exc.args[0])
                    else:
                        return

                if type(self.params) == list:
                    try:
                        func(*self.params)
                    except TypeError, exc:
                        raise InvalidParams("Invalid number of positional arguments")
                    else:
                        return

                try:
                    func(self.params)
                except TypeError, exc:
                    raise InvalidParams("Method does not take any arguments")
        except JSONRPCError, exc:
            getattr(self, 'return_' + exc.name)(exc.data)

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

        http_request = tornado.httpclient.HTTPRequest(self.url, method='POST', body=body, request_timeout=0)
        http_client.fetch(http_request, functools.partial(self._on_response_handler, okay, fail))

    def _on_response_handler(self, okay, fail, response):
        """Parse and process response from a JSON-RPC server. """
        error = None

        try:
            if response.code != 200:
                raise JSONRPCError("got %s HTTP response code" % response.code)

            try:
                data = tornado.escape.json_decode(response.body)
            except ValueError:
                raise JSONRPCError("parsing response failed")
            else:
                error = data.get('error', None)

                if error is not None:
                    raise JSONRPCError("code=%(code)s, message=%(message)s" % error)

                if okay is not None:
                    okay(data.get('result', None))
        except JSONRPCError, exc:
            logging.error("JSON-RPC: error: %s" % exc.data)

            if fail is not None:
                fail(error, http_code=response.code)

