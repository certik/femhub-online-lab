"""Collect information about properties of Python objects. """

import os
import inspect

from highlight import Highlight

class Inspector(object):
    """Wrapper over Python's inspect module. """

    _what_is = [
        'abstract',
        'builtin',
        'class',
        'code',
        'datadescriptor',
        'frame',
        'function',
        'generator',
        'generatorfunction',
        'getsetdescriptor',
        'memberdescriptor',
        'method',
        'methoddescriptor',
        'module',
        'routine',
        'traceback',
    ]

    def get_pretty(self, obj, highlight=None):
        """Get all information about ``obj`` in pretty form. """
        if highlight is None:
            highlight = Highlight()

        info = self.get_info(obj)

        docstring = info['docstring']

        if docstring is not None:
            info['docstring_html'] = highlight.docstring(docstring)

        source = info['source']

        if source is not None:
            info['source_html'] = highlight.python(source)

        args = info['args']

        if args is not None:
            info['args_html'] = highlight.python(args)

        return info

    def get_basic_info(self, obj):
        """Get basic information about ``obj``. """
        return {
            'name': self.get_name(obj),
            'type': self.get_type(obj),
            'base': self.get_base(obj),
            'repr': self.get_repr(obj),
            'str': self.get_str(obj),
            'file': self.get_file(obj),
            'args': self.get_args(obj),
        }

    def get_more_info(self, obj):
        """Get more information about ``obj``. """
        return {
            'docstring': self.get_docstring(obj),
            'comments': self.get_comments(obj),
            'sourcefile': self.get_source(obj),
            'source': self.get_source(obj),
        }

    def get_info(self, obj, more=True):
        """Get all information about ``obj``. """
        info = self.get_basic_info(obj)

        if more:
            info.update(self.get_more_info(obj))

        return info

    def get_name(self, obj):
        """Get ``obj``'s name. """
        try:
            return obj.__name__
        except AttributeError:
            return None

    def get_type(self, obj):
        """Get ``obj``'s type. """
        for what in self._what_is:
            if getattr(inspect, 'is' + what)(obj):
                return what

        try:
            return obj.__class__.__name__
        except AttributeError:
            return None

    def get_base(self, obj):
        """Get ``obj``'s base class. """
        return str(type(obj))

    def get_repr(self, obj):
        """Get ``obj``'s repr form. """
        return repr(obj)

    def get_str(self, obj):
        """Get ``obj``'s string form. """
        return str(obj)

    def get_file(self, obj):
        """Get ``obj``'s definition file. """
        try:
            file = inspect.getfile(obj)
        except TypeError:
            return None
        else:
            return os.path.abspath(file)

    def get_args(self, obj):
        """Get ``obj``'s argument list. """
        try:
            spec = inspect.getargspec(obj)
        except TypeError:
            return None
        else:
            return inspect.formatargspec(*spec)

    def get_docstring(self, obj):
        """Get ``obj``'s docstring. """
        return inspect.getdoc(obj)

    def get_comments(self, obj):
        """Get ``obj``'s comments. """
        return inspect.getcomments(obj)

    def get_source_file(self, obj):
        """Get ``obj``'s source code. """
        try:
            file = inspect.getsourcefile(obj)
        except (IOError, TypeError):
            return None
        else:
            return os.path.abspath(file)

    def get_source(self, obj):
        """Get ``obj``'s source code. """
        try:
            return inspect.getsource(obj)
        except (IOError, TypeError):
            return None

