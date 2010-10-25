
FEMhub.Help = Ext.extend(Ext.Window, {
    defaultTemplate: 'femhub/help.html',

    constructor: function(config) {
        config = config || {};

        Ext.applyIf(config, {
            title: 'Help',
            iconCls: 'femhub-help-icon',
            bodyCssClass: 'femhub-help-body',
            layout: 'fit',
            width: 400,
            height: 300,
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

        var params = {
            name: this.template || this.defaultTemplate,
            context: this.context,
        };

        FEMhub.RPC.Template.render(params, function(result) {
            if (result.ok === true) {
                this.body.createChild({
                    tag: 'div',
                    html: result.rendered,
                });
            } else {
                var msg;

                switch(result.reason) {
                case 'template-not-found':
                    msg = "'" + params.name + "' template not found.";
                    break;
                case'template-render-error':
                    msg = "'" + params.name + "' failed to render.";
                    break;
                default:
                    msg = Ext.util.Format.htmlEncode(result.reason);
                }

                FEMhub.msg.error("Engine error", msg);
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

