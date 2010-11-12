
FEMhub.RPC = {};

FEMhub.RPC.ajax = function(config) {
    config = config || {};

    if (config.cors === true) {
        FEMhub.RPC.cors(config);
    } else {
        if (Ext.isDefined(config.data)) {
            config.jsonData = config.data;
            config.data = undefined;
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

    xhr.setRequestHeader('Content-Type', 'application/json');

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
    var done = 0;

    Ext.each(FEMhub.urls, function(url, index) {
        FEMhub.RPC.ajax({
            url: url,
            cors: FEMhub.cors,
            method: 'POST',
            data: Ext.encode({
                jsonrpc: '2.0',
                method: 'system.describe',
                params: {},
                id: 0,
            }),
            success: function(result, evt) {
                result = Ext.decode(result.responseText).result;

                Ext.each(result.procs, function(proc) {
                    var items = proc.name.split(".");
                    var namespace = FEMhub;

                    Ext.each(items, function(item, i) {
                        if (i == items.length - 1) {
                            if (!Ext.isDefined(namespace[item])) {
                                namespace[item] = function(params, handler, handler_scope) {
                                    return FEMhub.RPC.call(url, proc.name, params, handler, handler_scope);
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

                if (++done === FEMhub.urls.length) {
                    ready.call(scope || window);
                }
            },
            failure: FEMhub.RPC.failure,
        });
    });
};

FEMhub.RPC.call = function(url, method, params, handler, scope) {
    var config = {}, okay, fail, start, end, ret, sscope;

    if (Ext.isObject(handler)) {
        config = handler;

        if (Ext.isFunction(config.handler)) {
            handler = config.handler;
        } else {
            handler = undefined;

            if (Ext.isFunction(config.okay)) {
                okay = config.okay;
            }

            if (Ext.isDefined(config.fail)) {
                fail = config.fail;
            }
        }

        if (Ext.isDefined(config.scope)) {
            scope = config.scope;
        }

        if (Ext.isDefined(config.status)) {
            var status = config.status, statusbar;

            if (Ext.isObject(status)) {
                if (Ext.isDefined(status.statusbar)) {
                    statusbar = status.statusbar;
                } else {
                    statusbar = status;
                }

                if (statusbar instanceof FEMhub.Statusbar) {
                    start = function() {
                        return statusbar.showBusy();
                    };

                    end = function(ok, id) {
                        statusbar.clearBusy(id);
                    };
                } else {
                    if (Ext.isFunction(status.start)) {
                        start = status.start;
                    }

                    if (Ext.isFunction(status.end)) {
                        end = status.end;
                    }

                    sscope = status.scope;
                }
            } else if (Ext.isFunction(status)) {
                start = status;
            }
        }
    }

    if (!Ext.isDefined(scope)) {
        scope = window;
    }

    if (!Ext.isDefined(sscope)) {
        sscope = scope;
    }

    if (Ext.isDefined(start)) {
        ret = start.call(sscope);

        if (!end && Ext.isFunction(ret)) {
            end = ret;
        }
    }

    FEMhub.RPC.ajax({
        url: url,
        cors: FEMhub.cors,
        method: 'POST',
        data: Ext.encode({
            jsonrpc: '2.0',
            method: method,
            params: params || {},
            id: 0,
        }),
        success: function(result, evt) {
            if (Ext.isDefined(end)) {
                end.call(sscope, true, ret);
            }

            result = Ext.decode(result.responseText).result;

            if (Ext.isDefined(handler)) {
                handler.call(scope, result);
            } else {
                if (result.ok === true) {
                    if (Ext.isDefined(okay)) {
                        okay.call(scope, result);
                    }
                } else {
                    if (Ext.isDefined(fail)) {
                        if (Ext.isFunction(fail)) {
                            fail.call(scope, result.reason, result);
                        } else {
                            var errors, title;

                            if (Ext.isDefined(fail.errors)) {
                                errors = fail.errors;
                                title = fail.title;
                            } else {
                                errors = fail;
                                title = 'Error';
                            }

                            var msg = errors[result.reason];

                            if (!msg && fail.handler) {
                                fail.handler.call(fail.scope || scope, result.reason, result);
                            } else {
                                FEMhub.msg.error(title, msg || result.reason);
                            }
                        }
                    }
                }
            }
        },
        failure: function(result, evt) {
            if (Ext.isDefined(end)) {
                end.call(sscope, false, ret);
            }

            FEMhub.RPC.failure(result, evt);
        },
    });
};

FEMhub.RPC.failure = function(result, evt) {
    var msg;

    if (!result.responseText || result.status >= 500) {
        if (result.status > 0) {
            msg = String.format("{0}: {1}", result.status, result.statusText);
        } else {
            try {
                if (!result.statusText || result.statusText === 'OK') {
                    msg = "communication failed";
                } else {
                    msg = result.statusText;
                }
            } catch (err) {
                msg = "communication failed";
            }
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

