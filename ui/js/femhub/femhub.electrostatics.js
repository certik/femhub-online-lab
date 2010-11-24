
FEMhub.Electrostatics = Ext.extend(FEMhub.Window, {
    constructor: function(config) {
        config = config || {};

        Ext.apply(config, {
            title: "Electrostatics",
            layout: 'fit',
            width: 885,
            height: 595,
            iconCls: 'femhub-mesheditor-icon',
            bodyCssClass: 'femhub-mesheditor-body',
            closable: true,
            onEsc: Ext.emptyFn,
            items: [{
                    "title": "Beta Version",
                    "html": '<b>First try</b>',
                    flex: 1,
                }],
            buttons: [{
                text: 'Close',
                handler: function() {
                    this.close();
                },
                scope: this,
            }],
        });

        FEMhub.Electrostatics.superclass.constructor.call(this, config);
    },
});

FEMhub.Modules.Electrostatics = Ext.extend(FEMhub.Module, {
    launcher: {
        text: 'Electrostatics',
        icon: 'femhub-electrostatics-launcher-icon',
    },
    winCls: FEMhub.Electrostatics,
});

