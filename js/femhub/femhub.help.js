
FEMhub.Help = Ext.extend(Ext.Window, {
    constructor: function(config) {
        config = config || {};

        Ext.apply(config, {
            title: "Help",
            layout: 'fit',
            width: 500,
            height: 400,
            iconCls: 'femhub-help-icon',
            bodyCssClass: 'femhub-help-body',
            closable: true,
            onEsc: Ext.emptyFn,
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

        FEMhub.RPC.Template.render({ template: 'femhub/help.html' }, function(result) {
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

