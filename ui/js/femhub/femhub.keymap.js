
FEMhub.KeyMap = Ext.extend(Ext.KeyMap, {
    addBinding: function(config) {
        if (Ext.isArray(config)) {
            Ext.each(config, function(c) {
                this.addBinding(c);
            }, this);
            return;
        }

        var keyCode = config.key,
            fn = config.fn || config.handler,
            scope = config.scope;

        if (typeof keyCode == "string") {
            var ks = [];
            var keyString = keyCode.toUpperCase();
            for(var j = 0, len = keyString.length; j < len; j++) {
                ks.push(keyString.charCodeAt(j));
            }
            keyCode = ks;
        }

        var keyArray = Ext.isArray(keyCode);
        var stopEvent = config.stopEvent;

        var handler = function(e) {
            if (this.checkModifiers(config, e)) {
                var k = e.getKey();
                if (keyArray) {
                    for (var i = 0, len = keyCode.length; i < len; i++) {
                        if (keyCode[i] == k) {
                          if (stopEvent) {
                              e.stopEvent();
                          }
                          fn.call(scope || window, k, e);
                          return;
                        }
                    }
                } else {
                    if (k == keyCode) {
                        if (stopEvent) {
                           e.stopEvent();
                        }
                        fn.call(scope || window, k, e);
                    }
                }
            }
        };

        this.bindings.push(handler);
    },
});

