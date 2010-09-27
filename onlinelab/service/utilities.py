"""Utilities for Online Lab services. """

import xmlrpclib

def xml_encode(obj, method):
    """Convenient wrapper over xmlrpclib's :func:`dumps`. """
    return xmlrpclib.dumps((obj,), method)

def xml_decode(xml):
    """Convenient wrapper over xmlrpclib's :func:`loads`. """
    return xmlrpclib.loads(xml)[0][0]

