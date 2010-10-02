"""Database models for Online Lab core. """

import uuid

from django.db import models
from django.contrib.auth.models import User

MAX_UUID = 32
MAX_NAME = 200

_ctype_to_int = {
    'input': 0,
    'output': 1,
    'text': 2,
    'error': 3,
    'image': 4,
    'content': 5,
}

_int_to_ctype = {
    0: 'input',
    1: 'output',
    2: 'text',
    3: 'error',
    4: 'image',
    5: 'content',
}

def ctype_to_int(type):
    """Return integer equivalent of ``type``. """
    return _ctype_to_int[type]

def int_to_ctype(type):
    """Return symbolic equivalent of ``type``. """
    return _int_to_ctype[type]

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
    order = models.TextField(default='')
    engine = models.ForeignKey(Engine)

class Cell(models.Model):
    uuid = UUIDField()
    user = models.ForeignKey(User)
    type = models.IntegerField(default=0)
    content = models.TextField(default='')
    notebook = models.ForeignKey(Notebook, null=True, default=None)
    parent = models.ForeignKey('self', null=True, default=None)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

