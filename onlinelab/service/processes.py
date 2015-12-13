"""Engine process manager for Online Lab services. """

import os
import re
import sys
import time
import fcntl
import signal
import shutil
import logging
import xmlrpclib
import functools
import subprocess
import collections

from StringIO import StringIO

import psutil
import pyinotify

import tornado.ioloop

from tornado.httpclient import AsyncHTTPClient, HTTPRequest
from tornado.httputil import HTTPHeaders

import utilities

from ..utils import settings

class UIDSpaceExhausted(Exception):
    """Raised when no more spare UIDs were left. """

class ProcessManager(object):
    """Start and manage system processes for engines. """

    _re = re.compile("^.*?port=(?P<port>\d+), pid=(?P<pid>\d+)")

    _inotify_mask = pyinotify.IN_CREATE \
                  | pyinotify.IN_MODIFY \
                  | pyinotify.IN_DELETE

    def __init__(self):
        self.ioloop = tornado.ioloop.IOLoop.instance()
        self.settings = settings.Settings.instance()

        self.processes = {}

        self.watches = pyinotify.WatchManager()
        self.notifier = pyinotify.Notifier(self.watches, timeout=0)

        self.ioloop.add_handler(self.watches.get_fd(),
            self._on_inotify, self.ioloop.READ)

        mask = self._inotify_mask

        self.watches.add_watch(self.settings.data_path, mask,
            self._process_events, rec=True, auto_add=True)

        self.uid_map = [False]*self.settings.uid_max

    def _on_inotify(self, fd, events):
        """Get executed when new inotify's events arrive. """
        while self.notifier.check_events():
            self.notifier.read_events()
            self.notifier.process_events()

    def _process_events(self, event):
        if event.dir:
            return

        user = self.settings.data_path
        path = event.pathname

        parts = []

        while path != user:
            path, part = os.path.split(path)
            parts.insert(0, part)

        if len(parts) < 2:
            return

        uuid = parts[0]

        try:
            process = self.processes[uuid]
        except KeyError:
            return

        if not (process and process.is_evaluating):
            return

        file = os.path.join(*parts[1:])

        if event.mask & (pyinotify.IN_CREATE | pyinotify.IN_MODIFY):
            self.processes[uuid].add_file(file)
        else:
            self.processes[uuid].rm_file(file)

        logging.info("Processed inotify event for '%s' (file='%s')" % (uuid, file))

    @classmethod
    def instance(cls):
        """Returns the global :class:`ProcessManager` instance. """
        if not hasattr(cls, '_instance'):
            cls._instance = cls()
        return cls._instance

    def build_env(self):
        """Build hardened environment for engine process. """
        if self.settings.environ is True:
            env = dict(os.environ)
        else:
            env = {}

            for key, value in self.settings.environ.iteritems():
                if value is True:
                    try:
                        value = os.environ[key]
                    except KeyError:
                        continue

                env[key] = value

        PYTHONPATH = self.settings.get_PYTHONPATH()

        try:
            path = env['PYTHONPATH']
        except KeyError:
            try:
                path = os.environ['PYTHONPATH']
            except KeyError:
                path = None

        if path:
            PYTHONPATH += os.pathsep + path

        env['PYTHONPATH'] = PYTHONPATH

        return env

    def alloc_uid_gid(self):
        """Find a spare UID and GID for a new process. """
        uid_min = self.settings.uid_min
        uid_max = self.settings.uid_max

        for uid in xrange(uid_min, uid_max+1):
            if not self.uid_map[uid]:
                self.uid_map[uid] = True
                break
        else:
            raise UIDSpaceExhausted

        return uid, uid

    def purge_uid_gid(self, uid, gid):
        """Return UID and GID to the pool for reuse. """
        if uid is not None:
            self.uid_map[uid] = False

    def _run(self, uuid, args, okay, fail):
        """Take engine's configuration and start process for it. """
        self.processes[uuid] = None

        # XXX: this is temporary solution for development convenience

        try:
            command = args.command
        except AttributeError:
            from engine.python import boot
            command = ["python", "-c", "%s" % boot]

        env = self.build_env()

        # Create a directory for a process that we will spawn in a moment. If
        # it already exists, make sure it is empty (just remove it and create
        # once again).

        cwd = os.path.join(self.settings.data_path, uuid)

        if os.path.exists(cwd):
            shutil.rmtree(cwd)

        os.mkdir(cwd)

        # As we know the home directory for our engine, lets now hack Python's
        # site.py and tell it where is should look for extra modules (.local)
        # and make some other modules happy (e.g. matplotlib).

        env['HOME'] = env['PYTHONUSERBASE'] = cwd

        # In production environments we have to run every Online Lab user as
        # a different system user on a particular machine where a service is
        # running. For simplicity we run every process as a different user.

        # This gives us about 60 thousandth unique resources to be bind with
        # system processes. This should be way more than enough on any kind
        # of hardware we will use, however, on a modern Linux systems, this
        # limit can be pushed to several million, at least, so if we imagine
        # running a million of processes, it should be possible.

        preexec_fn = None

        if not self.settings.setuid:
            uid, gid = None, None
        else:
            uid, gid = self.alloc_uid_gid()

            try:
                os.chown(cwd, uid, gid)
            except OSError:
                logging.warning("Not enough privileges to set permissions (am I root?)")

                self.purge_uid_gid(uid, gid)
                uid, gid = None, None
            else:
                def preexec_fn():
                    os.setgid(gid)
                    os.setuid(uid)

        # Lets start the engine's process. We must close all non-standard file
        # descriptors (via 'close_fds'), because otherwise IOLoop will hang.
        # When the process will be ready to handle requests from the core, it
        # will tell us this by sending a single line of well formatted output
        # (containing port numer and PID) via a pipe.

        proc = subprocess.Popen(command, preexec_fn=preexec_fn, cwd=cwd, env=env,
            close_fds=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        # File descriptor of the pipe (fd) is our connector the process, so
        # we will monitor this descriptor to see the change in status of the
        # process (ready for processing requests, unexpected death).

        fd = proc.stdout.fileno()
        params = uuid, proc, uid, gid, cwd, okay, fail

        deadline = time.time() + self.settings.engine_timeout

        handler = functools.partial(self._on_run_timeout, proc)
        timeout = self.ioloop.add_timeout(deadline, handler)

        handler = functools.partial(self._on_run_handler, params, timeout)
        self.ioloop.add_handler(fd, handler, self.ioloop.READ | self.ioloop.ERROR)

    def cleanup(self, uuid, cwd, uid, gid):
        """Removed all data allocated for a process. """
        self.purge_uid_gid(uid, gid)
        del self.processes[uuid]
        shutil.rmtree(cwd)

    def _on_run_timeout(self, proc):
        """Hard deadline on engine's process startup (start or die). """
        # The process is running but takes too much time to start, e.g.
        # a deadlock occurred or whatever else. We don't know, so what
        # we can do is to remove process entry, kill the process and
        # gracefully fail. If engines are properly configured, then
        # this handler shouldn't be executed at all, unless e.g. we
        # are running out of memory.

        proc.kill() # only kill, rest will be done in _on_run_handler

    def _on_run_handler(self, (uuid, proc, uid, gid, cwd, okay, fail), tm, fd, events):
        """Startup handler that gets executed on pipe write or error. """
        timeout = False

        try:
            self.ioloop.remove_timeout(tm)
        except ValueError:
            timeout = True

        self.ioloop.remove_handler(fd)

        if timeout or events & self.ioloop.ERROR:
            self.cleanup(uuid, cwd, uid, gid)

            if timeout:
                logging.error("Newly created process was starting too long")
                fail('engine-timeout')
            else:
                logging.error("Newly created process died expectingly")
                fail('engine-died')
        else:
            # Connection was established, so lets get first output line
            # and check if it contains valid data (socket port numer and
            # process identifier).

            output = proc.stdout.readline()
            result = self._re.match(output)

            if result is not None:
                port = int(result.groupdict()['port'])
                process = EngineProcess(uuid, proc, cwd, port)

                self.processes[uuid] = process

                # XXX: move this to EngineProcess

                # handler = functools.partial(self._on_disconnect, uuid, cwd, uid, gid)
                # self.ioloop.add_handler(fd, handler, self.ioloop.ERROR)

                logging.info("Started new child process (pid=%s)" % process.pid)

                okay('started')
            else:
                # We got invalid data from the engine process, so lets
                # clean up (remove process entry marker and kill the
                # process) and gracefully fail.

                logging.error("Newly created process didn't respond properly")
                self.cleanup(uuid, cwd, uid, gid)

                proc.kill()
                proc.poll()

                fail('engine-error')

    def _on_disconnect(self, uuid, cwd, uid, gid, fd, events):
        """Handler that gets executed when a process dies. """
        self.ioloop.remove_handler(fd)

        try:
            process = self.processes[uuid]
        except KeyError:
            # We don't want to pass 'fd' everywhere so we don't
            # remove this handler on process kill. We remove it
            # here anyway.
            return

        logging.warning("Child process disconnected (pid=%s)" % process.pid)

        # The pipe that connects this service to some engine's stdout was
        # destroyed. Most likely engine's process was killed, but for the
        # sake of completeness (to avoid dead process and memory leaks)
        # lets make sure the process is really dead.

        if process.is_running:
            process.proc.kill() # XXX: we should use public API for this

        # 'False' value tells us that this process was running but was killed
        # unexpectedly. The next engine method invocation will take advantage
        # of this and tell the caller that the process died (we can't do it
        # here because we can't initiate communication with the core).

        self.cleanup(uuid, cwd, uid, gid)
        self.processes[uuid] = False

    def init(self, uuid, args, okay, fail):
        """Initialize new engine (start a process). """
        if uuid in self.processes:
            if self.processes[uuid] is None:
                fail('engine-starting')
            else:
                fail('engine-running')
        else:
            self._run(uuid, args, okay, fail)

    def _get_process(self, uuid, fail):
        if uuid not in self.processes:
            fail('engine-not-running')
        else:
            process = self.processes[uuid]

            if process is None:
                fail('engine-starting')
            elif process is False:
                del self.processes[uuid]
                fail('engine-died')
            else:
                return process

    def kill(self, uuid, args, okay, fail):
        """Stop an existing engine (kill a process). """
        process = self._get_process(uuid, fail)

        if process is not None:
            process.kill(args, okay, fail)
            # XXX: call cleanup() here
            del self.processes[uuid]

    def stat(self, uuid, args, okay, fail):
        """Gather data about a process. """
        process = self._get_process(uuid, fail)

        if process is not None:
            process.stat(args, okay, fail)

    def complete(self, uuid, args, okay, fail):
        """Complete a piece of source code. """
        process = self._get_process(uuid, fail)

        if process is not None:
            process.complete(args, okay, fail)

    def evaluate(self, uuid, args, okay, fail):
        """Evaluate a piece of source code. """
        process = self._get_process(uuid, fail)

        if process is not None:
            process.evaluate(args, okay, fail)

    def interrupt(self, uuid, args, okay, fail):
        """Stop evaluation of specified requests. """
        process = self._get_process(uuid, fail)

        if process is not None:
            process.interrupt(args, okay, fail)

    def killall(self):
        """Forcibly kill all processes that belong to this manager. """
        for uuid, process in self.processes.iteritems():
            if process is not None:
                logging.warning("Forced kill of %s (pid=%s)" % (uuid, process.pid))
                process.proc.kill()
                process.proc.poll()

class EngineProcess(object):
    """Bridge between a logical engine and a physical process. """

    def __init__(self, uuid, proc, path, port):
        """Initialize an engine based on existing system process. """
        self.uuid = uuid
        self.proc = proc
        self.port = port
        self.path = path

        self.util = psutil.Process(proc.pid)
        self.evaluating = False
        self.queue = collections.deque()
        self.url = "http://localhost:%s" % port
        self.files = []

        self.out = StringIO()
        self.err = StringIO()

        stdout = proc.stdout.fileno()
        stderr = proc.stderr.fileno()

        self._set_nonblocking(stdout)
        self._set_nonblocking(stderr)

        ioloop = tornado.ioloop.IOLoop.instance()

        ioloop.add_handler(stdout, self._on_stdout, ioloop.READ | ioloop.ERROR)
        ioloop.add_handler(stderr, self._on_stderr, ioloop.READ | ioloop.ERROR)

    def __del__(self):
        """Delete this engine's instance. """
        logging.info("%s deleted" % self.uuid)

    def _set_nonblocking(self, fd, nonblocking=True):
        """Set non-blocking property on a file descriptor. """
        fl = fcntl.fcntl(fd, fcntl.F_GETFL)

        if nonblocking:
            fl |=   os.O_NONBLOCK
        else:
            fl &= (~os.O_NONBLOCK) & 0xFFFFFFFF

        fcntl.fcntl(fd, fcntl.F_SETFL, fl)

    def _reset_io(self):
        """Close and recreate local ``stdout`` and ``stderr``. """
        self.out.close()
        self.out = StringIO()

        self.err.close()
        self.err = StringIO()

    def _read_stdout(self):
        """Transfer ``stdout`` from a PIPE to a string buffer. """
        while True:
            try:
                line = self.proc.stdout.readline()
                self.out.write(line)
            except IOError:
                break

    def _read_stderr(self):
        """Transfer ``stderr`` from a PIPE to a string buffer. """
        while True:
            try:
                line = self.proc.stderr.readline()
                self.err.write(line)
            except IOError:
                break

    def _on_stdout(self, fd, events):
        """Monitor engine's ``stdout``. """
        ioloop = tornado.ioloop.IOLoop.instance()

        if events & ioloop.ERROR:
            ioloop.remove_handler(fd)
        else:
            self._read_stdout()

    def _on_stderr(self, fd, events):
        """Monitor engine's ``stderr``. """
        ioloop = tornado.ioloop.IOLoop.instance()

        if events & ioloop.ERROR:
            ioloop.remove_handler(fd)
        else:
            self._read_stderr()

    @property
    def pid(self):
        return self.proc.pid

    @property
    def is_running(self):
        return self.proc.poll() is None

    @property
    def is_evaluating(self):
        return self.evaluating

    def add_file(self, file):
        """Register a new or modified file. """
        self.rm_file(file)
        self.files.append(file)

    def rm_file(self, file):
        """Remove file from registered files. """
        try:
            i = self.files.index(file)
        except ValueError:
            pass
        else:
            del self.files[i]

    def kill(self, args, okay, fail):
        """Terminate this engine's process. """
        # XXX: clear the queue?
        self.proc.terminate()
        self.proc.poll()
        okay('killed')

    def stat(self, args, okay, fail):
        """Gather data about this engine's process. """
        cpu_percent = self.util.get_cpu_percent()
        cpu_times = self.util.get_cpu_times()
        memory_percent = self.util.get_memory_percent()
        memory_info = self.util.get_memory_info()

        user, system = cpu_times
        rss, vms = memory_info

        okay({
            'cpu': { 'percent': cpu_percent, 'user': user, 'system': system },
            'memory': { 'percent': memory_percent, 'rss': rss, 'vms': vms },
        })

    def complete(self, args, okay, fail):
        """Complete code in this engine's process. """
        if self.evaluating:
            fail('busy')
        else:
            self._schedule(args, okay, fail)
            self._evaluate(method='complete')

    def evaluate(self, args, okay, fail):
        """Evaluate code in this engine's process. """
        self._schedule(args, okay, fail)
        self._evaluate()

    def interrupt(self, args, okay, fail):
        """Stop evaluation of a particular request or all requests. """
        if not self.evaluating:
            okay('not-evaluating')
            return

        try:
            cellid = args['cellid']
        except KeyError:
            pass
        else:
            _args, _, _ = self.evaluating

            if cellid != _args.cellid:
                for i, (_args, _okay, _) in enumerate(self.queue):
                    if cellid == _args.cellid:
                        del self.queue[i]
                        okay('interrupted')

                        result = {
                            'source': _args.source,
                            'index': None,
                            'time': 0,
                            'out': u'',
                            'err': u'',
                            'files': [],
                            'plots': [],
                            'traceback': False,
                            'interrupted': True,
                        }

                        _okay(result)
                        return

        # Now the most interesting part. To physically interrupt
        # the interpreter associated with this engine, we send
        # SIGINT to the engine's process. The process will catch
        # this signal via KeyboardInterrupt exception and return
        # partial output and information that the computation was
        # interrupted. If there are any requests pending, then
        # evaluation handler (_on_evaluate_handler) will schedule
        # next request for evaluation. This way we have only one
        # one path of data flow in all cases.

        self.proc.send_signal(signal.SIGINT)
        okay('interrupted')

    def _schedule(self, args, okay, fail):
        """Push evaluation request at the end of the queue. """
        self.queue.append((args, okay, fail))

    def _evaluate(self, method='evaluate'):
        """Evaluate next pending request if engine not busy. """
        if not self.evaluating and self.queue:
            args, okay, fail = self.evaluating = self.queue.pop()

            body = utilities.xml_encode(args.source, method)
            headers = HTTPHeaders({'Content-Type': 'application/xml'})

            request = HTTPRequest(self.url, method='POST',
                body=body, headers=headers, request_timeout=0)

            client = AsyncHTTPClient()
            client.fetch(request, self._on_evaluate_handler)

    def _on_evaluate_timeout(self):
        raise NotImplementedError

    def _on_evaluate_handler(self, response):
        """Handler that gets executed when evaluation finishes. """
        _, okay, fail = self.evaluating

        self.evaluating = False
        self._evaluate()

        if response.code == 200:
            try:
                result = utilities.xml_decode(response.body)
            except xmlrpclib.Fault, exc:
                fail('fault: %s' % exc)
            else:
                self._process_response(result, okay)
        else:
            fail('response-code: %s' % response.code)

        self._reset_io()

    def _process_response(self, result, okay):
        """Perform final processing of evaluation results. """
        result['files'] = self.files

        self._read_stdout()
        self._read_stderr()

        result['shout'] = self.out.getvalue()
        result['sherr'] = self.err.getvalue()

        okay(result)

