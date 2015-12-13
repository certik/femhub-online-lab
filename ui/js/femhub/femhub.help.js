
FEMhub.Help = Ext.extend(FEMhub.Window, {
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

        if (this.template instanceof Ext.Template) {
            this.template.overwrite(this.body, this.context);
        } else {
            var name = this.template || this.defaultTemplate;

            FEMhub.Template.render(name, this.context || {}, function(html) {
                this.body.update(html);
            }, this);
        }
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
    },
});

