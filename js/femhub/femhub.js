
Ext.BLANK_IMAGE_URL = "/static/external/ext/images/default/s.gif";

FEMhub = {
    version: [0, 0, 1],
    json: "/json/",
    icons: "/static/img/icons/",
};

FEMhub.init = function(ready) {
    var namespace = FEMhub;

    Ext.Ajax.request({
        url: FEMhub.json,
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
                var namespace = FEMhub;

                Ext.each(items, function(item, i) {
                    if (i == items.length - 1) {
                        if (!Ext.isDefined(namespace[item])) {
                            namespace[item] = function(params, handler) {
                                return FEMhub.call(proc.name, params, handler);
                            }
                        } else {
                            FEMhub.log("'" + item + "' method name already in use");
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
            FEMhub.log(Ext.decode(result.responseText).error.message);
        },
    });
}

FEMhub.call = function(method, params, handler) {
    Ext.Ajax.request({
        url: FEMhub.json,
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
            FEMhub.log(Ext.decode(result.responseText).error.message);
        },
    });
}

FEMhub.log = function(text) {
    Ext.getBody().createChild({tag: 'h1', html: text});
}

FEMhub.unique = function() {
    return (new Date()).getTime() + Math.random().toString().substr(2, 8);
}
