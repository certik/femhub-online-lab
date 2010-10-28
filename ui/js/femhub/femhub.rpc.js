
FEMhub.RPC = {};

FEMhub.RPC.ajax = function(config) {
    config = config || {};

    if (config.cors === true) {
        FEMhub.RPC.cors(config);
    } else {
        if (Ext.isDefined(config.data)) {
            config.jsonData = config.data;
        }

        Ext.Ajax.request(config);
    }
};

FEMhub.RPC.cors = function(config) {
    config = config || {};

    if (!Ext.isDefined(XMLHttpRequest)) {
        FEMhub.msg.critical("Your web browser is obsolete. Upgrade it to run Online Lab.");
        return;
    }

    var xhr = new XMLHttpRequest();

    if (!("withCredentials" in xhr)) {
        FEMhub.msg.critical("Your web browser doesn't support authorized cross-site requests.");
        return;
    }

    xhr.open(config.method, config.url, true);
    xhr.withCredentials = "true";

    xhr.onload = function(evt) {
        if (this.status >= 200 && this.status < 300) {
            if (Ext.isDefined(config.success)) {
                config.success.call(config.scope || this, xhr);
            }
        } else {
            if (Ext.isDefined(config.failure)) {
                config.failure.call(config.scope || this, xhr);
            }
        }
    };

    xhr.onerror = xhr.onabort = function(evt) {
        if (Ext.isDefined(config.failure)) {
            config.failure.call(config.scope || this, xhr);
        }
    };

    xhr.send(config.data || null);
};

FEMhub.RPC.init = function(ready, scope) {
    FEMhub.RPC.ajax({
        url: FEMhub.client,
        cors: FEMhub.cors,
        method: "POST",
        data: Ext.encode({
            jsonrpc: "2.0",
            method: "system.describe",
            params: {},
            id: 0,
        }),
        success: function(result, evt) {
            var response = Ext.decode(result.responseText);

            Ext.each(response.result.procs, function(proc) {
                var items = proc.name.split(".");
                var namespace = FEMhub;

                Ext.each(items, function(item, i) {
                    if (i == items.length - 1) {
                        if (!Ext.isDefined(namespace[item])) {
                            namespace[item] = function(params, handler, handler_scope) {
                                return FEMhub.RPC.call(proc.name, params, handler, handler_scope);
                            };
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
        failure: FEMhub.RPC.failure,
    });
};

FEMhub.RPC.call = function(method, params, handler, scope, url, cors) {
    FEMhub.RPC.ajax({
        url: url || FEMhub.client,
        cors: cors || FEMhub.cors,
        method: "POST",
        data: Ext.encode({
            jsonrpc: "2.0",
            method: method,
            params: params || {},
            id: 0,
        }),
        success: function(result, evt) {
            if (Ext.isDefined(handler)) {
                handler.call(scope || this, Ext.decode(result.responseText).result);
            }
        },
        failure: FEMhub.RPC.failure,
    });
};

FEMhub.RPC.failure = function(result, evt) {
    var msg;

    if (!result.responseText || result.status >= 500) {
        if (result.status > 0) {
            msg = String.format("{0}: {1}", result.status, result.statusText);
        } else {
            msg = result.statusText || "communication failed";
        }

        if (FEMhub.verbose) {
            FEMhub.msg.critical(msg);
        } else {
            FEMhub.log(msg);
        }
    } else {
        var response = Ext.decode(result.responseText);

        if (response.error) {
            msg = String.format("{0}: {1}", response.error.code, response.error.message);
        } else {
            msg = result.statusText;
        }

        FEMhub.msg.error("System Error", msg);
    }
};

FEMhub.RPC.Engine = {};

FEMhub.RPC.Engine.init = function(params, handler, scope) {
    FEMhub.RPC.call('init', params, handler, scope, FEMhub.async);
};

FEMhub.RPC.Engine.kill = function(params, handler, scope) {
    FEMhub.RPC.call('kill', params, handler, scope, FEMhub.async);
};

FEMhub.RPC.Engine.stat = function(params, handler, scope) {
    FEMhub.RPC.call('stat', params, handler, scope, FEMhub.async);
};

FEMhub.RPC.Engine.complete = function(params, handler, scope) {
    FEMhub.RPC.call('complete', params, handler, scope, FEMhub.async);
};

FEMhub.RPC.Engine.evaluate = function(params, handler, scope) {
    FEMhub.RPC.call('evaluate', params, handler, scope, FEMhub.async);
};

FEMhub.RPC.Engine.interrupt = function(params, handler, scope) {
    FEMhub.RPC.call('interrupt', params, handler, scope, FEMhub.async);
};

