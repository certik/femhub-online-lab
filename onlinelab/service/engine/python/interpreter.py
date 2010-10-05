"""Customized interpreter for Python engines. """

import sys
import time
import tokenize
import traceback

from StringIO import StringIO

from outputtrap import OutputTrap
from namespace import PythonNamespace

class PythonInterpreter(object):
    """Customized Python interpreter with two-stage evaluation. """

    filename = '<online-lab>'

    def __init__(self, locals={}, debug=False):
        if not isinstance(locals, PythonNamespace):
            self.locals = dict(PythonNamespace(locals))
        else:
            self.locals = dict(locals)

        self.debug = debug
        self.trap = OutputTrap()
        self.index = 0

    def evaluate(self, source):
        """Evaluate a piece of Python source code. """
        source = source.replace('\r', '')

        if '\n' in source:
            exec_source, eval_source = self.split(source)
        else:
            exec_source, eval_source = None, source

        eval_source += '\n'

        try:
            self.compile(eval_source, 'eval')
        except (OverflowError, SyntaxError, ValueError):
            exec_source = source
            eval_source = None

        # If in debug mode, then don't setup output trap so that we can
        # run a debugger (e.g. pdb). Note that stdout and stderr won't
        # be captured and stored in the resulting dict object.
        if not self.debug:
            self.trap.set()

        try:
            try:
                del self.locals['__plots__']
            except KeyError:
                pass

            interrupted = False
            traceback = False
            result = None

            start = time.clock()

            try:
                if exec_source is not None:
                    try:
                        exec_code = self.compile(exec_source, 'exec')
                    except (OverflowError, SyntaxError, ValueError):
                        traceback = self.syntaxerror()
                        eval_source = None
                    else:
                        exec exec_code in self.locals

                if eval_source is not None:
                    result = eval(eval_source, self.locals)
            except SystemExit:
                raise
            except KeyboardInterrupt:
                interrupted = True
            except:
                traceback = self.traceback()

            end = time.clock()

            try:
                plots = self.locals['__plots__']
            except KeyError:
                plots = []

            self.index += 1

            if result is not None:
                self.locals['_%d' % self.index] = result

                self.locals['___'] = self.locals.get('__')
                self.locals['__'] = self.locals.get('_')
                self.locals['_'] = result

                result = repr(result)

            return {
                'source': source,
                'index': self.index,
                'time': end - start,
                'result': result,
                'out': self.trap.out,
                'err': self.trap.err,
                'plots': plots,
                'traceback': traceback,
                'interrupted': interrupted,
            }
        finally:
            self.trap.reset()

    def split(self, source):
        """Extract last logical line from multi-line source code. """
        string = StringIO(source).readline
        tokens = tokenize.generate_tokens(string)

        for tok, _, (n, _), _, _ in reversed(list(tokens)):
            if tok == tokenize.NEWLINE:
                lines = source.split('\n')

                exec_source = '\n'.join(lines[:n])
                eval_source = '\n'.join(lines[n:])

                return exec_source, eval_source
        else:
            return None, source

    def compile(self, source, mode):
        """Wrapper over Python's built-in :func:`compile` function. """
        return compile(source, self.filename, mode)

    def traceback(self):
        """Return nicely formatted most recent traceback. """
        type, value, tb = sys.exc_info()
        return ''.join(traceback.format_exception(type, value, tb.tb_next))

    def syntaxerror(self):
        """Return nicely formatted syntax error. """
        type, value, sys.last_traceback = sys.exc_info()

        sys.last_type = type
        sys.last_value = value

        if type is SyntaxError:
            try:
                msg, (dummy_filename, lineno, offset, line) = value
            except:
                pass
            else:
                value = SyntaxError(msg, (self.filename, lineno, offset, line))
                sys.last_value = value

        return ''.join(traceback.format_exception_only(type, value))

