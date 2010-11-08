#! /usr/bin/env python

"""
Run this from within Femhub, like this:

femhub --python show_users.py

"""
from onlinelab.utils.import_data import femhub_set_paths
femhub_set_paths()
from onlinelab.core.models import User

users = User.objects.all()
print "Number of users:", len(users)

print
print "List of users:"
usernames = [user.username for user in users]
usernames.sort()
print " ".join(usernames)
