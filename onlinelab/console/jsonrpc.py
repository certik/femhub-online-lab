"""Convenient interface to JSON RPC services. """

from urllib import urlopen
from simplejson import dumps, loads

class JSONRPCError(Exception):

    def __init__(self, error):
        self.error = error

    def __str__(self):
        return self.error['message']

class JSONRPCMethod(object):
    """Represents a JSON RPC method of some service. """

    def __init__(self, url, method, auth=None):
        self.url = url
        self.method = method
        self.auth = auth

    def __repr__(self):
        return "<jsonrpc-method %s at %s>" % (self.method, self.url)

    def __getattr__(self, method):
        method = "%s.%s" % (self.method, method)
        return self.__class__(self.url, method, auth)

    def __call__(self, *params):
        if self.auth is not None:
            params = self.auth + params

        data = dumps({
            'jsonrpc': '2.0',
            'method': self.method,
            'params': params,
            'id': 'jsonrpc',
        })

        url = urlopen(self.url, data)
        response = loads(url.read())
        url.close()

        if response['error'] is None:
            return response['result']
        else:
            raise JSONRPCError(response['error'])

class JSONRPCNamespace(object):
    """Represents a collection of JSON RPC methods. """

    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return "<jsonrpc-namespace %s>" % self.name

class JSONRPCService(object):
    """Provides convenient access to a JSON RPC service. """

    def __init__(self, url, auth=None):
        self.url = url
        self.auth = auth

        self.desc = JSONRPCMethod(self.url, 'system.describe')()

        for proc in self.desc['procs']:
            names = proc['name'].split('.')
            namespace = self

            for name in names[:-1]:
                if not hasattr(namespace, name):
                    ns = JSONRPCNamespace(name)
                    setattr(namespace, name, ns)

                namespace = getattr(namespace, name)

            if proc['auth']:
                auth = self.auth
            else:
                auth = None

            method = JSONRPCMethod(self.url, proc['name'], auth)
            method.__doc__ = proc['summary']

            setattr(namespace, names[-1], method)

    def __repr__(self):
        return "<jsonrpc-service %s>" % self.url

