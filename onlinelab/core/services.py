"""Service manager for Online Lab core server. """

import uuid

import tornado.ioloop

class AlreadyExists(Exception):
    """Raised when trying to add an existing service. """

class NotAssignedYet(Exception):
    """Raised when a notebook wasn't assigned to a service yet. """

class Disconnected(Exception):
    """Service has disconnected since last non-kill request from client. """

class NoServicesAvailable(Exception):
    """There are currently no services to which we could bind a resource. """

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
        """Register a new service in our database. """
        if url not in self.services:
            self.services[uuid.uuid4().hex] = Service(url)
        else:
            raise AlreadyExists

    def get_service(self, uuid):
        """Get service that was bound to ``uuid``. """
        try:
            sid = self.routing[uuid]
        except KeyError:
            raise NotAssignedYet
        else:
            if sid is not None:
                return self.services[sid]
            else:
                raise Disconnected

    def bind(self, uuid):
        """Bind ``uuid`` resource to a service. """
        sid, load = None, None

        for _sid, service in self.services.iteritems():
            _load = service.load

            if load is None or _load < load:
                sid, load = _sid, _load

            if not load:
                break

        if sid is None:
            raise NoServicesAvailable

        self.routing[uuid] = sid

        service = self.services[sid]
        service.increase_load()

        return service

    def unbind(self, uuid):
        """Remove ``uuid`` from routing table. """
        try:
            sid = self.routing[uuid]
        except KeyError:
            pass
        else:
            self.services[sid].decrease_load()
            del self.routing[uuid]

class Service(object):
    """Represents a single Online Lab service. """

    def __init__(self, url):
        self.url = url
        self.load = 0

    def increase_load(self, count=1):
        """Increase service load. """
        self.load += count

    def decrease_load(self, count=1):
        """Decrease service load. """
        self.load -= count

