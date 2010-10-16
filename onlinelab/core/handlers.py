"""HTTP request handlers for Online Lab core. """

import logging
import smtplib
import httplib
import functools

from datetime import datetime

import docutils.core
import pygments.formatters

import tornado.web
import tornado.escape

import auth
import services

from ..utils import jsonrpc
from ..utils import Settings

from models import User, Engine, Folder, Notebook, Cell

class ParseError(Exception):
    """Raised when '{{{' or '}}}' is misplaced. """

class MainHandler(tornado.web.RequestHandler):
    """Render default Online Lab user interface. """

    def get(self):
        settings = Settings.instance()

        html = pygments.formatters.HtmlFormatter(nobackground=True)
        css = html.get_style_defs(arg='.highlight')

        try:
            self.render('femhub/femhub.html', debug=settings.debug, extra_css=css)
        except:
            raise tornado.web.HTTPError(500)

class ClientHandler(auth.DjangoMixin, jsonrpc.AsyncJSONRPCRequestHandler):
    """Handle JSON-RPC method calls from the user interface. """

    __methods__ = [
        'RPC.hello',
        'RPC.Template.render',
        'RPC.User.isAuthenticated',
        'RPC.User.login',
        'RPC.User.logout',
        'RPC.User.createAccount',
        'RPC.User.remindPassword',
        'RPC.Core.getEngines',
        'RPC.Folder.getRoot',
        'RPC.Folder.create',
        'RPC.Folder.remove',
        'RPC.Folder.rename',
        'RPC.Folder.move',
        'RPC.Folder.getFolders',
        'RPC.Folder.getNotebooks',
        'RPC.Notebook.create',
        'RPC.Notebook.remove',
        'RPC.Notebook.rename',
        'RPC.Notebook.move',
        'RPC.Notebook.publish',
        'RPC.Notebook.fork',
        'RPC.Notebook.load',
        'RPC.Notebook.save',
        'RPC.Docutils.import',
        'RPC.Docutils.export',
        'RPC.Docutils.render',
    ]

    def return_api_result(self, result=None):
        """Return higher-level JSON-RPC result response. """
        if result is None:
            result = {}

        result['ok'] = True

        self.return_result(result)

    def return_api_error(self, reason=None):
        """Return higher-level JSON-RPC error response. """
        self.return_result({'ok': False, 'reason': reason})

    def RPC__hello(self):
        """Politely reply to a greeting from a client. """
        self.return_api_result({'message': 'Hi, this Online Lab!'})

    @jsonrpc.authenticated
    def RPC__Template__render(self, name, context=None):
        """Render a template in the given context. """
        try:
            template = self.settings['template_loader'].load(name)
        except IOError:
            self.return_api_error("Template not found")
        else:
            if context is None:
                context = {}

            try:
                rendered = template.generate(**context)
            except:
                self.return_api_error("Template rendering error")
            else:
                self.return_api_result({'rendered': rendered})

    def RPC__User__isAuthenticated(self):
        """Returns ``True`` if the current user is authenticated. """
        authenticated = self.user.is_authenticated()
        self.return_api_result({'authenticated': authenticated})

    def RPC__User__login(self, username, password, remember=True):
        """Log in a user to the system using a username and password. """
        user = auth.authenticate(username=username, password=password)

        if Settings.instance().auth and username == 'lab':
            user = None

        if user is None:
            self.return_api_error('credentials')
            return

        if not user.is_active:
            self.return_api_error('disabled')
            return

        if not remember:
            self.session.set_expiry(0)

        self.login(user)
        self.return_api_result()

    def RPC__User__logout(self):
        """Log out the current user and erase session information. """
        self.logout()
        self.return_api_result()

    def RPC__User__createAccount(self, username, email, password):
        """Create new user account given credentials and E-mail. """
        try:
            if username != 'lab':
                User.objects.get(username=username)
            self.return_api_error('exists')
        except User.DoesNotExist:
            User.objects.create_user(username, email, password)
            self.return_api_result()

    def RPC__User__remindPassword(self, username):
        """Generate new random password and send it to the user. """
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            self.return_api_error('does-not-exist')
        else:
            password = User.objects.make_random_password()

            user.set_password(password)
            user.save()

            head = "[FEMhub Online Lab] Password Reminder Notification"

            template = self.settings['template_loader'].load('femhub/password.txt')
            rendered = template.generate(username=username, password=password)

            try:
                user.email_user(head, rendered)
            except smtplib.SMTPRecipientsRefused:
                self.return_api_error('invalid-email')
            else:
                self.return_api_result()

    @jsonrpc.authenticated
    def RPC__Core__getEngines(self):
        """Return a list of all available engines. """
        engines = []

        for engine in Engine.objects.all():
            engines.append({
                'uuid': engine.uuid,
                'name': engine.name,
                'description': engine.description,
            })

        self.return_api_result({'engines': engines})

    @jsonrpc.authenticated
    def RPC__Folder__getRoot(self):
        """Return the main folder for the current user ("My folders"). """
        try:
            folder = Folder.objects.get(user=self.user, parent=None)
        except Folder.DoesNotExist:
            folder = Folder(user=self.user, name="My folders")
            folder.save()

        self.return_api_result({'uuid': folder.uuid, 'name': folder.name})

    @jsonrpc.authenticated
    def RPC__Folder__create(self, name, uuid=None):
        """Create a new folder and add it to a parent with the given ``uuid``. """
        try:
            if uuid is not None:
                parent = Folder.objects.get(user=self.user, uuid=uuid)
            else:
                parent = None
        except Folder.DoesNotExist:
            self.return_api_error('does-not-exist')
        else:
            folder = Folder(user=self.user, parent=parent, name=name)
            folder.save()

            self.return_api_result({'uuid': folder.uuid})

    @jsonrpc.authenticated
    def RPC__Folder__remove(self, uuid):
        """Remove folder pointed by the given ``uuid``. """
        try:
            folder = Folder.objects.get(user=self.user, uuid=uuid)
        except Folder.DoesNotExist:
            self.return_api_error('does-not-exist')
        else:
            folder.delete()
            self.return_api_result()

    @jsonrpc.authenticated
    def RPC__Folder__rename(self, name, uuid):
        """Assign new name to a folder pointed by the given ``uuid``.  """
        try:
            folder = Folder.objects.get(user=self.user, uuid=uuid)
        except Folder.DoesNotExist:
            self.return_api_error('does-not-exist')
        else:
            folder.name = name
            folder.save()

            self.return_api_result()

    @jsonrpc.authenticated
    def RPC__Folder__move(self, folder_uuid, target_uuid):
        """Move a folder pointed by ``folder_uuid`` to ``target_uuid``. """
        try:
            folder = Folder.objects.get(user=self.user, uuid=folder_uuid)
            target = Folder.objects.get(user=self.user, uuid=target_uuid)
        except Folder.DoesNotExist:
            self.return_api_error('does-not-exist')
        else:
            folder.parent = target
            folder.save()

            self.return_api_result()

    @jsonrpc.authenticated
    def RPC__Folder__getFolders(self, uuid=None, recursive=True, notebooks=False):
        """Get a list of sub-folders for the given parent ``uuid``. """
        try:
            if uuid is not None:
                parent = Folder.objects.get(user=self.user, uuid=uuid)
            else:
                parent = None
        except Folder.DoesNotExist:
            self.return_api_error('does-not-exist')
        else:
            def _get_notebooks(folder):
                """Collect all notebooks in ``folder``. """
                notebooks = []

                for notebook in Notebook.objects.filter(user=self.user, folder=folder):
                    notebooks.append({'uuid': notebook.uuid, 'name': notebook.name})

                return notebooks

            def _get_folders(parent):
                """Collect all sub-folders of ``parent``. """
                folders = []

                for folder in Folder.objects.filter(user=self.user, parent=parent):
                    data = {
                        'uuid': folder.uuid,
                        'name': folder.name,
                        'created': jsonrpc.datetime(folder.created),
                        'modified': jsonrpc.datetime(folder.modified),
                        'description': folder.description,
                    }

                    if recursive:
                        data['folders'] = _get_folders(folder)

                    if notebooks:
                        data['notebooks'] = _get_notebooks(folder)

                    folders.append(data)

                return folders

            self.return_api_result({'folders': _get_folders(parent)})

    @jsonrpc.authenticated
    def RPC__Folder__getNotebooks(self, uuid):
        """Get all notebooks from the given folder. """
        try:
            folder = Folder.objects.get(user=self.user, uuid=uuid)
        except Folder.DoesNotExist:
            self.return_api_error('does-not-exist')
        else:
            notebooks = []

            for notebook in Notebook.objects.filter(user=self.user, folder=folder):
                notebooks.append({
                    'uuid': notebook.uuid,
                    'name': notebook.name,
                    'created': jsonrpc.datetime(notebook.created),
                    'modified': jsonrpc.datetime(notebook.modified),
                    'published': jsonrpc.datetime(notebook.published),
                    'engine': {
                        'uuid': notebook.engine.uuid,
                        'name': notebook.engine.name,
                    },
                })

            self.return_api_result({'notebooks': notebooks})

    @jsonrpc.authenticated
    def RPC__Notebook__create(self, name, engine_uuid, folder_uuid):
        """Create new notebook and add it to the given folder. """
        try:
            if folder_uuid is not None:
                folder = Folder.objects.get(user=self.user, uuid=folder_uuid)
            else:
                folder = None
        except Folder.DoesNotExist:
            self.return_api_error('does-not-exist')
        else:
            try:
                engine = Engine.objects.get(uuid=engine_uuid)
            except Engine.DoesNotExist:
                self.return_api_error('does-not-exist')
            else:
                notebook = Notebook(user=self.user,
                    name=name, engine=engine, folder=folder)
                notebook.save()

                self.return_api_result({'uuid': notebook.uuid})

    @jsonrpc.authenticated
    def RPC__Notebook__remove(self, uuid):
        """Remove a notebook pointed by the given ``uuid``. """
        try:
            notebook = Notebook.objects.get(user=self.user, uuid=uuid)
        except Notebook.DoesNotExist:
            self.return_api_error('does-not-exist')
        else:
            notebook.delete()
            self.return_api_result()

    @jsonrpc.authenticated
    def RPC__Notebook__rename(self, uuid, name):
        """Assign a new name to a notebook pointed by the given ``uuid``.  """
        try:
            notebook = Notebook.objects.get(user=self.user, uuid=uuid)
        except Notebook.DoesNotExist:
            self.return_api_error('does-not-exist')
        else:
            notebook.name = name
            notebook.save()

            self.return_api_result()

    @jsonrpc.authenticated
    def RPC__Notebook__move(self, uuid, target_uuid):
        """Move a notebook (or notebooks) to another folder. """
        try:
            target = Folder.objects.get(user=self.user, uuid=target_uuid)
        except Folder.DoesNotExist:
            self.return_api_error('does-not-exist')
        else:
            if isinstance(uuid, list):
                uuids = uuid
            else:
                uuids = [uuid]

            for uuid in uuids:
                try:
                    notebook = Notebook.objects.get(user=self.user, uuid=uuid)
                except Notebook.DoesNotExist:
                    self.return_api_error('does-not-exist')
                else:
                    notebook.folder = target
                    notebook.save()

            self.return_api_result()

    @jsonrpc.authenticated
    def RPC__Notebook__publish(self, uuid):
        """Make notebook pointed by ``uuid`` visible to others. """
        try:
            notebook = Notebook.objects.get(user=self.user, uuid=uuid)
        except Notebook.DoesNotExist:
            self.return_api_error('notebook-does-not-exist')
        else:
            if notebook.published is not None:
                self.return_api_error('already-published')
            elif notebook.name == 'untitled':
                self.return_api_error('choose-better-name')
            else:
                notebook.published = datetime.now()
                notebook.save()

                self.return_api_result()

    @jsonrpc.authenticated
    def RPC__Notebook__fork(self, origin_uuid, folder_uuid):
        """Create an exact copy of a notebook from an origin. """
        try:
            origin = Notebook.objects.get(uuid=origin_uuid)
        except Notebook.DoesNotExist:
            self.return_api_error('origin-does-not-exist')
            return

        try:
            folder = Folder.objects.get(uuid=folder_uuid)
        except Folder.DoesNotExist:
            self.return_api_error('folder-does-not-exist')
            return

        notebook = Notebook(
            user=self.user,
            name=origin.name,
            description=origin.description,
            engine=origin.engine,
            origin=origin,
            folder=folder)

        order = []

        for uuid in origin.get_order():
            try:
                base = Cell.objects.get(uuid=uuid)
            except Cell.DoesNotExist:
                pass
            else:
                cell = Cell(user=self.user,
                            type=base.type,
                            content=base.content,
                            notebook=notebook)
                order.append(cell.uuid)
                cell.save()

        notebook.set_order(order)
        notebook.save()

        self.return_api_result({'uuid': notebook.uuid})

    @jsonrpc.authenticated
    def RPC__Notebook__load(self, uuid, type=None):
        """Load cells (in order) associated with a notebook. """
        try:
            notebook = Notebook.objects.get(user=self.user, uuid=uuid)
        except Notebook.DoesNotExist:
            self.return_api_error('does-not-exist')
        else:
            data, cells = {}, []

            for cell in Cell.objects.filter(user=self.user, notebook=notebook):
                if type is None or cell.type == type:
                    data[cell.uuid] = {
                        'uuid': cell.uuid,
                        'type': cell.type,
                        'content': cell.content,
                    }

            for uuid in notebook.get_order():
                if uuid in data:
                    cells.append(data[uuid])

            self.return_api_result({'cells': cells})

    @jsonrpc.authenticated
    def RPC__Notebook__save(self, uuid, cells):
        """Store cells (and their order) associated with a notebook. """
        try:
            notebook = Notebook.objects.get(user=self.user, uuid=uuid)
        except Notebook.DoesNotExist:
            self.return_api_error('does-not-exist')
        else:
            order = []

            for data in cells:
                uuid = data['uuid']
                type = data['type']
                content = data['content']

                try:
                    cell = Cell.objects.get(user=self.user, uuid=uuid)
                except Cell.DoesNotExist:
                    cell = Cell(uuid=uuid,
                                user=self.user,
                                notebook=notebook,
                                content=content,
                                type=type)
                else:
                    cell.content = content
                    cell.type = type

                order.append(uuid)
                cell.save()

            notebook.set_order(order)
            notebook.save()

            uuids = set(order)

            for cell in Cell.objects.filter(user=self.user, notebook=notebook):
                if cell.uuid not in uuids:
                    cell.delete()

            self.return_api_result()

    def _parse_source(self, rst):
        """Transform '{{{' / '}}}' extended source code to a list of cells. """
        lines = rst.split('\n')

        TEXT, CODE = 0, 1
        state, skip, content = TEXT, False, []

        cells = []

        for k, line in enumerate(lines):
            if line.startswith('{{{'):
                if state == TEXT:
                    line = line[3:].lstrip()
                    cells.append((TEXT, content))
                    content = []
                    state = CODE
                else:
                    raise ParserError("unexpected '{{{' on line %d" % k)

            if line.endswith('}}}'):
                if state == CODE:
                    content.append(line[:-3].rstrip())
                    cells.append((CODE, content))
                    content = []
                    state = TEXT
                    skip = False
                    continue
                else:
                    raise ParserError("unexpected '}}}' on line %d" % k)

            if not skip:
                if state == CODE and line == '///':
                    skip = True
                else:
                    content.append(line)

        if content:
            if state == TEXT:
                cells.append((TEXT, content))
            else:
                raise RSTParserError("unterminated '{{{'")

        result = []

        for type, lines in cells:
            for line in list(lines):
                if line:
                    break
                else:
                    del lines[0]

            for line in reversed(lines):
                if line:
                    break
                else:
                    del lines[-1]

            if lines:
                if type == TEXT:
                    type = 'rst'
                else:
                    type = 'input'

                result.append((type, '\n'.join(lines)))

        return result

    @jsonrpc.authenticated
    def RPC__Docutils__import(self, name, rst, engine_uuid, folder_uuid):
        """Import notebook contents from a document with Cell-RST syntax. """
        try:
            if folder_uuid is not None:
                folder = Folder.objects.get(user=self.user, uuid=folder_uuid)
            else:
                folder = None
        except Folder.DoesNotExist:
            self.return_api_error('folder-does-not-exist')
        else:
            try:
                engine = Engine.objects.get(uuid=engine_uuid)
            except Engine.DoesNotExist:
                self.return_api_error('engine-does-not-exist')
            else:
                try:
                    cells = self._parse_source(rst)
                except ParseError, exc:
                    self.return_api_error(exc.args[0])
                else:
                    notebook = Notebook.objects.create(user=self.user,
                        name=name, engine=engine, folder=folder)

                    order = []

                    for type, content in cells:
                        cell = Cell.objects.create(user=self.user,
                            notebook=notebook, content=content, type=type)
                        order.append(cell.uuid)

                    notebook.order = ','.join(order)
                    notebook.save()

                    self.return_api_result({'uuid': notebook.uuid, 'count': len(cells)})

    @jsonrpc.authenticated
    def RPC__Docutils__export(self, uuid):
        """Export notebook contents to a document with Cell-RST syntax. """
        try:
            notebook = Notebook.objects.get(user=self.user, uuid=uuid)
        except Notebook.DoesNotExist:
            self.return_api_error('notebook-does-not-exist')
        else:
            rst = []

            for uuid in notebook.get_order():
                try:
                    cell = Cell.objects.get(user=self.user, uuid=uuid)
                except Cell.DoesNotExist:
                    self.return_api_error('cell-does-not-exist')
                    return

                if cell.type == 'rst':
                    rst.append(cell.content)
                    continue

                if cell.type == 'input':
                    rst.append('{{{')
                    rst.append(cell.content)
                    rst.append('}}}')
                    continue

            self.return_api_result({'rst': '\n'.join(rst)})

    @jsonrpc.authenticated
    def RPC__Docutils__render(self, rst):
        """Transform RST source code to HTML with Online Lab CSS. """
        parts = docutils.core.publish_parts(rst, writer_name='html')
        self.return_api_result({'html': parts['fragment']})

