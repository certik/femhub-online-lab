"""Implementation of cross-site resource sharing protocol. """

import logging

class CORSMixin(object):
    """A CORS mixin class used in :class:`WebHandler`. """

    def is_allowed_origin(self, origin):
        """Check whether we should allow an origin or not. """
        if self.allowed_origins is True:
            return True
        else:
            return origin in self.allowed_origins

    def set_cors_headers(self, origin):
        """Write response CORS headers for an origin. """
        self.set_header('Access-Control-Allow-Origin', origin)
        self.set_header('Access-Control-Allow-Methods', 'OPTIONS, GET, POST')
        self.set_header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With')
        self.set_header('Access-Control-Allow-Credentials', 'true')

    def prepare_for_cors(self):
        """Double check origin and either allow or disallow connection. """
        if self.cross_site and self.request.method != 'OPTIONS':
            origin = self.request.headers.get('Origin')

            if origin is not None:
                if self.is_allowed_origin(origin):
                    self.set_cors_headers(origin)
                else:
                    logging.warning("CORS: cross-site request disallowed: %s" % origin)
                    self.set_status(403)
                    self.finish()

    def options(self):
        """Check origin and inform a client about our capabilities. """
        if self.cross_site:
            origin = self.request.headers.get('Origin')

            if origin is not None and self.is_allowed_origin(origin):
                self.set_cors_headers(origin)

