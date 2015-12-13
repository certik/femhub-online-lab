#! /usr/bin/env python

"""
Run this from within Femhub, like this:

femhub --python show_published_worksheets.py

"""
from onlinelab.utils.import_data import femhub_set_paths
femhub_set_paths()
from onlinelab.core.models import User, Worksheet

users = User.objects.all()

# get all the information we need:
l = []
for u in users:
    pub = u.worksheet_set.exclude(published=None)
    worksheets = []
    for w in pub:
        worksheets.append({
            "name": w.name,
            "modified": str(w.modified),
            })
    l.append({
        "username": u.username,
        "worksheets pub": len(pub),
        "worksheets total": len(u.worksheet_set.all()),
        "worksheets": worksheets,
        })
# sort the users according to the number of their published worksheets:
l.sort(key=lambda x: x["worksheets pub"])
# only show published worksheets:
l = [x for x in l if x["worksheets pub"] > 0]
for u in l:
    print "-"*80
    print "User:", u["username"]
    print "Published worksheets:", u["worksheets pub"]
    print "Total worksheets:", u["worksheets total"]
    for w in u["worksheets"]:
        print "%50s (%s)" % (w["name"], w["modified"])
