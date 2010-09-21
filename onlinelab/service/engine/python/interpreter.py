"""Customized interpreter for Python engines. """

import sys
import traceback

from outputtrap import OutputTrap

class PythonInterpreter(object):
    """Customized Python interpreter with two-stage evaluation. """

    filename = '<online-lab>'

    def __init__(self, locals={}):
        self.locals = locals
        self.trap = OutputTrap()
        self.index = 0

    def evaluate(self, source):
        """Evaluate a piece of Python source code. """
        source, code = source.replace('\r', ''), None

        try:
            code = self.compile(source + '\n', 'single')
        except SyntaxError:
            if '\n' in source:
                exec_source, eval_source = source.rsplit('\n', 1)
            else:
                exec_source, eval_source = None, source

            eval_source += '\n'

            try:
                self.compile(eval_source, 'eval')
            except SyntaxError:
                exec_source = source
                eval_source = None

        self.trap.set()

        try:
            interrupted = False
            traceback = None

            try:
                if code is not None:
                    exec code in self.locals
                else:
                    if exec_source is not None:
                        try:
                            exec_code = self.compile(exec_source, 'exec')
                        except SyntaxError:
                            traceback = self.syntaxerror()
                            eval_source = None
                        else:
                            exec exec_code in self.locals

                    if eval_source is not None:
                        eval_code = self.compile(eval_source, 'single')
                        exec eval_code in self.locals
            except SystemExit:
                raise
            except KeyboardInterrupt:
                interrupted = True
            except:
                traceback = self.traceback()

            self.index += 1

            return {
                'source': source,
                'out': self.trap.out,
                'err': self.trap.err,
                'traceback': traceback,
                'interrupted': interrupted,
            }
        finally:
            self.trap.reset()

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

