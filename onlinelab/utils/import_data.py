"""
This module is able to import data to database.

So far only from the old codenode lab.
"""

from os.path import expandvars
import os
import sys
import pickle
import simplejson

def femhub_set_paths():
    """
    Sets the paths automatically for femhub.

    This only works for femhub.
    """
    CORE_HOME_PATH = expandvars("$SPKG_LOCAL/share/onlinelab/core-home/")
    sys.path.append(CORE_HOME_PATH)
    os.environ['DJANGO_SETTINGS_MODULE'] = 'settings'

def load(data_path="", set_paths=True):
    """
    Imports data into the database.

    Currently it expects the old codenode based data.

    data_path ... path to the old database dump directory. This directory must
                  contain the following files:
                  "cells.pickle.txt, notebooks.pickle.txt, users.pickle.txt,
                  folders.pickle.txt"
    set_paths ... If True, it runs within femhub, and it will set up the paths
                  automatically, otherwise you need to set them up manually

    Example:

    >>> from onlinelab.utils.import_data import load
    >>> load("/home/ondrej/repos/femhub-online-lab/archive")
    Loading 'User' objects ...
    Loading 'Folder' objects ...
    Loading 'Worksheet' objects ...
    Loading 'Cell' objects ...
    Garbage collected 509 cells

    """
    if set_paths:
        femhub_set_paths()

    from onlinelab.core.models import Folder
    from onlinelab.core.models import Worksheet
    from onlinelab.core.models import Cell
    from onlinelab.core.models import User

    # User

    print "Loading 'User' objects ..."

    with open(os.path.join(data_path, 'users.pickle.txt'), 'r') as f:
        users = pickle.load(f)

    for user in users:
        db_user = User(**user)
        db_user.save()

    # Folder

    '''
    uuid = UUIDField()
    user = models.ForeignKey(User)
    name = models.CharField(max_length=MAX_NAME)
    description = models.TextField(default='')
    parent = models.ForeignKey('self', null=True, default=None)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    '''

    print "Loading 'Folder' objects ..."

    with open(os.path.join(data_path, 'folders.pickle.txt'), 'r') as f:
        folders = pickle.load(f)

    for folder in folders:
        folder['uuid'] = folder['guid']
        del folder['guid']

        folder['user_id'] = folder['owner_id']
        del folder['owner_id']

        folder['name'] = folder['title']
        del folder['title']

        # 'description' is automatic

        # 'parent' unchanged

        # 'created' is automatic

        # 'modified' is automatic

        db_folder = Folder(
            id=folder['id'],
            uuid=folder['uuid'],
            user_id=folder['user_id'],
            name=folder['name'],
            parent_id=folder['parent_id'])
        db_folder.save()

    del folders

    # Worksheet

    '''
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
    '''

    print "Loading 'Worksheet' objects ..."

    uuids = set([])

    with open(os.path.join(data_path, 'notebooks.pickle.txt'), 'r') as f:
        worksheets = pickle.load(f)

    for worksheet in worksheets:
        worksheet['uuid'] = worksheet['guid']
        del worksheet['guid']

        worksheet['user_id'] = worksheet['owner_id']
        del worksheet['owner_id']

        worksheet['name'] = worksheet['title']
        del worksheet['title']

        # 'description' is automatic

        # 'folder_id' unchanged

        # 'origin' is automatic

        worksheet['created'] = worksheet['created_time']
        del worksheet['created_time']

        # 'modified' is automatic

        # 'published' is automatic

        worksheet['engine_id'] = 1 # Python

        order = worksheet['orderlist']
        del worksheet['orderlist']

        if order == 'orderlist':
            order = ''
        else:
            order = simplejson.loads(order)
            uuids = uuids.union(order)

        worksheet['order'] = ','.join(order)

        db_worksheet = Worksheet(
            id=worksheet['id'],
            uuid=worksheet['uuid'],
            user_id=worksheet['user_id'],
            name=worksheet['name'],
            folder_id=worksheet['folder_id'],
            created=worksheet['created'],
            engine_id=worksheet['engine_id'],
            order=worksheet['order'])
        db_worksheet.save()

    del worksheets

    # Cell

    '''
    uuid = UUIDField()
    user = models.ForeignKey(User)
    type = models.CharField(max_length=16)
    content = models.TextField(default='')
    worksheet = models.ForeignKey(Worksheet, null=True, default=None)
    parent = models.ForeignKey('self', null=True, default=None)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    '''

    print "Loading 'Cell' objects ..."

    style_map = {
        'text': 'text',
        'input': 'input',
        'outputtext': 'output',
        'outputimage': 'image',
    }

    with open(os.path.join(data_path, 'cells.pickle.txt'), 'r') as f:
        cells = pickle.load(f)

    count = 0

    for cell in cells:
        uuid = cell['uuid'] = cell['guid']
        del cell['guid']

        if uuid not in uuids:
            count += 1
            continue

        cell['user_id'] = cell['owner_id']
        del cell['owner_id']

        cell['type'] = style_map[cell['style']]
        del cell['style']

        # 'content' unchanged

        # 'worksheet' unchanged

        # 'parent' is automatic

        cell['created'] = cell['last_modified']
        cell['modified'] = cell['last_modified']
        del cell['last_modified']

        db_cell = Cell(
            uuid=cell['uuid'],
            user_id=cell['user_id'],
            type=cell['type'],
            content=cell['content'],
            worksheet_id=cell['notebook_id'],
            created = cell['created'],
            modified = cell['modified'])
        db_cell.save()

    del cells

    if count:
        print "Garbage collected %d cells" % count
