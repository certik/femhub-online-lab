"""Source code highlighting module based on Pygments. """

import pygments

from pygments.lexers import PythonLexer, PythonTracebackLexer
from pygments.formatters import HtmlFormatter

from docutils import core, nodes
from docutils.parsers.rst import roles

def func_role(role, rawtext, text, lineno, inliner, options={}, content=[]):
    """``:func:`` role for docutils (e.g. ``:func:`sin` -> sin()``. """
    node = nodes.strong(rawtext, text + '()', **options)
    return [node], []

roles.register_canonical_role('func', func_role)

class Highlight(object):
    """Simple class for highlighting Python. """

    def docstring(self, text):
        """Render a Python docstring. """
        return core.publish_parts(text, writer_name='html')['fragment']

    def python(self, code):
        """Highlight a piece of Python source code. """
        return pygments.highlight(code, PythonLexer(), HtmlFormatter())

    def traceback(self, tb):
        """Highlight text of a Python traceback. """
        return pygments.highlight(tb, PythonTracebackLexer(), HtmlFormatter())

