"""HTTP request handlers for Online Lab core. """

import logging
import smtplib
import functools

from datetime import datetime

import docutils.core
import pygments.formatters

import tornado.web
import tornado.escape

import auth
import cors
import errors
import services

from ..utils import jsonrpc
from ..utils import Settings
from ..utils import extensions

from models import User, Engine, Folder, Worksheet, Cell

class ParseError(Exception):
    """Raised when '{{{' or '}}}' is misplaced. """

class MainHandler(errors.ErrorMixin, tornado.web.RequestHandler):
    """Render default Online Lab user interface. """

    def initialize(self, debug=False):
        settings = Settings.instance()
        self.debug = debug or settings.debug

    def get(self):
        html = pygments.formatters.HtmlFormatter(nobackground=True)
        css = html.get_style_defs(arg='.highlight')

        try:
            self.render('femhub/desktop.html', debug=self.debug, extra_css=css)
        except:
            raise tornado.web.HTTPError(500)

class WebHandler(auth.DjangoMixin, cors.CORSMixin, jsonrpc.APIRequestHandler):
    """Base class for user <-> core APIs (client/async). """

    def initialize(self):
        """Setup internal configuration of this handler. """
        self.config = settings = Settings.instance()

        if not settings.cross_site:
            self.cross_site = False
        else:
            self.cross_site = True

            if settings.allow_all_origins:
                self.allowed_origins = True
            else:
                self.allowed_origins = settings.allowed_origins

    def prepare(self):
        """Prepare this handler for handling CORS requests. """
        self.prepare_for_cors()

