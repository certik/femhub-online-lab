"""
This example uses the JSONRPCService to access the onlinelab and then uses
matplotlib to plot an image and retrieve it back and saves it to a png image.

Usage::

    $ python examples/plot_example.py
    Plot saved to plot.png

"""

from uuid import uuid4
from base64 import b64decode

from onlinelab.console.jsonrpc import JSONRPCService

filename = "plot.png"
mpl_script = """\
from pylab import frange, figure, plot, axhline, legend, pi, sin, cos

x = frange(0, 2*pi, npts=100)
figure()
plot(x,sin(x),linewidth=10, color='black',label='zorder=10',zorder = 10)
plot(x,cos(1.3*x),linewidth=10, color='red', label='zorder=1',zorder = 1)
plot(x,sin(2.1*x),linewidth=10, color='green', label='zorder=3',zorder = 3)
axhline(0,linewidth=10, color='blue', label='zorder=2',zorder = 2)
l = legend()
l.set_zorder(20)
"""

def evaluate(cmd):
    out = s.evaluate(uuid, cmd)
    if out.get("traceback", False):
        print "Remote traceback:"
        print out["traceback"]
        raise Exception("evaluate() failed")
    return out


s = JSONRPCService("http://lab.femhub.org/async")
uuid = uuid4().hex
s.init(uuid)
try:
    evaluate("from pylab import plot")
    evaluate(mpl_script)
    out = evaluate("show()")
finally:
    s.kill(uuid)
data = out["plots"][0]["data"]
d = b64decode(data)
open(filename, "w").write(d)
print "Plot saved to", filename
