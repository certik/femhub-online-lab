"""Runtime environment for Python engines. """

import os
import sys
import socket

from interpreter import PythonInterpreter
from server import PythonXMLRPCServer

class PythonEngine(object):
    """The most basic Python engine. """

    transport = PythonXMLRPCServer

    def __init__(self, interpreter=None):
        if interpreter is None:
            self.interpreter = PythonInterpreter()
        else:
            self.interpreter = interpreter

    @classmethod
    def find_port(cls):
        """Find a free port for this engine. """
        sock = socket.socket()
        sock.bind(('',0))
        port = sock.getsockname()[1]
        sock.close()
        del sock
        return port

    def notify_ready(self, port):
        """Notify a service that the engine is running. """
        sys.stdout.write('port=%s, pid=%s\n' % (port, os.getpid()))

    def run_server(self, port, interactive=False):
        """Start a server for handling requests from a service. """
        server = self.transport(port, self.interpreter)
        self.notify_ready(port)
        server.serve_forever(interactive)

    def run(self, interactive=False):
        """Find a free port and run server for this engine. """
        self.run_server(self.find_port(), interactive)

