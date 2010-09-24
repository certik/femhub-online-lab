"""Engine process manager for Online Lab services. """

import re
import time
import signal
import psutil
import logging
import functools
import subprocess
import collections

import tornado.ioloop
import tornado.httpclient

import utilities

class ProcessManager(object):
    """Start and manage system processes for engines. """

    _re = re.compile("^port=(?P<port>\d+), pid=(?P<pid>\d+)")

    _timeout = 20 # XXX: put this into config file

    def __init__(self):
        self.ioloop = tornado.ioloop.IOLoop.instance()
        self.processes = {}

    @classmethod
    def instance(cls):
        """Returns the global :class:`ProcessManager` instance. """
        if not hasattr(cls, '_instance'):
            cls._instance = cls()
        return cls._instance

    def _run(self, guid, args, okay, fail):
        """Take engine's configuration and start process for it. """
        self.processes[guid] = None

        # XXX: this is temporary solution for development convenience

        try:
            command = args.command
        except AttributeError:
            from engine.python import boot
            command = "python -c '%s'" % boot

        # Lets start the engine's process. For some reason 'shell' argument
        # must be set to 'True', otherwise the process will become defunct.
        # We must close all non-standard file descriptors, because otherwise
        # IOLoop will hang. When the process will be ready to handle requests
        # from the core, it'll tell us this by sending a single line of well
        # formatted text (containing port numer and PID) via a pipe.

        proc = subprocess.Popen(command, shell=True, close_fds=True, stdout=subprocess.PIPE)

        # File descriptor of the pipe (fd) is our connector the process, so
        # we will monitor this descriptor to see the change in status of the
        # process (ready for processing requests, unexpected death).

        fd = proc.stdout.fileno()

        timeout = functools.partial(self._on_run_timeout, guid, proc, fail, fd)
        tm = self.ioloop.add_timeout(time.time() + self._timeout, timeout)

        handler = functools.partial(self._on_run_handler, guid, proc, okay, fail, tm)
        self.ioloop.add_handler(fd, handler, self.ioloop.READ | self.ioloop.ERROR)

    def _on_run_timeout(self, guid, proc, fail, fd):
        """Hard deadline on engine's process startup (start or die). """
        self.ioloop.remove_handler(fd)

        # The process is running but takes too much time to start, e.g.
        # a deadlock occurred or whatever else. We don't know, so what
        # we can do is to remove process entry, kill the process and
        # gracefully fail. If engines are properly configured, then
        # this handler shouldn't be executed at all, unless e.g. we
        # are running out of memory.

        del self.processes[guid]
        proc.kill()

        fail('timeout')

    def _on_run_handler(self, guid, proc, okay, fail, tm, fd, events):
        """Startup handler that gets executed on pipe write or error. """
        self.ioloop.remove_timeout(tm)
        self.ioloop.remove_handler(fd)

        if events & self.ioloop.ERROR:
            fail('died')
        else:
            # Connection was established, so lets get first output line
            # and check if it contains valid data (socket port numer and
            # process identifier).

            output = proc.stdout.readline()
            result = self._re.match(output)

            if result is not None:
                port = int(result.groupdict()['port'])
                process = EngineProcess(guid, proc, port)

                self.processes[guid] = process

                handler = functools.partial(self._on_disconnect, guid)
                self.ioloop.add_handler(fd, handler, self.ioloop.ERROR)

                logging.info("Started new child process (pid=%s)" % process.pid)

                okay('started')
            else:
                # We got invalid data from the engine process, so lets
                # clean up (remove process entry marker and kill the
                # process) and gracefully fail.

                del self.processes[guid]
                proc.kill()

                fail('invalid-output')

    def _on_disconnect(self, guid, fd, events):
        """Handler that gets executed when a process dies. """
        # The pipe that connects this service to some engine's stdout was
        # destroyed. Most likely engine's process was killed, but for the
        # sake of completeness (to avoid dead process and memory leaks)
        # lets make sure the process is really dead.

        process = self.processes[guid]

        logging.warning("Child process disconnected (pid=%s)" % process.pid)

        if process.is_running:
            self.process.kill()

        # 'False' value tells us that this process was running but was killed
        # unexpectedly. The next engine method invocation will take advantage
        # of this and tell the caller that the process died (we can't do it
        # here because we can't initiate communication with the core).

        self.processes[guid] = False

    def init(self, guid, args, okay, fail):
        """Initialize new engine (start a process). """
        if guid in self.processes:
            if self.processes[guid] is None:
                fail('starting')
            else:
                fail('running')
        else:
            self._run(guid, args, okay, fail)

    def _get_process(self, guid, fail):
        if guid not in self.processes:
            fail('no-such-process')
        else:
            process = self.processes[guid]

            if process is None:
                fail('starting')
            elif process is False:
                del self.processes[guid]
                fail('died')
            else:
                return process

    def kill(self, guid, args, okay, fail):
        """Stop an existing engine (kill a process). """
        process = self._get_process(guid, fail)

        if process is not None:
            process.kill(args, okay, fail)
            del self.processes[guid]

    def stat(self, guid, args, okay, fail):
        """Gather data about a process. """
        process = self._get_process(guid, fail)

        if process is not None:
            process.stat(args, okay, fail)

    def evaluate(self, guid, args, okay, fail):
        """Evaluate a piece of source code. """
        process = self._get_process(guid, fail)

        if process is not None:
            process.evaluate(args, okay, fail)

    def interrupt(self, guid, args, okay, fail):
        """Stop evaluation of specified requests. """
        process = self._get_process(guid, fail)

        if process is not None:
            process.interrupt(args, okay, fail)

    def killall(self):
        """Forcibly kill all processes that belong to this manager. """
        for guid, process in self.processes.iteritems():
            logging.warning("Forced kill of %s (pid=%s)" % (guid, process.pid))
            process.proc.kill()

