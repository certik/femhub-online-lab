"""Customized global namespace for Python interpreter. """

class PythonNamespace(dict):
    """Base namespace for Python interpreters. """

    components = ['matplotlib', 'pylab', 'show']

    def __init__(self, locals={}, disable=[]):
        if locals is not None:
            self.setup(disable)
            self.update(locals)

    def setup(self, disable):
        """Setup all enabled components in proper order. """
        for component in self.components:
            if component not in disable:
                namespace = getattr(self, 'setup_' + component)()

                if namespace is not None:
                    self.update(namespace)

    def setup_matplotlib(self):
        """Initialize matplotlib and use Agg backend. """
        try:
            import matplotlib
        except ImportError:
            pass
        else:
            matplotlib.use('Agg', warn=False)

    def setup_pylab(self):
        """Pollute global namespace with pylab's exports. """
        try:
            import pylab
        except ImportError:
            return None
        else:
            return dict(pylab.__dict__)

    def setup_show(self):
        """Override pylab's show() function with our own. """
        try:
            import pylab
        except ImportError:
            return None

        import base64
        import hashlib
        import inspect

        try:
            from cStringIO import StringIO
        except ImportError:
            from StringIO import StringIO

        def show():
            """Online Lab version of pylab's show(). """
            buffer = StringIO()
            pylab.savefig(buffer, format='png', dpi=80)

            frame = inspect.currentframe().f_back

            try:
                try:
                    plots = frame.f_globals['__plots__']
                except KeyError:
                    plots = []

                value = buffer.getvalue()

                data = base64.b64encode(value)
                hash = hashlib.sha1(data).hexdigest()

                plots.append({
                    'data': data,
                    'size': len(value),
                    'type': 'image/png',
                    'encoding': 'base64',
                    'checksum': hash,
                })

                frame.f_globals['__plots__'] = plots
            finally:
                del frame

        return {'show': show}

