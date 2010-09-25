"""HTTP request handlers for Online Lab core. """

import logging
import functools

import tornado.web
import tornado.escape

class AsyncHandler(tornado.web.RequestHandler):
    """Handle message routing between clients and services. """

    @tornado.web.asynchronous
    def post(self):
        # XXX: implement message routing
        self.write('OK')
        self.finish()

