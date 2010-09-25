"""Entry point for Online Lab core. """

from runtime import main

def init(args):
    """Initialize a new core server. """
    raise NotImplementedError("'init' is not implemented yet")

def start(args):
    """Start an existing core server. """
    main(args)

def stop(args):
    """Stop a running core server. """
    raise NotImplementedError("'stop' is not implemented yet")

def restart(args):
    """Restart a running core server. """
    raise NotImplementedError("'restart' is not implemented yet")

def status(args):
    """Display information about a core server. """
    raise NotImplementedError("'status' is not implemented yet")

