"""Implementation of RESTful handlers. """

import logging

import tornado.web

import docutils.core
import pygments.formatters

from ..errors import ErrorMixin
from ..models import User, Engine, Folder, Worksheet, Cell

from ...utils.settings import Settings

class RESTfulRequestHandler(ErrorMixin, tornado.web.RequestHandler):
    """Base class for all RESTful request handlers. """

class PublishedWorksheetHandler(RESTfulRequestHandler):
    """Render a public worksheet identified by an UUID. """

    def get(self, uuid):
        settings = Settings.instance()

        html = pygments.formatters.HtmlFormatter(nobackground=True)
        css = html.get_style_defs(arg='.highlight')

        try:
            worksheet = Worksheet.objects.get(uuid=uuid)
        except Worksheet.DoesNotExist:
            raise tornado.web.HTTPError(404)
        except Worksheet.MultipleObjectsReturned:
            raise tornado.web.HTTPError(500)

        if worksheet.published is None:
            raise tornado.web.HTTPError(401)

        try:
            self.render('femhub/worksheet.html', debug=settings.debug, extra_css=css,
                uuid=uuid, name=worksheet.name, user=worksheet.user.username)
        except:
            raise tornado.web.HTTPError(500)

