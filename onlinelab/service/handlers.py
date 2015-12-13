"""HTTP request handlers for Online Lab services. """

import logging
import functools

import tornado.web
import tornado.escape

import processes

from ..utils import jsonrpc
from ..utils import Settings

class Args(dict):
    """Dictionary with object-like access. """

    def __getattr__(self, name):
        try:
            return self[name]
        except KeyError:
            raise AttributeError("'%s' is not a valid attribute" % name)

class MainHandler(tornado.web.RequestHandler):
    """Handle simple GET request. """

    def get(self):
        self.write("Online Lab")

class CoreHandler(jsonrpc.AsyncJSONRPCRequestHandler):
    """Handle communication from Online Lab core. """

    __methods__ = ['ping']

    def ping(self, uuid=None):
        """Process ping request from a core. """
        logging.info("Got ping from a core. Told that we're ready.")

        settings = Settings.instance()

        self.return_result({
            'uuid': self.settings['service_uuid'],
            'provider': settings.provider,
            'description': settings.description,
        })

class EngineHandler(jsonrpc.APIRequestHandler):
    """Handle method calls to be executed on an engine. """

    __methods__ = ['init', 'kill', 'stat', 'complete', 'evaluate', 'interrupt']

    def initialize(self):
        self.manager = processes.ProcessManager.instance()

    def on_method_okay(self, result):
        """Gets executed when engine method call succeeded. """
        if isinstance(result, str):
            self.return_api_result({'status': result})
        else:
            self.return_api_result(result)

    def on_method_fail(self, error=None):
        """Gets executed when engine method call failed. """
        self.return_api_error(error)

    okay = on_method_okay
    fail = on_method_fail

    def init(self, uuid):
        """Process 'init' method call from a client. """
        self.manager.init(uuid, Args({}), self.okay, self.fail)

    def kill(self, uuid):
        """Process 'kill' method call from a client. """
        self.manager.kill(uuid, Args({}), self.okay, self.fail)

    def stat(self, uuid):
        """Process 'stat' method call from a client. """
        self.manager.stat(uuid, Args({}), self.okay, self.fail)

    def complete(self, uuid, source):
        """Process 'complete' method call from a client. """
        self.manager.complete(uuid, Args(source=source), self.okay, self.fail)

    def evaluate(self, uuid, source, cellid=None):
        """Process 'evaluate' method call from a client. """
        self.manager.evaluate(uuid, Args(source=source, cellid=cellid), self.okay, self.fail)

    def interrupt(self, uuid, cellid=None):
        """Process 'interrupt' method call from a client. """
        self.manager.interrupt(uuid, Args(cellid=cellid), self.okay, self.fail)

