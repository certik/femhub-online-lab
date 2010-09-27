
FEMhub.RPC = {};

FEMhub.RPC.init = function(ready, scope) {
    var namespace = FEMhub;

    Ext.Ajax.request({
        url: FEMhub.json,
        method: "POST",
        jsonData: Ext.encode({
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
                            namespace[item] = function(params, handler, handler_scope) {
                                return FEMhub.RPC.call(proc.name, params, handler, handler_scope);
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

            ready.call(scope || this);
        },
        failure: function(result, request) {
            FEMhub.log(Ext.decode(result.responseText).error.message);
        },
    });
}

FEMhub.RPC.call = function(method, params, handler, scope, url) {
    Ext.Ajax.request({
        url: url || FEMhub.json,
        method: "POST",
        jsonData: Ext.encode({
            jsonrpc: "2.0",
            method: method,
            params: params || {},
            id: 0,
        }),
        success: function(result, request) {
            if (Ext.isDefined(handler)) {
                handler.call(scope || this, Ext.decode(result.responseText).result);
            }
        },
        failure: function(result, request) {
            if (Ext.isDefined(result.responseText)) {
                var msg = Ext.decode(result.responseText).error.message;
            } else {
                var msg = "Internal Server Error (500)";
            }

            FEMhub.log(msg);

            Ext.MessageBox.show({
                title: 'Critical Error',
                msg: msg,
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.ERROR,
            });
        },
    });
}

FEMhub.RPC.Engine = {};

FEMhub.RPC.Engine.init = function(params, handler, scope) {
    FEMhub.RPC.call('init', params, handler, scope, FEMhub.async);
}

FEMhub.RPC.Engine.kill = function(params, handler, scope) {
    FEMhub.RPC.call('kill', params, handler, scope, FEMhub.async);
}

FEMhub.RPC.Engine.stat = function(params, handler, scope) {
    FEMhub.RPC.call('stat', params, handler, scope, FEMhub.async);
}

FEMhub.RPC.Engine.evaluate = function(params, handler, scope) {
    FEMhub.RPC.call('evaluate', params, handler, scope, FEMhub.async);
}

FEMhub.RPC.Engine.interrupt = function(params, handler, scope) {
    FEMhub.RPC.call('interrupt', params, handler, scope, FEMhub.async);
}

