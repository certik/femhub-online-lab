
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

    getBindings: function() {
        return FEMhub.Bindings.Help;
    },

    scrollDownAction: function() {
        this.body.scroll('b', 40);
    },

    scrollUpAction: function() {
        this.body.scroll('t', 40);
    },

    quitAction: function() {
        this.close();
    },
});

FEMhub.Modules.Help = Ext.extend(FEMhub.Module, {
    launcher: {
        text: 'Help',
        icon: 'femhub-help-launcher-icon',
    },
    winCls: FEMhub.Help,
});

Ext.reg('x-femhub-help', FEMhub.Help);

FEMhub.Mappings.Help = Ext.extend(FEMhub.Mapping, {
    bindings: {
        scrollDownAction: {
            specs: [
                'J -shift -ctrl +alt',
            ],
            text: 'Scroll down',
        },
        scrollUpAction: {
            specs: [
                'K -shift -ctrl +alt',
            ],
            text: 'Scroll up',
        },
        quitAction: {
            specs: [
                'Q +shift -ctrl +alt',
            ],
            text: 'Close this window',
        },
    },
});

