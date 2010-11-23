"""Implementation of ``ServiceHandler``. """

from ...utils.jsonrpc import APIRequestHandler
from ...core import services

class ServiceHandler(APIRequestHandler):
    """Handle communication from Online Lab services. """

    __methods__ = ['register']

    def initialize(self):
        self.manager = services.ServiceManager().instance()

    def register(self, url, uuid, provider, description):
        """Process registration request from a service. """
        self.manager.add_service(url, uuid, provider, description)
        self.return_result()

