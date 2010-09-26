"""HTTP request handlers for Online Lab core. """

import logging
import functools

import tornado.web
import tornado.escape

import services

from ..utils.jsonrpc import AsyncJSONRPCRequestHandler

class AsyncHandler(tornado.web.RequestHandler):
    """Handle message routing between clients and services. """

    @tornado.web.asynchronous
    def post(self):
        # XXX: implement message routing
        self.write('OK')
        self.finish()

class ServiceHandler(AsyncJSONRPCRequestHandler):
    """Handle communication from Online Lab services. """

    __methods__ = ['register']

    def initialize(self):
        self.manager = services.ServiceManager().instance()

    def register(self, service_url):
        """Process registration request from a service. """
        try:
            self.manager.add_service(service_url)
        except services.AlreadyExists:
            self.return_result({ 'ok': True, 'exists': True })
        else:
            self.return_result({ 'ok': True, 'exists': False })

