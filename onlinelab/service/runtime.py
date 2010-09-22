"""Runtime environment for Online Lab services. """

import os
import sys
import signal
import logging
import lockfile

import daemon
import daemon.pidfile

import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web

from tornado.options import define, options

class MainHandler(tornado.web.RequestHandler):
    """Handle simple GET request. """

    def get(self):
        self.write("Hello, world!")

class EngineHandler(tornado.web.RequestHandler):
    """Handle simple POST request. """

    def post(self, guid):
        self.write("Engine: %s" % guid)

define("port", default=8888, help="run on the given port", type=int)
define("path", default='.', help="run in the given directory", type=str)
define("debug", default=False, help="run in debug mode", type=bool)
define("daemon", default=True, help="run in daemon mode", type=bool)
define("pidfile", default=None, help="where to store PID", type=str)
define("logfile", default=None, help="where to store logs ", type=str)

def init_options():
    tornado.options.parse_command_line()

    if not options.logfile:
        if options.daemon:
            options.logfile = 'onlinelab-%s.log' % options.port
    else:
        options.logfile = os.path.abspath(options.logfile)

    if not options.pidfile:
        if options.daemon:
            options.pidfile = 'onlinelab-%s.pid' % options.port
    else:
        options.pidfile = os.path.abspath(options.pidfile)

    options.path = os.path.abspath(options.path)

def init_logging():
    channel = logging.handlers.RotatingFileHandler(
        filename=options.logfile,
        maxBytes=options.log_file_max_size,
        backupCount=options.log_file_num_backups)
    channel.setFormatter(tornado.options._LogFormatter(color=False))

    logger = logging.getLogger()
    logger.addHandler(channel)

def main():
    init_options()
    init_logging()

    if options.daemon:
        if os.path.exists(options.pidfile):
            logging.error("Server already running. Quitting.")
            sys.exit(1)

        logger = logging.getLogger()

        if options.debug:
            stdout = sys.stdout
            stderr = sys.stderr
        else:
            stdout = None
            stderr = None

        context = daemon.DaemonContext(
            working_directory=options.path,
            pidfile=daemon.pidfile.TimeoutPIDLockFile(options.pidfile, 1),
            files_preserve=[ file.stream for file in logger.handlers ],
            stdout=stdout,
            stderr=stderr,
            umask=022)

        context.signal_map = {
            signal.SIGTSTP: None,
            signal.SIGTTIN: None,
            signal.SIGTTOU: None,
            signal.SIGTERM: 'terminate',
        }

        try:
            context.open()
        except (lockfile.LockTimeout, lockfile.AlreadyLocked):
            logging.error("Can't obtain a lock on '%s'. Quitting." % options.pidfile)
            sys.exit(1)
    else:
        os.chdir(options.path)

    application = tornado.web.Application([
        (r"/", MainHandler),
        (r"/engine/(?P<guid>\w{32})", EngineHandler),
    ])

    server = tornado.httpserver.HTTPServer(application)
    server.listen(options.port)

    logging.info("Server started at localhost:%s (pid=%s)" % (options.port, os.getpid()))

    try:
        tornado.ioloop.IOLoop.instance().start()
    except KeyboardInterrupt:
        server.stop()

if __name__ == "__main__":
    main()

