"""Entry point for Online Lab services. """

from runtime import main

def init(args):
    """Initialize a new service. """
    raise NotImplementedError("'init' is not implemented yet")

def start(args):
    """Start an existing service. """
    main(args)

def stop(args):
    """Stop a running service. """
    raise NotImplementedError("'stop' is not implemented yet")

def restart(args):
    """Restart a running service. """
    raise NotImplementedError("'restart' is not implemented yet")

def status(args):
    """Display information about a service. """
    raise NotImplementedError("'status' is not implemented yet")

