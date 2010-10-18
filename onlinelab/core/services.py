"""Service manager for Online Lab core server. """

import uuid
import logging

from django.db.models import Count

from models import Service, Route

class AlreadyExists(Exception):
    """Raised when trying to add an existing service. """

class NotAssignedYet(Exception):
    """Raised when a worksheet wasn't assigned to a service yet. """

class NoServicesAvailable(Exception):
    """There are currently no services to which we could bind a resource. """

class ServiceManager(object):
    """Manage access and message routing to services. """

    @classmethod
    def instance(cls):
        """Returns the global :class:`ServiceManager` instance. """
        if not hasattr(cls, '_instance'):
            cls._instance = cls()
        return cls._instance

    def add_service(self, url, uuid, provider, description):
        """Register a new service in our database. """
        try:
            service = Service.objects.get(url=url)
        except Service.DoesNotExist:
            logging.info("New service: %s (%s)" % (url, provider))

            service = Service.objects.create(url=url, uuid=uuid,
                provider=provider, description=description)
        else:
            service.uuid = uuid
            service.provider = provider
            service.description = description

            service.save()

            logging.info("Updated '%s' service" % service.url)

        return service

    def get_service(self, uuid):
        """Get service that was bound to ``uuid``. """
        try:
            route = Route.objects.get(uuid=uuid)
        except Route.DoesNotExist:
            raise NotAssignedYet
        else:
            return route.service

    def bind(self, uuid):
        """Bind ``uuid`` resource to a service. """
        services = Service.objects.annotate(
            num_routes=Count('routes')).order_by('num_routes')

        if not services:
            raise NoServicesAvailable

        service = services[0]

        route = Route(uuid=uuid, service=service)
        route.save()

        return service

    def unbind(self, uuid):
        """Remove ``uuid`` from routing table. """
        try:
            route = Route.objects.get(uuid=uuid)
        except Route.DoesNotExist:
            pass
        else:
            route.delete()

