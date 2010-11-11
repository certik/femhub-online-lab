
Ext.BLANK_IMAGE_URL = "/static/external/ext/images/default/s.gif";

Ext.WindowMgr.zseed = 10000;

Ext.Ajax.timeout = null;

// TODO: make this at least a bit cross-browser compatible (huh)

Ext.apply(Ext.EventObjectImpl.prototype, {
    ';':  59, ':':  59,
    '=':  61, '+':  61,
    '-': 109, '_': 109,
    ',': 188, '<': 188,
    '.': 190, '>': 190,
    '/': 191, '?': 191,
    '`': 192, '~': 192,
    '[': 219, '{': 219,
    ']': 221, '}': 221,
    "'": 222, '"': 222,
});

