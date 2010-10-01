
FEMhub.Help = Ext.extend(Ext.Window, {
    constructor: function(config) {
        config = config || {};

        Ext.apply(config, {
            title: 'Help',
            iconCls: 'femhub-help-icon',
            bodyCssClass: 'femhub-help-body',
            layout: 'fit',
            buttons: [{
                text: 'Close',
                handler: function() {
                    this.close();
                },
                scope: this,
            }],
        });

        FEMhub.Help.superclass.constructor.call(this, config);
    },

    onRender: function() {
        FEMhub.Help.superclass.onRender.apply(this, arguments);

        FEMhub.RPC.Template.render({ name: 'femhub/help.html' }, function(result) {
            if (result.ok === true) {
                this.body.createChild({
                    tag: 'div',
                    html: result.rendered,
                });
            }
        }, this);
    },
});

FEMhub.Modules.Help = Ext.extend(FEMhub.Module, {
    launcher: {
        text: 'Help',
        icon: 'femhub-help-launcher-icon',
    },
    winCls: FEMhub.Help,
});

