"""Runtime environment for Online Lab core. """

import os
import sys
import logging
import lockfile

import daemon

try:
    import daemon.pidfile as pidlockfile
except ImportError:
    import daemon.pidlockfile as pidlockfile

import django.core.handlers.wsgi

import tornado.httpserver
import tornado.options
import tornado.ioloop
import tornado.wsgi
import tornado.web

import handlers

def main(args):
    """Start an existing core server. """
    if not args.log_file:
        if args.daemon:
            args.log_file = 'onlinelab-core-%s.log' % args.port
    else:
        args.log_file = os.path.abspath(args.log_file)

    if not args.pid_file:
        if args.daemon:
            args.pid_file = 'onlinelab-core-%s.pid' % args.port
    else:
        args.pid_file = os.path.abspath(args.pid_file)

    if args.log_level != 'none':
        logger = logging.getLogger()

        level = getattr(logging, args.log_level.upper())
        logger.setLevel(level)

        if not args.daemon:
            tornado.options.enable_pretty_logging()

        if args.log_file:
            channel = logging.handlers.RotatingFileHandler(
                filename=args.log_file,
                maxBytes=args.log_max_size,
                backupCount=args.log_num_backups)

            formatter = tornado.options._LogFormatter(color=False)
            channel.setFormatter(formatter)

            logger.addHandler(channel)

    if args.daemon:
        if os.path.exists(args.pid_file):
            logging.error("Server already running. Quitting.")
            sys.exit(1)

        logger = logging.getLogger()

        if args.debug:
            stdout = sys.stdout
            stderr = sys.stderr
        else:
            stdout = None
            stderr = None

        context = daemon.DaemonContext(
            working_directory=args.home,
            pidfile=pidlockfile.TimeoutPIDLockFile(args.pid_file, 1),
            files_preserve=[ file.stream for file in logger.handlers ],
            stdout=stdout,
            stderr=stderr,
            umask=022)

        try:
            context.open()
        except (lockfile.LockTimeout, lockfile.AlreadyLocked):
            logging.error("Can't obtain a lock on '%s'. Quitting." % args.pid_file)
            sys.exit(1)
    else:
        os.chdir(args.home)

    os.environ['DJANGO_SETTINGS_MODULE'] = args.settings

    wsgi_app = tornado.wsgi.WSGIContainer(
        django.core.handlers.wsgi.WSGIHandler())

    application = tornado.web.Application([
        (r"/async", handlers.AsyncHandler),
        (r".*", tornado.web.FallbackHandler, dict(fallback=wsgi_app)),
    ]);

    server = tornado.httpserver.HTTPServer(application)
    server.listen(args.port)

    logging.info("Core started at localhost:%s (pid=%s)" % (args.port, os.getpid()))

    try:
        tornado.ioloop.IOLoop.instance().start()
    except KeyboardInterrupt:
        print # SIGINT prints '^C' so lets make logs more readable
    except SystemExit:
        pass

    logging.info("Stopped core at localhost:%s (pid=%s)" % (args.port, os.getpid()))

