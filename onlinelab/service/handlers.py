
import tornado.web

class MainHandler(tornado.web.RequestHandler):
    """Handle simple GET request. """

    def get(self):
        self.write("Hello, world!")

class EngineHandler(tornado.web.RequestHandler):
    """Handle simple POST request. """

    def post(self, guid):
        self.write("Engine: %s" % guid)

