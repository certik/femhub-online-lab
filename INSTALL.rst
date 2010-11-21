
Installing Online Lab
=====================

Currently Online Lab is available only from its ``git`` repository
hosted at GitHub. To get a copy of this repository, issue::

    $ git clone git://github.com/hpfem/femhub-online-lab.git

or, alternatively::

    $ git clone http://git.hpfem.org/git/femhub-online-lab.git

to clone via HTTP protocol (in case of e.g. firewall issues).

Prerequisites
=============

Online Lab runs under any Unix-like operating system that implements
non-blocking polling functionality, e.g. ``epoll`` (Linux), ``kqueue``
(BSD) or ``select`` (universal, worst case scenario). To obtain best
performance, Linux operating system distribution with ``epoll`` support
should be used (kernel 2.6 or better is required).

The required packages for Online Lab are:

* Python >= 2.6 (http://www.python.org)
* Tornado >= 1.1 (http://www.tornadoweb.org)
* Django >= 1.1 (http://www.djangoproject.com)

and smaller, but not less important, are:

* pyinotify (http://github.com/seb-m/pyinotify)
* argparse (http://code.google.com/p/argparse)
* lockfile (http://pypi.python.org/pypi/lockfile)
* daemon (http://pypi.python.org/pypi/python-daemon)
* psutil (http://code.google.com/p/psutil)
* pycurl (http://pycurl.sourceforge.net)
* docutils (http://docutils.sourceforge.net)

For example, in Ubuntu Lucid issue::

    $ sudo apt-get install python python-django python-pyinotify python-argparse python-lockfile python-daemon python-psutil python-pycurl python-docutils python-pygments

to get those packages installed. Note that Tornado didn't manage to get
into software package management systems yet (e.g. apt-get or portage),
so you have to install it manually, either by downloading its source
code tarball from Tornado's website::

    $ wget http://github.com/downloads/facebook/tornado/tornado-1.1.tar.gz

or by cloning its ``git`` repository that is hosted at GitHub. Make sure
that all required packages are available on ``PYTHONPATH`` before running
Online Lab.

If you use Python 2.7 or better, then you don't need to install argparse
module, because it is included in Python standard library since 2.7 (see
PEP 389 for details).

You can also run Online Lab in FEMhub numerical software distribution,
where all necessary packages were included in appropriate versions,
together with Online Lab it self.

Setting up Online Lab
=====================

Suppose Online Lab's repository was cloned into ``/home/lab``::

    $ cd /home/lab/femhub-online-lab

We have to create two work environments, one for Online Lab core server
and the other for Online Lab services::

    $ bin/onlinelab core init --home=../core-home --ui-path=ui
    $ bin/onlinelab service init --home=../service-home

``onlinelab`` script automatically adds current directory to ``PYTHONPATH``
so you don't have to worry about module visibility issues. The directories
with work environments will contain some configuration files and additional
subdirectories for storing runtime data (logs, PID files, blobs, etc.). In
the case of the core server, a database is also created and user interface
(UI) is set up.

Running Online Lab
==================

Now open two terminals in parallel and run the following commands::

    $ bin/onlinelab core start --no-daemon --home=../core-home
    $ bin/onlinelab service start --no-daemon --home=../service-home

These will start two servers listening on localhost (8000, 9000). Now
go to your browser (preferably Firefox or Chrome) and redirect to::

    http://localhost:8000

Login screen will appear, where you can create an account and finally
proceed to Online Lab's desktop. Click 'Help' icon to show a tutorial
about main features of the system.

If you are not interested in watching the output from Online Lab, the
you may consider running both core server and services as daemons
(just remove ``--no-daemon`` from the commands above). In this case,
you still will be able to read the logs that are stored in Online Lab
home directories.

To stop Online Lab simply press ``Ctrl+C`` in terminals in which
core and services are running. In daemon mode use the following
commands::

    $ bin/onlinelab core stop --home=../core-home
    $ bin/onlinelab service stop --home=../service-home

Note that the order of running servers is relevant and core server
must be started before services are started. However, stopping can
done in any order.

Extending PYTHONPATH
====================

If you have auxiliary Python modules that you would like to expose in
Online Lab (e.g. SymPy) and those modules aren't available on system-wide
``PYTHONPATH`` for some reason (e.g. you would like to expose a certain
branch of a development repository), then add paths to those modules via
``--python-path`` command-line option, e.g.::

    $ bin/onlinelab service start --python-path=/devel/sympy

assuming that SymPy's module is located in ``/devel/sympy``. You can also
use colon-syntax to add multiple paths::

    $ bin/onlinelab service start --python-path=/devel/sympy:../numpy

You can also add multiple ``--python-path`` options and/or store them in
services' configuration files.

Installing Mesh Editor
======================

To install Mesh Editor (Flex) in Online Lab, clone its repository:

    http://github.com/hpfem/mesheditor-flex

and follow its build instructions (see README). Next copy ``MeshEditor.swf``
into ``static/external`` in core server's home directory, e.g.::

    $ cp MeshEditor.swf /home/lab/core-home/static/external

and reload Online Lab user interface in your web browser. Next time you
double-click Mesh Editor icon on the desktop, the plug-in will be loaded.

Importing Sage worksheets
========================

Go to http://localhost:8000, open Browser and click 'Import'. Copy
plain text from Sage worksheet, e.g.::

    {{{id=0|
    some code
    ///
    output
    }}}

and click 'OK'. A new window will appear with all cells imported.

