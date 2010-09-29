"""Bootstrap code for a basic Python engine. """

from runtime import PythonEngine
from interpreter import PythonInterpreter

boot = """\
from onlinelab.service.engine.python import PythonEngine
PythonEngine().run()
"""

