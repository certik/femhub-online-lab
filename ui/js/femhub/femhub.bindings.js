
FEMhub.Bindings = Ext.extend(Ext.util.Observable, {
    keymap: null,

    constructor: function(config) {
        FEMhub.Bindings.superclass.constructor.call(this, config);

        this.keymap = new Ext.KeyMap(document);

        for (var mapping in FEMhub.Mappings) {
            var obj = new FEMhub.Mappings[mapping]();

            for (var binding in obj.bindings) {
                var data = obj.bindings[binding];

                this.keymap.addBinding(Ext.apply(data, {
                    handler: this.handler.createDelegate(this, [obj.xtype, data.action]),
                    scope: this,
                }));
            }
        }
    },

    destroy: function() {
        if (this.keymap) {
            this.keymap.disable();
        }
    },

    getActive: function() {
        var active = Ext.WindowMgr.getActive();

        if (active === null) {
            var desktop = FEMhub.getDesktop();

            if (desktop !== null) {
                active = desktop.getGroup().getActive();

                if (active === null) {
                    active = desktop;
                }
            } else {
                active = null;
            }
        }

        return active;
    },

    handler: function(xtype, action, key, evt) {
        var active = this.getActive();

        if (active !== null && active.getXType() == xtype) {
            if (Ext.isFunction(action)) {
                action(active, key, evt);
            } else {
                var method = active[action];

                if (Ext.isDefined(method)) {
                    method.call(active, key, evt);
                } else {
                    active.execAction(action, key, evt);
                }
            }
        }
    },
});

FEMhub.Mapping = Ext.extend(Ext.util.Observable, {
    xtype: null,
    bindings: {},

    constructor: function(config) {
        FEMhub.Mapping.superclass.constructor.call(this, config);

        for (var binding in this.bindings) {
            var components = binding.split(/\s+/);

            var key = components[0].toUpperCase();
            var modifiers = components.slice(1);

            var action = this.bindings[binding];

            var data = {
                key: Ext.EventObject[key] || key,
                action: action,
            };

            Ext.each(modifiers, function(modifier) {
                data[modifier.slice(1)] = (modifier[0] == '+');
            }, this);

            this.bindings[binding] = data;
        }
    },
});

FEMhub.Mappings = {}; // global namespace of Online Lab key mappings

