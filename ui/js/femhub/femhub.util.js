
FEMhub.util = {};

FEMhub.util.isValidName = function(name) {
    var len = name.trim().length;
    return len > 0 && len < 100;
};

FEMhub.util.hasArg = function(args, arg) {
    return Ext.isDefined(args) && Ext.isDefined(args[arg]);
};

FEMhub.util.unique = function() {
    return (new Date()).getTime() + Math.random().toString().substr(2, 8);
};

FEMhub.util.rfc = {};

FEMhub.util.rfc.UUID = function() {
    var i, uuid = [], hex = '0123456789ABCDEF';

    for (i = 0; i < 36; i++) {
        uuid[i] = Math.floor(0x10*Math.random());
    }

    uuid[14] = 4;
    uuid[19] = (uuid[19] & 0x3) | 0x8;

    for (i = 0; i < 36; i++) {
        uuid[i] = hex[uuid[i]];
    }

    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';

    return uuid.join('');
};

FEMhub.util.UUID = function() {
    return FEMhub.util.rfc.UUID().replace(/-/g, '');
};

FEMhub.util.capitalizeFirst = function(str) {
    return !str ? str : str.charAt(0).toUpperCase() + str.slice(1);
};

FEMhub.util.eachPair = function(obj, handler, scope) {
    var index = 0;

    for (var key in obj) {
        handler.call(scope || window, key, obj[key], index++, obj);
    }
};

Function.prototype.partial = Function.prototype.createDelegate;

FEMhub.util.getWindowXY = function(config) {
    var view = config.view || {
        width: window.innerWidth,
        height: window.innerHeight,
    };

    var width = config.width;
    var height = config.height;

    var x = config.x || ((view.width - width)/2);
    var y = config.y || ((view.height - height)/2);

    var manager = config.manager || Ext.WindowMgr;

    var windows = [];

    manager.each(function(window) {
        if (!window.hidden) {
            windows.push(window);
        }
    });

    function overlaps(x, y) {
        for (var i in windows) {
            var window = windows[i];

            if (window.x == x && window.y == y) {
                windows.splice(i, 1);
                return true;
            }
        }

        return false;
    }

    while (true) {
        if (overlaps(x, y)) {
            x += 20;
            y += 20;
        } else {
            break;
        }
    }

    return {x: x, y: y};
};

Array.prototype.contains = function(elt) {
    for (var i in this) {
        if (this[i] === elt) {
            return true;
        }
    }

    return false;
};

FEMhub.util.ignore = function(obj, ignores) {
    var result = {}, key, i;

    if (!Ext.isArray(ignores)) {
        ignores = [ignores];
    }

    for (key in obj) {
        if (!ignores.contains(key)) {
            result[key] = obj[key];
        }
    }

    return result;
};

FEMhub.util.ago = function(date) {
    var msec = date.getElapsed();

    if (msec < 60000) {
        return 'just now';
    }

    var minutes = Math.floor(msec/60000);

    if (minutes < 60) {
        if (minutes === 1) {
            return '1 minute ago';
        } else {
            return minutes + ' minutes ago';
        }
    }

    var hours = Math.floor(minutes/60);

    if (hours < 24) {
        if (hours === 1) {
            return '1 hour ago';
        } else {
            return hours + ' hours ago';
        }
    }

    var days = Math.floor(hours/24);

    if (days < 8) {
        if (days === 1) {
            return '1 day ago';
        } else {
            return days + ' days ago';
        }
    }

    return date.format('F d, Y');
};

