
FEMhub.TextField = Ext.extend(Ext.form.TextField, {

    constructor: function(config) {
        config = config || {};

        config = Ext.apply({
            validationEvent: false,
            invalidClass: '',
            msgTarget: 'under',
            anchor: '-20',
        }, config);

        config.listeners = Ext.apply({
            specialkey: {
                fn: function(cmp, evt) {
                    if (cmp.nextField && evt.getKey() === evt.ENTER) {
                        Ext.getCmp(cmp.nextField).focus();
                    }
                },
                scope: this,
            },
            afterrender: function(cmp) {
                if (!cmp.helpEl) {
                    cmp.helpEl = cmp.el.parent().createChild({
                        tag: 'div',
                        cls: 'femhub-field-help',
                    });

                    new Ext.ToolTip({
                        target: cmp.helpEl,
                        html: cmp.helpText,
                        trackMouse: true,
                        dismissDelay: 0,
                        style: 'text-align: justify',
                    });
                }
            },
            resize: function(cmp) {
                if (cmp.helpEl) {
                    cmp.helpEl.anchorTo(cmp.el, 'l-r', [2, 0]);
                }
            },
        }, config.listeners || {});

        FEMhub.TextField.superclass.constructor.call(this, config);
    },
});

Ext.reg('x-femhub-textfield', FEMhub.TextField);

