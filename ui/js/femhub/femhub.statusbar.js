
FEMhub.Statusbar = Ext.extend(Ext.ux.StatusBar, {
    defaultIconCls: 'femhub-ok-icon',

    constructor: function(config) {
        config = config || {};

        Ext.applyIf(config, {
            counter: 0,
            stack: [],
        });

        FEMhub.Statusbar.superclass.constructor.call(this, config);
    },

    showBusy: function(obj) {
        if (Ext.isString(obj)) {
            obj = {text: obj};
        }

        obj = Ext.applyIf(obj || {}, {
            text: this.busyText,
            iconCls: this.busyIconCls,
        });

        this.setStatus(obj);

        if (!Ext.isDefined(obj.id)) {
            obj.id = this.counter++;
            this.stack.push(obj);
        }

        return obj.id;
    },

    clearBusy: function(id) {
        if (Ext.isNumber(id)) {
            var len = this.stack.length;

            if (len > 0) {
                Ext.each(this.stack, function(obj, i) {
                    if (obj.id == id) {
                        this.stack.splice(i, 1);

                        if (i == len-1) {
                            if (len > 1) {
                                this.showBusy(this.stack[len-2]);
                            } else {
                                this.clearBusy();
                            }
                        }

                        return false;
                    }
                }, this);
            }
        } else {
            this.clearStatus({useDefaults: true});
        }
    },
});

