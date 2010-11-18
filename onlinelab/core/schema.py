"""Online Lab database schema transformations. """

from models import SCHEMA

def transform(name, data, schema):
    """
    Transform ``data`` on ``schema..SCHEMA`` interval.

    Possible transformations
    ------------------------

    * add field     --- ``data['xxx'] = yyy``
    * remove field  --- ``del data['xxx']``
    * rename field  --- ``data['zzz'] = data['xxx']; del data['xxx']``
    * alter field   --- ``data['xxx'] = f(data['xxx'])``

    Transformation functions
    ------------------------

    A transformation function which transforms a single data row of
    a model of some application from schema version ``n`` to version
    ``n + 1`` has the following general form::

        def transform_n_app_model(data):
            pass

    For example, if the application is ``online.lab.core.models``, the
    model is ``Worksheet`` and we are transforming from schema version
    zero to version one, then a transformation function will look like
    this::

        def transform_0_onlinelab_core_models_Worksheet(data):
            pass

    """
    for i in xrange(schema, SCHEMA):
        method = getattr(globals(), 'transform_%d_%s' % (i, name), None)

        if method is not None:
            method(data)

