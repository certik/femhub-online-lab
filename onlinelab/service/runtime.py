"""Runtime environment for Online Lab services. """

import os
import sys
import logging
import lockfile

import daemon

try:
    import daemon.pidfile as pidlockfile
except ImportError:
    import daemon.pidlockfile as pidlockfile

import tornado.httpserver
import tornado.options
import tornado.ioloop
import tornado.web

import handlers
import processes

def _setup_console_logging(args):
    """Configure :mod:`logging` to log to the terminal. """
    if args.log_level != 'none':
        logger = logging.getLogger()

        level = getattr(logging, args.log_level.upper())
        logger.setLevel(level)

        tornado.options.enable_pretty_logging()

def _setup_logging(args):
    """Enable logging to a terminal and a log file. """
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

def init(args):
    """Initialize a new service. """
    raise NotImplementedError("'init' is not implemented yet")

def start(args):
    """Start an existing service. """
    _setup_logging(args)

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

    application = tornado.web.Application([
        (r"/", handlers.MainHandler),
        (r"/engine/(?P<guid>\w{32})/(?P<func>[a-z]+)", handlers.EngineHandler),
    ]);

    server = tornado.httpserver.HTTPServer(application)
    server.listen(args.port)

    logging.info("Started service at localhost:%s (pid=%s)" % (args.port, os.getpid()))

    try:
        tornado.ioloop.IOLoop.instance().start()
    except KeyboardInterrupt:
        print # SIGINT prints '^C' so lets make logs more readable
    except SystemExit:
        pass

    # Make sure we clean up after this service here. It is important that
    # we explicitly terminate all child processes that were # spawned by
    # this service.

    processes.ProcessManager.instance().killall()

    logging.info("Stopped service at localhost:%s (pid=%s)" % (args.port, os.getpid()))

def stop(args):
    """Stop a running service. """
    _setup_console_logging(args)

    lock = pidlockfile.PIDLockFile(args.pid_file)

    if lock.is_locked():
        pid = lock.read_pid()
        logging.info("Sending TERM signal to service process (pid=%s)" % pid)
        os.kill(pid, signal.SIGTERM)
        sys.exit(0)
    else:
        logging.warning("No service running but lock file found. Cleaning up.")
        os.unlink(args.pid_file)
        sys.exit(1)

def restart(args):
    """Restart a running service. """
    raise NotImplementedError("'restart' is not implemented yet")

def status(args):
    """Display information about a service. """
    raise NotImplementedError("'status' is not implemented yet")

