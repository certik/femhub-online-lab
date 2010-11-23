"""Implementation of ``MainHandler``. """

import logging
import traceback

import docutils.core
import pygments.formatters

import tornado.web

from ..errors import ErrorMixin
from ...utils.settings import Settings

class MainHandler(ErrorMixin, tornado.web.RequestHandler):
    """Render default Online Lab user interface. """

    def initialize(self, debug=False):
        self._settings = Settings.instance()
        self.debug = debug or self._settings.debug

    def get(self):
        html = pygments.formatters.HtmlFormatter(nobackground=True)
        css = html.get_style_defs(arg='.highlight')

        try:
            self.render('femhub/desktop.html', debug=self.debug,
                extra_css=css, settings=self._settings)
        except:
            logging.error("error rendering 'femhub/desktop.html'")
            logging.error('\n' + traceback.format_exc())
            raise tornado.web.HTTPError(500)

