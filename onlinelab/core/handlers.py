"""HTTP request handlers for Online Lab core. """

import logging
import httplib
import functools

import tornado.web
import tornado.escape

import auth
import services

from ..utils import jsonrpc
from ..utils import Settings

from models import (
    User, Engine, Folder, Notebook, Cell,
    ctype_to_int, int_to_ctype,
)

class MainHandler(tornado.web.RequestHandler):
    """Render default Online Lab user interface. """

    def get(self):
        settings = Settings.instance()

        try:
            self.render('femhub/femhub.html', debug=settings.debug)
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
        'RPC.Notebook.load',
        'RPC.Notebook.save',
    ]

    def return_api_result(self, result=None):
        """Return higher-level JSON-RPC result response. """
        if result is None:
            result = {}

        result['ok'] = True

        self.return_result(result)

    def return_api_error(self, error=None):
        """Return higher-level JSON-RPC error response. """
        self.return_result({'ok': False, 'error': error})

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

            user.email_user(head, rendered)
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
            except Folder.DoesNotExist:
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
    def RPC__Notebook__load(self, uuid, type=None):
        """Load cells (in order) associated with a notebook. """
        if type is not None:
            type = ctype_to_int(type)

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
                        'content': cell.content,
                        'type': int_to_ctype(cell.type),
                    }

            for uuid in notebook.order.split(','):
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
                content = data['content']
                type = ctype_to_int(data['type'])

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

            notebook.order = ','.join(order)
            notebook.save()

            # XXX: implement garbage collection

            self.return_api_result()

class AsyncHandler(jsonrpc.AsyncJSONRPCRequestHandler):
    """Handle message routing between clients and services. """

    __methods__ = ['init', 'kill', 'stat', 'evaluate', 'interrupt']

    def initialize(self):
        self.manager = services.ServiceManager().instance()

    def forward(self, uuid, method, params):
        """Forward a method call to the assigned service. """
        try:
            try:
                service = self.manager.get_service(uuid)
            except services.NotAssignedYet:
                if method == 'init':
                    service = self.manager.bind(uuid)
                else:
                    self.return_result({'initialized': False})
                    return
            except services.Disconnected:
                if method == 'init':
                    service = self.manager.bind(uuid)
                else:
                    if self.method == 'kill':
                        self.manager.unbind(uuid)

                    self.return_result({'disconnected': True})
                    return
        except services.NoServicesAvailable:
            self.return_error(2, "No services are currently available")
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

    def register(self, service_url):
        """Process registration request from a service. """
        try:
            self.manager.add_service(service_url)
        except services.AlreadyExists:
            registered = False
        else:
            registered = True

        self.return_result({ 'registered': registered })

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