class EngineProcess(object):
    """Bridge between a logical engine and a physical process. """

    def __init__(self, guid, proc, port):
        """Initialize an engine based on existing system process. """
        self.guid = guid
        self.proc = proc
        self.port = port

        self.util = psutil.Process(proc.pid)
        self.evaluating = False
        self.queue = collections.deque()
        self.url = "http://localhost:%s" % port

    @property
    def pid(self):
        return self.proc.pid

    @property
    def is_running(self):
        return self.proc.poll() is None

    def kill(self, args, okay, fail):
        """Terminate this engine's process. """
        # XXX: clear the queue?
        self.proc.terminate()
        okay('killed')

    def stat(self, args, okay, fail):
        """Gather data about this engine's process. """
        cpu_percent = self.util.get_cpu_percent()
        cpu_times = self.util.get_cpu_times()
        memory_percent = self.util.get_memory_percent()
        memory_info = self.util.get_memory_info()

        okay({
            'cpu': { 'percent': cpu_percent, 'user': cpu_times.user, 'system': cpu_times.system },
            'memory': { 'percent': memory_percent, 'rss': memory_info.rss, 'vms': memory_info.vms },
        })

    def evaluate(self, args, okay, fail):
        """Evaluate code in this engine's process. """
        self._schedule(args, okay, fail)
        self._evaluate()

    def interrupt(self, args, okay, fail):
        """Stop evaluation of a particular request or all requests. """
        if not self.evaluating:
            okay('not-evaluating')
            return

        guid = args.get('guid', None)

        if guid == 'all':
            self.queue.clear()
        elif guid and self.evaluating.args.guid != guid:
            for i, (args, okay, fail) in enumerate(self.queue):
                if args.guid == self.evaluating.args.guid:
                    okay(dict(source=args.source, interrupted=True,
                        traceback=False, out='', err=''))
                    del self.queue[i]
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

    def _evaluate(self):
        """Evaluate next pending request if engine not busy. """
        if not self.evaluating and self.queue:
            args, okay, fail = self.evaluating = self.queue.pop()

            body = utilities.xml_encode(args.source, 'evaluate')

            http_client = tornado.httpclient.AsyncHTTPClient()
            http_request = tornado.httpclient.HTTPRequest(self.url, method='POST', body=body)

            http_client.fetch(http_request, self._on_evaluate_handler)

    def _on_evaluate_timeout(self):
        raise NotImplementedError

    def _on_evaluate_handler(self, response):
        """Handler that gets executed when evaluation finishes. """
        _, okay, fail = self.evaluating

        self.evaluating = False
        self._evaluate()

        if response.code == 200:
            okay(utilities.xml_decode(response.body))
        else:
            fail('response-code')
