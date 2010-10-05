"""Tools for collecting stdout and stderr contents. """

import sys

# We can't use cStringIO here because it doesn't support Unicode
# strings. Note that we can use cStringIO in other modules where
# Unicode support is not needed (e.g. plotting).

from StringIO import StringIO

class OutputTrap(object):
    """Traps stdout and stderr into :class:`StringIO` containers. """

    def __init__(self):
        self._out = StringIO()
        self._err = StringIO()

    def set(self):
        """Enable recording. """
        if sys.stdout is not self._out:
            sys.stdout = self._out

        if sys.stderr is not self._err:
            sys.stderr = self._err

    def unset(self):
        """Disable recording. """
        sys.stdout = sys.__stdout__
        sys.stderr = sys.__stderr__

    def reset(self):
        """Restart recording. """
        self._out.close()
        self._out = StringIO()

        self._err.close()
        self._err = StringIO()

        self.unset()

    @property
    def out(self):
        """Get value of stdout handle. """
        return self._out.getvalue()

    @property
    def err(self):
        """Get value of stderr handle. """
        return self._err.getvalue()

    @property
    def values(self):
        """Get values of both handles. """
        return self.out, self.err

