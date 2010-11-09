"""Custom HTTP request error handling. """

import httplib
import tornado.web

class ErrorMixin(object):
    """Request handler mixin allowing rendering of custom error pages. """

    def get_error_html(self, status_code, **kwargs):
        """Transform a HTTP status code into a HTML page. """
        name = 'femhub/%d.html' % status_code

        try:
            template = self.settings['template_loader'].load(name)
        except IOError:
            template = self.settings['template_loader'].load('femhub/error.html')

        try:
            error_text = httplib.responses[status_code]
        except KeyError:
            error_text = 'unknown error'

        return template.generate(error_code=status_code, error_text=error_text)

class ErrorHandler(ErrorMixin, tornado.web.RequestHandler):
    """Custom HTTP error handler (based on http://gist.github.com/398252). """

    def __init__(self, application, request, status_code):
        tornado.web.RequestHandler.__init__(self, application, request)
        self.set_status(status_code)

    def prepare(self):
        raise tornado.web.HTTPError(self._status_code)

tornado.web.ErrorHandler = ErrorHandler

