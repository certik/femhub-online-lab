"""Source code highlighting module based on Pygments. """

import pygments
import docutils.core

from pygments.lexers import PythonLexer, PythonTracebackLexer
from pygments.formatters import HtmlFormatter

class Highlight(object):
    """Simple class for highlighting Python. """

    def docstring(self, text):
        """Render a Python docstring. """
        return docutils.core.publish_parts(text, writer_name='html')['fragment']

    def python(self, code):
        """Highlight a piece of Python source code. """
        return pygments.highlight(code, PythonLexer(), HtmlFormatter())

    def traceback(self, tb):
        """Highlight text of a Python traceback. """
        return pygments.highlight(tb, PythonTracebackLexer(), HtmlFormatter())

