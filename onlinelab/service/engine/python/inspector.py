"""Collect information about properties of Python objects. """

import os
import inspect

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

    def get_ext_info(self, obj):
        """Get extended information about ``obj``. """
        return {
            'docstring': self.get_docstring(obj),
            'comments': self.get_comments(obj),
            'sourcefile': self.get_source(obj),
            'source': self.get_source(obj),
        }

    def get_all_info(self, obj):
        """Get all information about ``obj``. """
        info = self.get_basic_info(obj)
        info.update(self.get_ext_info(obj))
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