class ClientHandler(WebHandler):
    """Handle JSON-RPC method calls from the user interface. """

    __methods__ = [
        'RPC.hello',
        'RPC.Template.render',
        'RPC.User.authenticate',
        'RPC.User.isAuthenticated',
        'RPC.User.login',
        'RPC.User.logout',
        'RPC.User.createAccount',
        'RPC.User.remindPassword',
        'RPC.User.changePassword',
        'RPC.Core.getEngines',
        'RPC.Core.getUsers',
        'RPC.Core.getPublishedWorksheets',
        'RPC.Folder.getRoot',
        'RPC.Folder.create',
        'RPC.Folder.remove',
        'RPC.Folder.rename',
        'RPC.Folder.move',
        'RPC.Folder.getFolders',
        'RPC.Folder.getWorksheets',
        'RPC.Worksheet.create',
        'RPC.Worksheet.remove',
        'RPC.Worksheet.rename',
        'RPC.Worksheet.describe',
        'RPC.Worksheet.move',
        'RPC.Worksheet.publish',
        'RPC.Worksheet.fork',
        'RPC.Worksheet.sync',
        'RPC.Worksheet.load',
        'RPC.Worksheet.save',
        'RPC.Docutils.importRST',
        'RPC.Docutils.exportRST',
        'RPC.Docutils.render',
    ]

    def RPC__hello(self):
        """Politely reply to a greeting from a client. """
        self.return_api_result({'message': 'Hi, this Online Lab!'})

    def RPC__Template__render(self, name, context=None):
        """Render a template in the given context. """
        try:
            template = self.settings['template_loader'].load(name)
        except IOError:
            self.return_api_error('template-not-found')
        else:
            if context is not  None:
                context = dict(context)
            else:
                context = {}

            context['static_url'] = self.static_url

            try:
                rendered = template.generate(**context)
            except:
                self.return_api_error('template-render-error')
            else:
                self.return_api_result({'rendered': rendered})

    @jsonrpc.authenticated
    def RPC__User__authenticate(self, password):
        """Verify a password provided by the logged-in user. """
        user = auth.authenticate(username=self.user.username, password=password)

        if user is not None:
            self.return_api_result()
        else:
            self.return_api_error('invalid-password')

    def RPC__User__isAuthenticated(self):
        """Returns ``True`` if the current user is authenticated. """
        authenticated = self.user.is_authenticated()
        self.return_api_result({'authenticated': authenticated})

    def RPC__User__login(self, username, password, remember=True):
        """Log in a user to the system using a username and password. """
        try:
            User.objects.get(username=username)
        except User.DoesNotExist:
            self.return_api_error('username')
            return

        user = auth.authenticate(username=username, password=password)

        if self.config.auth and username == 'lab':
            user = None

        if user is None:
            self.return_api_error('password')
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
    def RPC__User__changePassword(self, password):
        """Change current user's password. """
        self.user.set_password(password)
        self.user.save()

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
    def RPC__Core__getUsers(self, worksheets=False):
        """Return a list of all registered users. """
        users = []

        for user in User.objects.all():
            data = {
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
            }

            if worksheets:
                user_worksheets = []

                for worksheet in Worksheet.objects.filter(user=user, published__isnull=False):
                    user_worksheets.append({
                        'uuid': worksheet.uuid,
                        'name': worksheet.name,
                        'description': worksheet.description,
                        'created': jsonrpc.datetime(worksheet.created),
                        'modified': jsonrpc.datetime(worksheet.modified),
                        'published': jsonrpc.datetime(worksheet.published),
                        'engine': {
                            'uuid': worksheet.engine.uuid,
                            'name': worksheet.engine.name,
                        },
                    })

                data['worksheets'] = user_worksheets

            users.append(data)

        self.return_api_result({'users': users})

    def RPC__Core__getPublishedWorksheets(self):
        """
        Return a list of all published worksheets by users.

        This does not require any authentication, because all this information
        is public. This method does not (under any circumstances) return any
        private data (like emails and so on). It only returns users with
        published worksheets.

        Otherwise it is very similar to RPC.Core.getUsers().
        """
        users = []

        for user in User.objects.all():
            user_worksheets = []

            for worksheet in Worksheet.objects.filter(user=user,
                    published__isnull=False):
                user_worksheets.append({
                    'uuid': worksheet.uuid,
                    'name': worksheet.name,
                    'description': worksheet.description,
                    'created': jsonrpc.datetime(worksheet.created),
                    'modified': jsonrpc.datetime(worksheet.modified),
                    'published': jsonrpc.datetime(worksheet.published),
                    'engine': {
                        'uuid': worksheet.engine.uuid,
                        'name': worksheet.engine.name,
                    },
                })

            if len(user_worksheets) > 0:
                data = {
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'worksheets': user_worksheets,
                }
                users.append(data)

        # Sort users according to the number of published worksheets
        users.sort(key=lambda user: len(user["worksheets"]), reverse=True)

        self.return_api_result({'users': users})

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
    def RPC__Folder__getFolders(self, uuid=None, recursive=True, worksheets=False):
        """Get a list of sub-folders for the given parent ``uuid``. """
        try:
            if uuid is not None:
                parent = Folder.objects.get(user=self.user, uuid=uuid)
            else:
                parent = None
        except Folder.DoesNotExist:
            self.return_api_error('does-not-exist')
        else:
            def _get_worksheets(folder):
                """Collect all worksheets in ``folder``. """
                worksheets = []

                for worksheet in Worksheet.objects.filter(user=self.user, folder=folder):
                    worksheets.append({'uuid': worksheet.uuid, 'name': worksheet.name})

                return worksheets

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

                    if worksheets:
                        data['worksheets'] = _get_worksheets(folder)

                    folders.append(data)

                return folders

            self.return_api_result({'folders': _get_folders(parent)})

    @jsonrpc.authenticated
    def RPC__Folder__getWorksheets(self, uuid):
        """Get all worksheets from the given folder. """
        try:
            folder = Folder.objects.get(user=self.user, uuid=uuid)
        except Folder.DoesNotExist:
            self.return_api_error('does-not-exist')
        else:
            worksheets = []

            for worksheet in Worksheet.objects.filter(user=self.user, folder=folder):
                if worksheet.origin is None:
                    origin = None
                else:
                    origin = {
                        'uuid': worksheet.origin.uuid,
                        'name': worksheet.origin.name,
                        'path': worksheet.origin.folder.get_path(),
                        'user': worksheet.origin.user.username,
                    }

                worksheets.append({
                    'uuid': worksheet.uuid,
                    'name': worksheet.name,
                    'created': jsonrpc.datetime(worksheet.created),
                    'modified': jsonrpc.datetime(worksheet.modified),
                    'published': jsonrpc.datetime(worksheet.published),
                    'description': worksheet.description,
                    'engine': {
                        'uuid': worksheet.engine.uuid,
                        'name': worksheet.engine.name,
                    },
                    'origin': origin,
                })

            self.return_api_result({'worksheets': worksheets})

    @jsonrpc.authenticated
    def RPC__Worksheet__create(self, name, engine_uuid, folder_uuid):
        """Create new worksheet and add it to the given folder. """
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
                worksheet = Worksheet(user=self.user,
                    name=name, engine=engine, folder=folder)
                worksheet.save()

                self.return_api_result({'uuid': worksheet.uuid})

    @jsonrpc.authenticated
    def RPC__Worksheet__remove(self, uuid):
        """Remove a worksheet pointed by the given ``uuid``. """
        try:
            worksheet = Worksheet.objects.get(user=self.user, uuid=uuid)
        except Worksheet.DoesNotExist:
            self.return_api_error('does-not-exist')
        else:
            worksheet.delete()
            self.return_api_result()

    @jsonrpc.authenticated
    def RPC__Worksheet__rename(self, uuid, name):
        """Assign a new name to a worksheet pointed by the given ``uuid``.  """
        try:
            worksheet = Worksheet.objects.get(user=self.user, uuid=uuid)
        except Worksheet.DoesNotExist:
            self.return_api_error('does-not-exist')
        else:
            worksheet.name = name
            worksheet.save()

            self.return_api_result()

    @jsonrpc.authenticated
    def RPC__Worksheet__describe(self, uuid, description):
        """Assign a new description to a worksheet pointed by the given ``uuid``.  """
        try:
            worksheet = Worksheet.objects.get(user=self.user, uuid=uuid)
        except Worksheet.DoesNotExist:
            self.return_api_error('does-not-exist')
        else:
            worksheet.description = description
            worksheet.save()

            self.return_api_result()

    @jsonrpc.authenticated
    def RPC__Worksheet__move(self, uuid, target_uuid):
        """Move a worksheet (or worksheets) to another folder. """
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
                    worksheet = Worksheet.objects.get(user=self.user, uuid=uuid)
                except Worksheet.DoesNotExist:
                    self.return_api_error('does-not-exist')
                else:
                    worksheet.folder = target
                    worksheet.save()

            self.return_api_result()

    @jsonrpc.authenticated
    def RPC__Worksheet__publish(self, uuid):
        """Make worksheet pointed by ``uuid`` visible to others. """
        try:
            worksheet = Worksheet.objects.get(user=self.user, uuid=uuid)
        except Worksheet.DoesNotExist:
            self.return_api_error('worksheet-does-not-exist')
        else:
            if worksheet.published is not None:
                self.return_api_error('already-published')
            elif worksheet.name == 'untitled':
                self.return_api_error('choose-better-name')
            else:
                worksheet.published = datetime.now()
                worksheet.save()

                self.return_api_result()

    @jsonrpc.authenticated
    def RPC__Worksheet__fork(self, origin_uuid, folder_uuid):
        """Create an exact copy of a worksheet from an origin. """
        try:
            origin = Worksheet.objects.get(uuid=origin_uuid)
        except Worksheet.DoesNotExist:
            self.return_api_error('origin-does-not-exist')
            return

        if origin.published is None:
            self.return_api_error('origin-is-not-published')
            return

        try:
            folder = Folder.objects.get(uuid=folder_uuid)
        except Folder.DoesNotExist:
            self.return_api_error('folder-does-not-exist')
            return

        worksheet = Worksheet(
            user=self.user,
            name=origin.name,
            description=origin.description,
            engine=origin.engine,
            origin=origin,
            folder=folder)
        worksheet.save()

        order = []

        for uuid in origin.get_order():
            try:
                base = Cell.objects.get(uuid=uuid)
            except Cell.DoesNotExist:
                pass
            else:
                cell = Cell(user=self.user,
                            type=base.type,
                            parent=base.parent,
                            content=base.content,
                            worksheet=worksheet)
                order.append(cell.uuid)
                cell.save()

        worksheet.set_order(order)
        worksheet.save()

        self.return_api_result({
            'uuid': worksheet.uuid,
            'name': worksheet.name,
        })

    @jsonrpc.authenticated
    def RPC__Worksheet__sync(self, uuid, force=False):
        """Synchronize a worksheet with its origin. """
        try:
            worksheet = Worksheet.objects.get(uuid=uuid)
        except Worksheet.DoesNotExist:
            self.return_api_error('does-not-exist')
            return

        if worksheet.origin is None:
            self.return_api_error('does-not-have-origin')
            return

        if not force and worksheet.modified > worksheet.created:
            self.return_api_error('worksheet-was-modified')
            return

        Cell.objects.filter(worksheet=worksheet).delete()

        order = []

        for uuid in worksheet.origin.get_order():
            try:
                base = Cell.objects.get(uuid=uuid)
            except Cell.DoesNotExist:
                pass
            else:
                cell = Cell(user=self.user,
                            type=base.type,
                            parent=base.parent,
                            content=base.content,
                            worksheet=worksheet)
                order.append(cell.uuid)
                cell.save()

        worksheet.set_order(order)
        worksheet.save()

        self.return_api_result()

    def allowWorksheetAccess(self, worksheet):
        """Returns ``True`` if current user is allowed to load this worksheet. """
        if worksheet.published is not None:
            return True
        else:
            return self.user.is_authenticated() and worksheet.user == self.user

    def RPC__Worksheet__load(self, uuid, type=None):
        """Load cells (in order) associated with a worksheet. """
        try:
            worksheet = Worksheet.objects.get(uuid=uuid)
        except Worksheet.DoesNotExist:
            self.return_api_error('does-not-exist')
        else:
            if not self.allowWorksheetAccess(worksheet):
                self.return_api_error('permission-denied')
                return

            data, cells = {}, []

            for cell in Cell.objects.filter(worksheet=worksheet):
                if type is None or cell.type == type:
                    data[cell.uuid] = {
                        'uuid': cell.uuid,
                        'type': cell.type,
                        'content': cell.content,
                        'collapsed': cell.collapsed,
                    }

            for uuid in worksheet.get_order():
                if uuid in data:
                    cells.append(data[uuid])

            self.return_api_result({'cells': cells})

    @jsonrpc.authenticated
    def RPC__Worksheet__save(self, uuid, cells):
        """Store cells (and their order) associated with a worksheet. """
        try:
            worksheet = Worksheet.objects.get(user=self.user, uuid=uuid)
        except Worksheet.DoesNotExist:
            self.return_api_error('does-not-exist')
        else:
            order = []

            for data in cells:
                uuid = data['uuid']
                type = data['type']
                content = data['content']
                collapsed = data['collapsed']

                try:
                    cell = Cell.objects.get(user=self.user, uuid=uuid)
                except Cell.DoesNotExist:
                    cell = Cell(uuid=uuid,
                                user=self.user,
                                worksheet=worksheet,
                                type=type,
                                content=content,
                                collapsed=collapsed)
                else:
                    cell.type = type
                    cell.content = content
                    cell.collapsed = collapsed

                order.append(uuid)
                cell.save()

            worksheet.set_order(order)
            worksheet.save()

            uuids = set(order)

            for cell in Cell.objects.filter(user=self.user, worksheet=worksheet):
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
    def RPC__Docutils__importRST(self, name, rst, engine_uuid, folder_uuid):
        """Import worksheet contents from a document with Cell-RST syntax. """
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
                    worksheet = Worksheet.objects.create(user=self.user,
                        name=name, engine=engine, folder=folder)

                    order = []

                    for type, content in cells:
                        cell = Cell.objects.create(user=self.user,
                            worksheet=worksheet, content=content, type=type)
                        order.append(cell.uuid)

                    worksheet.order = ','.join(order)
                    worksheet.save()

                    self.return_api_result({'uuid': worksheet.uuid, 'count': len(cells)})

    @jsonrpc.authenticated
    def RPC__Docutils__exportRST(self, uuid):
        """Export worksheet contents to a document with Cell-RST syntax. """
        try:
            worksheet = Worksheet.objects.get(user=self.user, uuid=uuid)
        except Worksheet.DoesNotExist:
            self.return_api_error('worksheet-does-not-exist')
        else:
            rst = []

            for uuid in worksheet.get_order():
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

