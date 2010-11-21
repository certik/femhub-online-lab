"""Runtime environment for Online Lab core. """

import os
import sys
import uuid
import shutil
import signal
import daemon
import logging
import lockfile
import tempfile
import textwrap
import functools
import subprocess

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

        actions = logging.getLogger('actions')
        actions.propagate = False

        handler = logging.handlers.RotatingFileHandler(args.log_actions)
        actions.addHandler(handler)

def _iter_logger_streams():
    """Iterate over open file streams of all loggers. """
    loggers = [logging.getLogger(), logging.getLogger('actions')]

    for logger in loggers:
        for file in logger.handlers:
            yield file.stream

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

    INSTALLED_APPS = (
        'django.contrib.auth',
        'django.contrib.sessions',
        'django.contrib.contenttypes',
        'onlinelab.core',
    )
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

    settings = configure(args)
    call_command('syncdb', interactive=False)

    from models import Engine

    try:
        Engine.objects.get(name='Python')
    except Engine.DoesNotExist:
        print "Added default 'Python' engine to the database."
        Engine.objects.create(name='Python')

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

_package_spec = {
    'firebug': {
        'data': {
            'url': 'http://getfirebug.com/releases/lite/latest/firebug-lite.tar.tgz',
            'dst': 'firebug',
        },
        'cmds': [
            "curl %(url)s | tar -xzC %(tmp)s",
            "find %(tmp)s -type d -exec chmod +x '{}' \\;",
            "mkdir %(dst)s/build",
            "cp %(tmp)s/firebug-lite/build/firebug-lite.js %(dst)s/build",
            "cp -r %(tmp)s/firebug-lite/skin %(dst)s",
        ],
    },
}

def install(packages, args):
    """Install a new package into ``static/external``. """
    if not packages:
        print "No packages were specified for installation (use --package option)."
        sys.exit(1)

    dir = os.path.join(args.data_path, 'tmp')

    if not os.path.exists(dir):
        print "Creating %s" % dir
        os.mkdir(dir)

    external = os.path.join(args.static_path, 'external')

    for package in packages:
        if package not in _package_spec:
            print "'%s' is not a known package" % package
            continue

        print ">>> Installing '%s' ..." % package

        tmp = tempfile.mkdtemp(dir=dir)

        try:
            spec = _package_spec[package]
            data = dict(spec['data'])

            dst = data.get('dst')

            if not dst:
                dst = external
            else:
                dst = os.path.join(external, dst)

                if not os.path.exists(dst):
                    os.makedirs(dst)

            data['tmp'] = tmp
            data['dst'] = dst

            for cmd in spec['cmds']:
                subprocess.call(cmd % data, shell=True)
        finally:
            shutil.rmtree(tmp, True)

    print "Done."

def start(args):
    """Start an existing core server. """
    _setup_logging(args)

    if args.daemon:
        if os.path.exists(args.pid_file):
            logging.error("Server already running. Quitting.")
            sys.exit(1)

        stdout = sys.stdout
        stderr = sys.stderr

        context = daemon.DaemonContext(
            working_directory=args.home,
            pidfile=pidlockfile.TimeoutPIDLockFile(args.pid_file, 1),
            files_preserve=list(_iter_logger_streams()),
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
    import restful

    # Before proceeding further lets clear routing table, because
    # services may be out of order or their capabilities changed,
    # we have to bind services from scratch.

    models.Route.objects.all().delete()

    application = tornado.web.Application([
        (r"/", handlers.MainHandler, dict(debug=False)),
        (r"/debug/?", handlers.MainHandler, dict(debug=True)),
        (r"/async/?", handlers.AsyncHandler),
        (r"/client/?", handlers.ClientHandler),
        (r"/service/?", handlers.ServiceHandler),
        (r"/worksheets/([0-9a-f]+)/?", restful.PublishedWorksheetHandler),
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
            proxy = jsonrpc.JSONRPCProxy(service.url, 'core', log_errors=False)

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

def purge(args, settings):
    """Remove all contents from the database. """
    from django.db.models import get_apps, get_models

    for app in get_apps():
        print ">>> Entering %s" % app.__name__

        for model in get_models(app):
            print "--- Purging %s" % model.__name__
            model.objects.all().delete()

    print "Done."

def dump(args, settings):
    """Dump contents of the database to a file. """
    from django.db.models import get_apps, get_models
    from cPickle import dumps
    from models import SCHEMA

    if not args.path:
        path = settings.data_path
    else:
        path = args.path

        if not os.path.exists(path):
            os.makedirs(path)

    for app in get_apps():
        print ">>> Entering %s" % app.__name__

        for model in get_models(app):
            print "--- Dumping %s" % model.__name__

            app_name = app.__name__.replace('.', '_')
            model_name = model.__name__

            file_name = '%s_%s-%d.ols' % (app_name, model_name, SCHEMA)
            file_path = os.path.join(path, file_name)

            with open(file_path, 'w') as serial:
                for data in model.objects.all().values():
                    serial.write(dumps(data) + '\n\n')

            if args.purge:
                print "--- Purging %s" % model.__name__
                model.objects.all().delete()

    print "Done."

def load(args, settings):
    """Load contents of the database from a file. """
    from django.db import IntegrityError
    from cPickle import loads
    from schema import transform

    if not args.path:
        path = settings.data_path
    else:
        path = args.path

    load_data = []

    for file in os.listdir(path):
        if not file.endswith('.ols'):
            continue

        file_name, _ = os.path.splitext(file)
        file_path = os.path.join(path, file)

        name, schema = file_name.rsplit('-', 1)
        app_name, model_name = name.rsplit('_', 1)
        app_name = app_name.replace('_', '.')

        module = __import__(app_name, fromlist=model_name)
        model = getattr(module, model_name)
        schema = int(schema)

        print ">>> Loading %s from %s" % (model_name, app_name)

        with open(file_path, 'r') as serial:
            lines = ''

            for line in serial.readlines():
                if line != '\n':
                    lines += line
                    continue

                data, lines = loads(lines), ''
                transform(name, data, schema)

                if not args.dry_run:
                    try:
                        model.objects.create(**data)
                    except IntegrityError:
                        print "E: Integrity error raised when processing %s (did you run 'purge' first?)" % model_name
                        sys.exit(1)

        print '--- Stored %d objects' % len(model.objects.all())

        if args.purge:
            print "--- Removing %s" % file_path

            if not args.dry_run:
                os.unlink(file_path)

    print "Done."

