"""Communication tools between a service and a Python engine. """

import sys

from SimpleXMLRPCServer import SimpleXMLRPCServer

class PythonXMLRPCMethods(object):
    """Translation layer between engine API and an interpreter. """

    def __init__(self, interpreter):
        self.interpreter = interpreter

    def complete(self, source):
        """Complete a piece of source code. """
        return self.interpreter.complete(source)

    def evaluate(self, source):
        """Evaluate a piece of source code. """
        return self.interpreter.evaluate(source)

class PythonXMLRPCServer(SimpleXMLRPCServer):
    """XML-RPC server for handling requests from a service. """

    methods = PythonXMLRPCMethods

    def __init__(self, port, interpreter):
        address = ('localhost', port)

        SimpleXMLRPCServer.__init__(self, address,
            logRequests=False, allow_none=True)

        self.register_instance(self.methods(interpreter))
        self.register_introspection_functions()

    def serve_forever(self, interactive=False):
        """Indefinitely serve XML RPC requests. """
        sys.stdout.flush()

        while True:
            try:
                self.handle_request()
            except KeyboardInterrupt:
                # Note that we use SIGINT for interrupting evaluation in the
                # underlying interpreter instance, so in 'interactive' mode
                # you will need to send two SIGINTs to the process (one to
                # interrupt currently evaluating code and one to stop the
                # RPC server) to terminate it.
                if interactive:
                    print "\nTerminated (interactive mode)"
                    break

