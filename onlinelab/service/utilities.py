"""Utilities for Online Lab services. """

import xmlrpclib
import tornado.escape

def xml_encode(obj, method):
    """Convenient wrapper over xmlrpclib's :func:`dumps`. """
    return xmlrpclib.dumps((obj,), method)

def xml_decode(xml):
    """Convenient wrapper over xmlrpclib's :func:`loads`. """
    return xmlrpclib.loads(xml)[0][0]

def json(**args):
    """Create JSON RPC message from keyword arguments. """
    return tornado.escape.json_encode(dict(**args))

