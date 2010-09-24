"""HTTP request handlers for Online Lab services. """

import logging
import functools

import tornado.web
import tornado.escape

import processes
import utilities

class MainHandler(tornado.web.RequestHandler):
    """Handle simple GET request. """

    def get(self):
        self.write("Online Lab")

class Args(dict):
    """Dictionary with object-like access. """

    def __getattr__(self, name):
        try:
            return self[name]
        except KeyError:
            raise AttributeError("'%s' is not a valid attribute" % name)

class EngineHandler(tornado.web.RequestHandler):
    """Handle simple POST request. """

    def initialize(self):
        self._func_handlers = {
            'init': self.handle_init,
            'kill': self.handle_kill,
            'stat': self.handle_stat,
            'evaluate': self.handle_evaluate,
            'interrupt': self.handle_interrupt,
        }

    def dispatch(self, func, guid, args):
        """Call appropriate method with the give arguments. """
        try:
            handler = self._func_handlers[func]
        except KeyError:
            error = { 'code': -32601, 'message': "Unknown method" }
            self.write(utilities.json(result=None, error=error))
            self.finish()
        else:
            manager = processes.ProcessManager.instance()
            handler(manager, guid, Args(args))

    def callback_okay(self, func, result):
        """Called when method invocation succeeded. """
        self.write(utilities.json(result=result, error=None))
        self.finish()

    def callback_fail(self, func, error):
        """Called when method invocation failed. """
        self.write(utilities.json(result=None, error=error))
        self.finish()

    def handle_init(self, manager, guid, args):
        """Handle ``init`` engine method. """
        manager.init(guid, args,
            okay=functools.partial(self.async_callback(self.callback_okay), 'init'),
            fail=functools.partial(self.async_callback(self.callback_fail), 'init'))

    def handle_kill(self, manager, guid, args):
        """Handle ``kill`` engine method. """
        manager.kill(guid, args,
            okay=functools.partial(self.async_callback(self.callback_okay), 'kill'),
            fail=functools.partial(self.async_callback(self.callback_fail), 'kill'))

    def handle_stat(self, manager, guid, args):
        """Handle ``stat`` engine method. """
        manager.stat(guid, args,
            okay=functools.partial(self.async_callback(self.callback_okay), 'stat'),
            fail=functools.partial(self.async_callback(self.callback_fail), 'stat'))

    def handle_evaluate(self, manager, guid, args):
        """Handle ``evaluate`` engine method. """
        manager.evaluate(guid, args,
            okay=functools.partial(self.async_callback(self.callback_okay), 'evaluate'),
            fail=functools.partial(self.async_callback(self.callback_fail), 'evaluate'))

    def handle_interrupt(self, manager, guid, args):
        """Handle ``interrupt`` engine method. """
        manager.interrupt(guid, args,
            okay=functools.partial(self.async_callback(self.callback_okay), 'interrupt'),
            fail=functools.partial(self.async_callback(self.callback_fail), 'interrupt'))

    @tornado.web.asynchronous
    def post(self, guid, func):
        try:
            args = tornado.escape.json_decode(self.request.body)
        except ValueError:
            error = { 'code': -32700, 'message': "Parse Error" }
            self.write(utilities.json(result=None, error=error))
            self.finish()
        else:
            self.dispatch(func, guid, args)

