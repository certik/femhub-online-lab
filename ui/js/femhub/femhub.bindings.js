
FEMhub.Bindings = Ext.extend(Ext.util.Observable, {
    keymap: null,

    constructor: function(config) {
        FEMhub.Bindings.superclass.constructor.call(this, config);

        this.keymap = new FEMhub.KeyMap(document);

        for (var mapping in FEMhub.Mappings) {
            var obj = new FEMhub.Mappings[mapping]();

            FEMhub.Bindings[mapping] = obj;

            FEMhub.util.eachPair(obj.bindings, function(action, data) {
                Ext.each(data.specs, function(spec) {
                    this.keymap.addBinding(Ext.apply(spec, {
                        handler: this.handler.createDelegate(this, [obj, action, data, spec], 0),
                        scope: this,
                    }));
                }, this);
            }, this);
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

    handler: function(bindings, action, data, spec, key, evt) {
        var active = this.getActive();

        function getActiveBindings() {
            try {
                return active.getBindings();
            } catch (err) {
                return null;
            }
        }

        if (bindings.global || (active !== null && getActiveBindings() === bindings)) {
            var params = data.params || {};

            if (spec.stop === true) {
                evt.stopEvent();
            }

            if (Ext.isDefined(data.handler)) {
                data.handler.call(data.scope || active, active, params, key, evt);
            } else {
                var handler = active[action];

                if (Ext.isDefined(handler)) {
                    handler.call(active, params, key, evt);
                } else {
                    active.execAction(action, params, key, evt);
                }
            }
        }
    },
});

FEMhub.Bindings.showHelp = function(active) {
    var local = active.getBindings();

    if (local !== null) {
        local = local.getBindingsList();
    } else {
        local = [];
    }

    var global = FEMhub.Bindings.Global;
    global = global.getBindingsList();

    (new FEMhub.Help({
        title: 'Key bindings',
        template: new Ext.XTemplate(
            '<tpl for="groups">',
            '    <tpl if="bindings.length">',
            '        <h2>{description}</h2>',
            '        <tpl for="bindings">',
            '            <tpl for="specs"><dt>',
            '                <tpl if="shift"><b>Shift</b>&nbsp;+</tpl>',
            '                <tpl if="ctrl"><b>Ctrl</b>&nbsp;+</tpl>',
            '                <tpl if="alt"><b>Alt</b>&nbsp;+</tpl>',
            '                <b>{prettyKey}</b>',
            '            </tpl></dt>',
            '            <dd>{text}</dd>',
            '        </tpl>',
            '    </tpl>',
            '</tpl>'),
        context: {
            groups: [{
                description: 'Local key bindings',
                bindings: local,
            }, {
                description: 'Global key bindings',
                bindings: global,
            }],
        },
    })).show();
};

FEMhub.Mapping = Ext.extend(Ext.util.Observable, {
    global: false,
    bindings: {},

    constructor: function(config) {
        FEMhub.Mapping.superclass.constructor.call(this, config);

        FEMhub.util.eachPair(this.bindings, function(action, data) {
            this.bindings[action] = Ext.apply(data, {
                specs: this.translateSpecs(data.specs),
            });
        }, this);
    },

    translateSpecs: function(specs) {
        var translated = [];

        Ext.each(specs, function(spec) {
            if (Ext.isString(spec)) {
                var components = spec.split(/\s+/);
                var stop = true;

                if (components[components.length-1] === 'nostop') {
                    components.pop();
                    stop = false;
                }

                var key = components[0].toUpperCase();
                var modifiers = components.slice(1);

                var spec = {
                    key: Ext.EventObject[key] || key,
                    prettyKey: key,
                    shift: false,
                    ctrl: false,
                    alt: false,
                    stop: stop,
                };

                Ext.each(modifiers, function(modifier) {
                    spec[modifier.slice(1)] = (modifier[0] == '+');
                }, this);
            }

            translated.push(spec);
        }, this);

        return translated;
    },

    getBindingsList: function() {
        var bindings = [];

        FEMhub.util.eachPair(this.bindings, function(action, data) {
            var specs = [];

            Ext.each(data.specs, function(spec) {
                specs.push(Ext.copyTo({}, spec, 'prettyKey,shift,ctrl,alt'));
            }, this);

            bindings.push({
                text: data.text,
                specs: specs,
            });
        }, this);

        return bindings;
    },
});

FEMhub.Mappings = {}; // global namespace of Online Lab key mappings

FEMhub.Mappings.Global = Ext.extend(FEMhub.Mapping, {
    global: true,
    bindings: {
        bindingsHelp: {
            specs: [
                '?         +shift -ctrl +alt',
            ],
            text: 'Display help about available key bindings',
            handler: function(active, params, key, evt) {
                FEMhub.Bindings.showHelp(active);
            },
        },
        windowClose: {
            specs: [
                'Q         +shift -ctrl +alt',
            ],
            text: 'Close the active window',
            handler: function(active, params, key, evt) {
                if (!(active instanceof FEMhub.Desktop)) {
                    active.close();
                }
            },
        },
    },
});

