"""Base classes for core request handlers. """

import logging

from datetime import datetime

import tornado.escape

from ..auth import DjangoMixin
from ..cors import CORSMixin

from ...utils.jsonrpc import APIRequestHandler
from ...utils.settings import Settings

class WebHandler(DjangoMixin, CORSMixin, APIRequestHandler):
    """Base class for user <-> core APIs (client/async). """

    def initialize(self):
        """Setup internal configuration of this handler. """
        self.config = settings = Settings.instance()

        if not settings.cross_site:
            self.cross_site = False
        else:
            self.cross_site = True

            if settings.allow_all_origins:
                self.allowed_origins = True
            else:
                self.allowed_origins = settings.allowed_origins

    def prepare(self):
        """Prepare this handler for handling CORS requests. """
        self.prepare_for_cors()

    def logger(self, action=None, args=None, **kwargs):
        """Log user actions for further analysis and refinement. """
        actions = logging.getLogger('actions')

        data = {
            'datetime': str(datetime.now()),
            'username': self.user.username,
            'action': action or self.method,
        }

        data.update(self.params)
        data.update(args or {})
        data.update(kwargs)

        for key, value in dict(data).iteritems():
            if 'password' in key:
                del data[key]

        actions.info(tornado.escape.json_encode(data))

    def return_api_result(self, result=None, args=None, **kwargs):
        """Return higher-level JSON-RPC result response and log it. """
        super(WebHandler, self).return_api_result(result)
        self.logger(self.method, args, ok=True, **kwargs)

    def return_api_error(self, error=None, args=None, **kwargs):
        """Return higher-level JSON-RPC error response and log it. """
        super(WebHandler, self).return_api_error(error)
        self.logger(self.method, args, ok=False, error=error, **kwargs)

