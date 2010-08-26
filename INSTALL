
Online Lab prerequisites
========================

The required packages for Online Lab are:

* Twisted >= 9.0
* Django >= 1.0
* simplejson

For example, in Ubuntu Lucid issue::

    $ sudo apt-get install python-django
    $ sudo apt-get install python-twisted
    $ sudo apt-get install python-simplejson

Make sure that ``python-twisted-runner`` is also installed.

Installing Online Lab
=====================

The following steps will allow you to install Online Lab from GIT::

    $ mkdir online-lab
    $ cd online-lab

    $ mkdir bin base root home

    $ cd base

    $ git clone git://github.com/hpfem/femhub-online-lab.git
    $ git clone git://github.com/hpfem/codenode-unr.git

    $ cd codenode-unr
    $ bin/link-online-lab-ui ../femhub-online-lab

If you plan on developing Online Lab then follow the steps below::

    $ echo "codenode/frontend/static/css/femhub" >> .git/info/exclude
    $ echo "codenode/frontend/static/external/ext" >> .git/info/exclude
    $ echo "codenode/frontend/static/img/femhub" >> .git/info/exclude
    $ echo "codenode/frontend/static/js/femhub" >> .git/info/exclude

Now you have to create an environment in which Online Lab will run::

    $ cd ../..
    $ cp base/codenode-unr/scripts/* bin/

    $ bin/init

If you plan on any customisations then adjust ``bin/defs`` first, before
running ``bin/init``, e.g. when multiple backends are required.

To adjust backend's settings (e.g. port, host), edit::

    backend/settings.py

To adjust frontend's settings (e.g. port, debug), edit::

    frontend/settings.py

If you run ``tree`` on the current directory then you will see that many
files and directories, especially static files, are links to Online Lab's
source repositories in ``online-lab/base``. This way, whenever you modify
Online Lab, you don't have to update or recreate ``online-lab/root``.

If you plan on publishing your installation of Online Lab outside your
machine, then make sure that ``DEBUG`` option in frontend's settings is
set to ``False``. Otherwise, any error like 404 will print a stack trace
with important system configuration to the client instead of the default
404 page.

If you want to checkout the database then issue the following commands::

    $ cd root/data
    $ sqlite3 codenode.db

This will be handy, e.g. if you would like to setup multiple backends.

Running Online Lab
==================

Now open two terminals in parallel and run the following commands::

    $ bin/run-backend
    $ bin/run-frontend

These will start two servers listening on localhost (9337, 9000). Now
go to your browser (preferably Firefox or Chrome) and redirect to::

    http://localhost:9000

Login screen will appear, where you can create an account and finally
proceed to Online Lab's desktop. Click 'Help' icon to show a tutorial
about main features of the systems.

If you are not interested in watching the output from Online Lab, the
you may consider running both backend and frontend servers as daemons
(just add ``-daemon`` to the commands above). In this case, you still
will be able to read the logs in ``online-lab/root``.

To stop Online Lab simply press ``Ctrl+C`` in terminals in which
backend and frontend servers are running. In daemon mode use the
following commands::

    $ bin/stop-backend
    $ bin/stop-frontend

Note that order of running and stopping servers is irrelevant.

Importing Sage notebooks
========================

Go to http://localhost:9000/femhub and click 'Import'. Copy plain
text from Sage notebook, e.g.::

    {{{id=0|
    some code
    ///
    output
    }}}

and click 'OK'. A new window will appear with all cells imported.

