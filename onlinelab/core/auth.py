"""Django-based session and user management. """

from datetime import datetime, timedelta
from django.contrib import auth

from ..utils.settings import Settings

SESSION_COOKIE = 'sessionid'

authenticate = auth.authenticate

class DjangoMixin(object):
    """Implementation of Django-based session and user management. """

    @property
    def current_session(self):
        """The current session for this request. """
        if not hasattr(self, '_current_session'):
            self._current_session = self.get_current_session()
        return self._current_session

    def get_current_session(self):
        """Session management using database backend. """
        from django.contrib.sessions.backends.db import SessionStore
        return SessionStore(self.get_cookie(SESSION_COOKIE))

    def get_current_user(self):
        """Get the current user using session data. """
        session, user = self.current_session, None

        try:
            user_id = session[auth.SESSION_KEY]
            backend_path = session[auth.BACKEND_SESSION_KEY]
            backend = auth.load_backend(backend_path)
            user = backend.get_user(user_id)
        except KeyError:
            pass

        if user is None:
            from django.contrib.auth import models

            if Settings.instance().auth:
                user = models.AnonymousUser()
            else:
                try:
                    user = models.User.objects.get(username='lab')
                except models.User.DoesNotExist:
                    user = models.User(username='lab')
                    user.set_password('')
                    user.save()

        return user

    @property
    def session(self):
        """Lets conform to Django API. """
        return self.current_session

    @property
    def user(self):
        """Lets conform to Django API. """
        return self.current_user

    def login(self, user=None):
        """Store user ID and other data in the HTTP request. """
        if user is None:
            user = self.user

        user.last_login = datetime.now()
        user.save()

        session = self.current_session

        if auth.SESSION_KEY in session:
            if session[auth.SESSION_KEY] != user.id:
                session.flush()
        else:
            session.cycle_key()

        session[auth.SESSION_KEY] = user.id
        session[auth.BACKEND_SESSION_KEY] = user.backend

        self._current_user = user

    def logout(self):
        """Remove user's ID form the request and flush session data. """
        from django.contrib.auth import models
        self._current_user = models.AnonymousUser()
        self.session.flush()

    def _before_finish(self):
        """Save session data and update cookie with session ID. """
        if hasattr(self, '_current_session'):
            session = self.current_session

            try:
                modified = session.modified
            except AttributeError:
                pass
            else:
                if modified:
                    if session.get_expire_at_browser_close():
                        max_age = None
                        expires = None
                    else:
                        max_age = session.get_expiry_age()
                        expires = datetime.utcnow() + timedelta(seconds=max_age)

                    session.save()

                    self.set_cookie(SESSION_COOKIE, session.session_key,
                        expires=expires, **{'max-age': max_age})