class AsyncHandler(WebHandler):
    """Handle message routing between clients and services. """

    __methods__ = [
        'RPC.Engine.init',
        'RPC.Engine.kill',
        'RPC.Engine.stat',
        'RPC.Engine.complete',
        'RPC.Engine.evaluate',
        'RPC.Engine.interrupt']

    def initialize(self):
        super(AsyncHandler, self).initialize()
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
                    self.return_api_error('no-services-available')
                    return
            else:
                self.return_api_error('service-disconnected')
                return

        okay = functools.partial(self.on_forward_okay, uuid)
        fail = functools.partial(self.on_forward_fail, uuid)

        proxy = jsonrpc.JSONRPCProxy(service.url, 'engine')
        proxy.call(method, params, okay, fail)

    def on_forward_okay(self, uuid, result):
        """Gets executed when remote call succeeded. """
        self.return_result(result)

    def on_forward_fail(self, uuid, error, http_code):
        """Gets executed when remote call failed. """
        self.manager.unbind(uuid)

        if http_code == 599:
            self.return_api_error('service-disconnected')
        else:
            self.return_internal_error()

    def RPC__Engine__init(self, uuid):
        """Forward 'init' method call to the assigned service. """
        self.forward(uuid, 'init', {'uuid': uuid})

    def RPC__Engine__kill(self, uuid):
        """Forward 'kill' method call to the assigned service. """
        self.forward(uuid, 'kill', {'uuid': uuid})
        self.manager.unbind(uuid)

    def RPC__Engine__stat(self, uuid):
        """Forward 'stat' method call to the assigned service. """
        self.forward(uuid, 'stat', {'uuid': uuid})

    def RPC__Engine__complete(self, uuid, source):
        """Forward 'complete' method call to the assigned service. """
        self.forward(uuid, 'complete', {'uuid': uuid, 'source': source})

    def RPC__Engine__evaluate(self, uuid, source, cellid=None):
        """Forward 'evaluate' method call to the assigned service. """
        self.forward(uuid, 'evaluate', {'uuid': uuid, 'source': source, 'cellid': cellid})

    def RPC__Engine__interrupt(self, uuid, cellid=None):
        """Forward 'interrupt' method call to the assigned service. """
        self.forward(uuid, 'interrupt', {'uuid': uuid, 'cellid': cellid})

class ServiceHandler(jsonrpc.APIRequestHandler):
    """Handle communication from Online Lab services. """

    __methods__ = ['register']

    def initialize(self):
        self.manager = services.ServiceManager().instance()

    def register(self, url, uuid, provider, description):
        """Process registration request from a service. """
        self.manager.add_service(url, uuid, provider, description)
        self.return_result()

