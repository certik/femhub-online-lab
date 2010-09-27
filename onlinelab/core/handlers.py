"""HTTP request handlers for Online Lab core. """

import logging
import functools

import tornado.web
import tornado.escape

import services

from ..utils import jsonrpc

class AsyncHandler(jsonrpc.AsyncJSONRPCRequestHandler):
    """Handle message routing between clients and services. """

    __methods__ = ['init', 'kill', 'stat', 'evaluate', 'interrupt']

    def initialize(self):
        self.manager = services.ServiceManager().instance()

    def forward(self, uuid, method, params):
        """Forward a method call to the assigned service. """
        try:
            try:
                service = self.manager.get_service(uuid)
            except services.NotAssignedYet:
                if method == 'init':
                    service = self.manager.bind(uuid)
                else:
                    self.return_error(1, "'%s' method called before 'init'" % method)
                    return
            except services.Disconnected:
                if method == 'init':
                    service = self.manager.bind(uuid)
                else:
                    if self.method == 'kill':
                        self.manager.unbind(uuid)

                    self.return_result({'disconnected': True})
                    return
        except services.NoServicesAvailable:
            self.return_error(2, "No services are currently available")
            return

        okay = functools.partial(self.on_forward_okay, uuid)
        fail = functools.partial(self.on_forward_fail, uuid)

        proxy = jsonrpc.JSONRPCProxy(service.url, 'engine')
        proxy.call(method, params, okay, fail)

    def on_forward_okay(self, uuid, result):
        """Gets executed when remote call succeeded. """
        if self.method == 'kill':
            self.manager.unbind(uuid)

        self.return_result(result)

    def on_forward_fail(self, uuid, error, http_code):
        """Gets executed when remote call failed. """
        self.manager.unbind(uuid)
        self.return_result(error)

    def init(self, uuid):
        """Forward 'init' method call to the assigned service. """
        self.forward(uuid, 'init', {'uuid': uuid})

    def kill(self, uuid):
        """Forward 'kill' method call to the assigned service. """
        self.forward(uuid, 'kill', {'uuid': uuid})

    def stat(self, uuid):
        """Forward 'stat' method call to the assigned service. """
        self.forward(uuid, 'stat', {'uuid': uuid})

    def evaluate(self, uuid, source, cellid=None):
        """Forward 'evaluate' method call to the assigned service. """
        self.forward(uuid, 'evaluate', {'uuid': uuid, 'source': source, 'cellid': cellid})

    def interrupt(self, uuid, cellid=None):
        """Forward 'interrupt' method call to the assigned service. """
        self.forward(uuid, 'interrupt', {'uuid': uuid, 'cellid': cellid})

class ServiceHandler(jsonrpc.AsyncJSONRPCRequestHandler):
    """Handle communication from Online Lab services. """

    __methods__ = ['register']

    def initialize(self):
        self.manager = services.ServiceManager().instance()

    def register(self, service_url):
        """Process registration request from a service. """
        try:
            self.manager.add_service(service_url)
        except services.AlreadyExists:
            registered = False
        else:
            registered = True

        self.return_result({ 'registered': registered })

