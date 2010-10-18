"""Runtime environment for Online Lab core. """

import os
import sys
import uuid
import signal
import daemon
import logging
import lockfile
import textwrap
import functools

try:
    import daemon.pidfile as pidlockfile
except ImportError:
    import daemon.pidlockfile as pidlockfile

import tornado.httpserver
import tornado.template
import tornado.options
import tornado.ioloop
import tornado.wsgi
import tornado.web

from ..utils import jsonrpc
from ..utils import configure

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
    """Initialize a new core server. """
    from django.core.management import call_command

    config_text = '''\
    """Online Lab core configuration. """

    import os as _os

    try:
        HOME
    except NameError:
        HOME, _ = _os.path.split(__file__)

    DATABASE_ENGINE    = 'sqlite3'
    DATABASE_NAME      = _os.path.join(HOME, 'onlinelab.db')
    DATABASE_USER      = ''
    DATABASE_PASSWORD  = ''
    DATABASE_HOST      = ''
    DATABASE_PORT      = ''

    SESSION_EXPIRE_AT_BROWSER_CLOSE = False
    '''

    if not os.path.exists(args.home):
        os.makedirs(args.home)

    if args.config_file is not None:
        config_file = args.config_file
    else:
        config_file = os.path.join(args.home, 'settings.py')

    if os.path.exists(config_file) and not args.force:
        print "warning: '%s' exists, use --force to overwrite it" % config_file
    else:
        with open(config_file, 'w') as conf:
            conf.write(textwrap.dedent(config_text))

    INSTALLED_APPS = (
        'django.contrib.auth',
        'django.contrib.sessions',
        'django.contrib.contenttypes',
        'onlinelab.core',
    )

    settings = configure(args, installed_apps=INSTALLED_APPS)
    call_command('syncdb', interactive=False)

    from models import Engine

    print "Added default 'Python' engine to the database."
    engine = Engine(name='Python')
    engine.save()

    if not os.path.exists(settings.logs_path):
        os.makedirs(settings.logs_path)

    if not os.path.exists(settings.data_path):
        os.makedirs(settings.data_path)

    if not os.path.exists(settings.static_path):
        os.makedirs(settings.static_path)

    for elem in ['js', 'css', 'img', 'external']:
        static_path_elem = os.path.join(settings.static_path, elem)

        if not os.path.exists(static_path_elem):
            os.makedirs(static_path_elem)

            ui_path_elem = os.path.join(args.ui_path, elem)

            for ui_elem in os.listdir(ui_path_elem):
                dst = os.path.join(static_path_elem, ui_elem)
                src = os.path.join(ui_path_elem, ui_elem)
                os.symlink(src, dst)

    if not os.path.exists(settings.templates_path):
        os.makedirs(settings.templates_path)

        template_ui_path = os.path.join(args.ui_path, 'templates')

        for template_elem in os.listdir(template_ui_path):
            dst = os.path.join(settings.templates_path, template_elem)
            src = os.path.join(template_ui_path, template_elem)
            os.symlink(src, dst)

    print "Done."

def start(args):
    """Start an existing core server. """
    _setup_logging(args)

    if args.daemon:
        if os.path.exists(args.pid_file):
            logging.error("Server already running. Quitting.")
            sys.exit(1)

        logger = logging.getLogger()

        stdout = sys.stdout
        stderr = sys.stderr

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

    core_uuid = uuid.uuid4().hex

    app_settings = {
        'core_uuid': core_uuid,
        'static_path': args.static_path,
        'template_loader': tornado.template.Loader(args.templates_path),
    }

    import models
    import handlers

    # Before proceeding further lets clear routing table, because
    # services may be out of order or their capabilities changed,
    # we have to bind services from scratch.

    models.Route.objects.all().delete()

    application = tornado.web.Application([
        (r"/", handlers.MainHandler),
        (r"/async/?", handlers.AsyncHandler),
        (r"/client/?", handlers.ClientHandler),
        (r"/service/?", handlers.ServiceHandler),
    ], **app_settings)

    server = tornado.httpserver.HTTPServer(application)
    server.listen(args.port)

    logging.info("Started core at localhost:%s (pid=%s)" % (args.port, os.getpid()))

    ioloop = tornado.ioloop.IOLoop.instance()

    def _on_ping_okay(service, result):
        """Gets executed when a service responds properly. """
        if service.uuid != result['uuid']:
            logging.info("'%s' service has been updated" % service.url)

            service.uuid = result['uuid']

            if 'provider' in result:
                service.provider = result['provider']
            if 'description' in result:
                service.description = result['description']

            service.save()

        logging.info("'%s' service is ready for requests" % service.url)

    def _on_ping_fail(service, error, http_code):
        """Gets executed when communication with a service fails. """
        logging.warning("Removed '%s' service from services cache" % service.url)
        service.delete()

    def _services_callback():
        """Gets executed when IOLoop is started. """
        for service in models.Service.objects.all():
            proxy = jsonrpc.JSONRPCProxy(service.url, 'core')

            okay = functools.partial(_on_ping_okay, service)
            fail = functools.partial(_on_ping_fail, service)

            proxy.call('ping', {
                'uuid': core_uuid,
            }, okay, fail)

    ioloop.add_callback(_services_callback)

    try:
        ioloop.start()
    except KeyboardInterrupt:
        print # SIGINT prints '^C' so lets make logs more readable
    except SystemExit:
        pass

    logging.info("Stopped core at localhost:%s (pid=%s)" % (args.port, os.getpid()))

def stop(args):
    """Stop a running core server. """
    _setup_console_logging(args)

    if not os.path.exists(args.pid_file):
        logging.warning("Nothing to stop. Quitting.")
    else:
        lock = pidlockfile.PIDLockFile(args.pid_file)

        if lock.is_locked():
            pid = lock.read_pid()
            logging.info("Sending TERM signal to core process (pid=%s)" % pid)
            os.kill(pid, signal.SIGTERM)
        else:
            logging.warning("No core running but lock file found. Cleaning up.")
            os.unlink(args.pid_file)

def restart(args):
    """Restart a running core server. """
    raise NotImplementedError("'restart' is not implemented yet")

def status(args):
    """Display information about a core server. """
    raise NotImplementedError("'status' is not implemented yet")

