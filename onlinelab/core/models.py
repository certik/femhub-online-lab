"""Database models for Online Lab core. """

import uuid

from django.db import models
from django.contrib.auth.models import User

MAX_UUID = 32
MAX_NAME = 200

class UUIDField(models.CharField):
    """A field that stores a universally unique identifier. """

    def __init__(self, *args, **kwargs):
        kwargs['unique'] = True
        kwargs['editable'] = False
        kwargs['default'] = self.new_uuid
        kwargs['max_length'] = MAX_UUID
        super(UUIDField, self).__init__(*args, **kwargs)

    def new_uuid(self):
        """Construct new universally unique identifier. """
        return unicode(uuid.uuid4().hex)

class Service(models.Model):
    url = models.CharField(max_length=MAX_NAME, unique=True)
    uuid = UUIDField()
    provider = models.TextField()
    description = models.TextField()

class Route(models.Model):
    uuid = UUIDField()
    service = models.ForeignKey(Service, related_name='routes')

class Engine(models.Model):
    uuid = UUIDField()
    name = models.CharField(max_length=MAX_NAME)
    description = models.TextField(default='')

class Folder(models.Model):
    uuid = UUIDField()
    user = models.ForeignKey(User)
    name = models.CharField(max_length=MAX_NAME)
    description = models.TextField(default='')
    parent = models.ForeignKey('self', null=True, default=None)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class Notebook(models.Model):
    uuid = UUIDField()
    user = models.ForeignKey(User)
    name = models.CharField(max_length=MAX_NAME)
    description = models.TextField(default='')
    folder = models.ForeignKey(Folder, null=True, default=None)
    origin = models.ForeignKey('self', null=True, default=None)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    published = models.DateTimeField(null=True, default=None)
    engine = models.ForeignKey(Engine)
    order = models.TextField(default='')

    def get_order(self):
        """Return ``order`` as a list. """
        return self.order.split(',')

    def set_order(self, order):
        """Set ``order`` from a list. """
        self.order = ','.join(order)

class Cell(models.Model):
    uuid = UUIDField()
    user = models.ForeignKey(User)
    type = models.CharField(max_length=16)
    content = models.TextField(default='')
    notebook = models.ForeignKey(Notebook, null=True, default=None)
    parent = models.ForeignKey('self', null=True, default=None)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

