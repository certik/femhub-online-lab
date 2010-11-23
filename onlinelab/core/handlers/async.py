"""Implementation of ``AsyncHandler``. """

import functools

from base import WebHandler
from ...core import services
from ...utils import jsonrpc

class AsyncHandler(WebHandler):
    """Handle message routing between clients and services. """

    __methods__ = [
        'RPC.Engine.init',
        'RPC.Engine.kill',
        'RPC.Engine.stat',
        'RPC.Engine.complete',
        'RPC.Engine.evaluate',
        'RPC.Engine.interrupt',
    ]

    def initialize(self):
        super(AsyncHandler, self).initialize()
        self.manager = services.ServiceManager().instance()

    def forward(self, uuid, method, params):
        """Forward a method call to the assigned service. """
        try:
            service = self.manager.get_service(uuid)
        except services.NotAssignedYet:
            if method == 'init':
                try:
                    service = self.manager.bind(uuid)
                except services.NoServicesAvailable:
                    self.return_api_error('no-services-available')
                    return
            else:
                self.return_api_error('service-disconnected')
                return

        okay = functools.partial(self.on_forward_okay, uuid)
        fail = functools.partial(self.on_forward_fail, uuid)

        proxy = jsonrpc.JSONRPCProxy(service.url, 'engine')
        proxy.call(method, params, okay, fail)

    def on_forward_okay(self, uuid, result):
        """Gets executed when remote call succeeded. """
        self.return_result(result)
        self.logger(self.method, ok=True)

    def on_forward_fail(self, uuid, error, http_code):
        """Gets executed when remote call failed. """
        self.manager.unbind(uuid)

        if http_code == 599:
            self.return_api_error('service-disconnected')
        else:
            self.return_internal_error()
            self.logger(self.method, ok=False, error=error)

    def RPC__Engine__init(self, uuid):
        """Forward 'init' method call to the assigned service. """
        self.forward(uuid, 'init', {'uuid': uuid})

    def RPC__Engine__kill(self, uuid):
        """Forward 'kill' method call to the assigned service. """
        self.forward(uuid, 'kill', {'uuid': uuid})
        self.manager.unbind(uuid)

    def RPC__Engine__stat(self, uuid):
        """Forward 'stat' method call to the assigned service. """
        self.forward(uuid, 'stat', {'uuid': uuid})

    def RPC__Engine__complete(self, uuid, source):
        """Forward 'complete' method call to the assigned service. """
        self.forward(uuid, 'complete', {'uuid': uuid, 'source': source})

    def RPC__Engine__evaluate(self, uuid, source, cellid=None):
        """Forward 'evaluate' method call to the assigned service. """
        self.forward(uuid, 'evaluate', {'uuid': uuid, 'source': source, 'cellid': cellid})

    def RPC__Engine__interrupt(self, uuid, cellid=None):
        """Forward 'interrupt' method call to the assigned service. """
        self.forward(uuid, 'interrupt', {'uuid': uuid, 'cellid': cellid})

