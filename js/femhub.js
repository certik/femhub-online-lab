
Ext.BLANK_IMAGE_URL = "/static/external/ext/images/default/s.gif";

Codenode = {
    version: [0, 0, 1],
    json: "/json/",
    icons: "/static/img/icons/",
};

Codenode.init = function(ready) {
    var namespace = Codenode;

    Ext.Ajax.request({
        url: Codenode.json,
        method: "POST",
        params: Ext.encode({
            jsonrpc: "2.0",
            method: "system.describe",
            params: {},
            id: 0,
        }),
        success: function(result, request) {
            var response = Ext.decode(result.responseText);

            Ext.each(response.result.procs, function(proc) {
                var items = proc.name.split(".");
                var namespace = Codenode;

                Ext.each(items, function(item, i) {
                    if (i == items.length - 1) {
                        if (!Ext.isDefined(namespace[item])) {
                            namespace[item] = function(params, handler) {
                                return Codenode.call(proc.name, params, handler);
                            }
                        } else {
                            Codenode.log("'" + item + "' method name already in use");
                        }
                    } else {
                        if (!Ext.isDefined(namespace[item])) {
                            namespace = namespace[item] = {};
                        } else {
                            namespace = namespace[item];
                        }
                    }
                });
            });

            ready();
        },
        failure: function(result, request) {
            Codenode.log(Ext.decode(result.responseText).error.message);
        },
    });
}

Codenode.call = function(method, params, handler) {
    Ext.Ajax.request({
        url: Codenode.json,
        method: "POST",
        params: Ext.encode({
            jsonrpc: "2.0",
            method: method,
            params: params,
            id: 0,
        }),
        success: function(result, request) {
            handler(Ext.decode(result.responseText).result);
        },
        failure: function(result, request) {
            Codenode.log(Ext.decode(result.responseText).error.message);
        },
    });
}

Codenode.log = function(text) {
    Ext.getBody().createChild({tag: 'h1', html: text});
}

Codenode.unique = function() {
    return (new Date()).getTime() + Math.random().toString().substr(2, 8);
}

