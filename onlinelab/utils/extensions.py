"""Common extensions to Tornado's components. """

import tornado.web

class ExtRequestHandler(tornado.web.RequestHandler):
    """Allow for response post-processing before finishing it. """

    def _before_finish(self):
        pass

    def finish(self, *args, **kwargs):
        """Finishes this response, ending the HTTP request."""
        self._before_finish()
        super(ExtRequestHandler, self).finish(*args, **kwargs)