class AsyncHandler(jsonrpc.AsyncJSONRPCRequestHandler):
    """Handle message routing between clients and services. """

    __methods__ = ['init', 'kill', 'stat', 'complete', 'evaluate', 'interrupt']

    def initialize(self):
        self.manager = services.ServiceManager().instance()

    def forward(self, uuid, method, params):
        """Forward a method call to the assigned service. """
        try:
            service = self.manager.get_service(uuid)
        except services.NotAssignedYet:
            if method == 'init':
                try:
                    service = self.manager.bind(uuid)
                except services.NoServicesAvailable:
                    self.return_error(1, "No services are currently available")
                    return
            else:
                self.return_error(2, "Service disconnected or not assigned yet")
                return

        okay = functools.partial(self.on_forward_okay, uuid)
        fail = functools.partial(self.on_forward_fail, uuid)

        proxy = jsonrpc.JSONRPCProxy(service.url, 'engine')
        proxy.call(method, params, okay, fail)

    def on_forward_okay(self, uuid, result):
        """Gets executed when remote call succeeded. """
        if self.method == 'kill':
            self.manager.unbind(uuid)

        self.return_result(result)

    def on_forward_fail(self, uuid, error, http_code):
        """Gets executed when remote call failed. """
        self.manager.unbind(uuid)
        self.return_result(error)

    def init(self, uuid):
        """Forward 'init' method call to the assigned service. """
        self.forward(uuid, 'init', {'uuid': uuid})

    def kill(self, uuid):
        """Forward 'kill' method call to the assigned service. """
        self.forward(uuid, 'kill', {'uuid': uuid})

    def stat(self, uuid):
        """Forward 'stat' method call to the assigned service. """
        self.forward(uuid, 'stat', {'uuid': uuid})

    def complete(self, uuid, source):
        """Forward 'complete' method call to the assigned service. """
        self.forward(uuid, 'complete', {'uuid': uuid, 'source': source})

    def evaluate(self, uuid, source, cellid=None):
        """Forward 'evaluate' method call to the assigned service. """
        self.forward(uuid, 'evaluate', {'uuid': uuid, 'source': source, 'cellid': cellid})

    def interrupt(self, uuid, cellid=None):
        """Forward 'interrupt' method call to the assigned service. """
        self.forward(uuid, 'interrupt', {'uuid': uuid, 'cellid': cellid})

class ServiceHandler(jsonrpc.AsyncJSONRPCRequestHandler):
    """Handle communication from Online Lab services. """

    __methods__ = ['register']

    def initialize(self):
        self.manager = services.ServiceManager().instance()

    def register(self, url, uuid, provider, description):
        """Process registration request from a service. """
        self.manager.add_service(url, uuid, provider, description)
        self.return_result()

class ErrorHandler(tornado.web.RequestHandler):
    """Custom HTTP error handler (based on http://gist.github.com/398252). """

    def __init__(self, application, request, status_code):
        tornado.web.RequestHandler.__init__(self, application, request)
        self.set_status(status_code)

    def get_error_html(self, status_code, **kwargs):
        name = 'femhub/%d.html' % status_code

        try:
            template = self.settings['template_loader'].load(name)
        except IOError:
            template = self.settings['template_loader'].load('femhub/error.html')

        return template.generate(error_code=status_code,
            error_text=httplib.responses[status_code])

    def prepare(self):
        raise tornado.web.HTTPError(self._status_code)

tornado.web.ErrorHandler = ErrorHandler

