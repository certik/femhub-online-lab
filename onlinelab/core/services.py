"""Service manager for Online Lab core server. """

import tornado.ioloop

class AlreadyExists(Exception):
    """Raised when trying to add an existing service. """

class ServiceManager(object):
    """Manage access and message routing to services. """

    def __init__(self):
        self.ioloop = tornado.ioloop.IOLoop.instance()
        self.services = {}
        self.routing = {}

    @classmethod
    def instance(cls):
        """Returns the global :class:`ServiceManager` instance. """
        if not hasattr(cls, '_instance'):
            cls._instance = cls()
        return cls._instance

    def add_service(self, url):
        """Register new service in our database. """
        if url not in self.services:
            self.services[url] = {}
        else:
            raise AlreadyExists

