
import logging

import tornado.web

import docutils.core
import pygments.formatters

import errors

from ..utils import Settings

from models import User, Engine, Folder, Worksheet, Cell

class RESTfulRequestHandler(errors.ErrorMixin, tornado.web.RequestHandler):
    """Base class for all RESTful request handlers. """

class PublishedWorksheetHandler(RESTfulRequestHandler):
    """Render a public worksheet identified by an UUID. """

    def get(self, uuid):
        settings = Settings.instance()

        html = pygments.formatters.HtmlFormatter(nobackground=True)
        css = html.get_style_defs(arg='.highlight')

        w = Worksheet.objects.get(uuid=uuid)

        if w.published is None:
            raise tornado.web.HTTPError(500)

        try:
            self.render('femhub/worksheet.html', debug=settings.debug,
                extra_css=css, uuid=uuid, name=w.name, user=w.user.username)
        except:
            raise tornado.web.HTTPError(500)

