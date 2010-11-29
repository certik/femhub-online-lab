
FEMhub.Electrostatics = Ext.extend(FEMhub.Window, {
    constructor: function(config) {
        config = config || {};

        this.toolbar = this.initToolbar();

        Ext.apply(config, {
            title: "Electrostatics",
            layout: 'fit',
            width: 885,
            height: 595,
            iconCls: 'femhub-electrostatics-icon',
            bodyCssClass: 'femhub-mesheditor-body',
            closable: true,
            onEsc: Ext.emptyFn,
            tbar: this.toolbar,
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

    initToolbar: function() {
        return new Ext.Toolbar({
            enableOverflow: true,
            items: [{
                xtype: 'button',
                cls: 'x-btn-text-icon',
                text: 'Run',
                iconCls: 'femhub-add-worksheet-icon',
                handler: function() {
                    this.run();
                },
                scope: this,
            }],
        });
    },

    run: function() {
             FEMhub.msg.info(this, "I am here");
    },

});

FEMhub.Modules.Electrostatics = Ext.extend(FEMhub.Module, {
    launcher: {
        text: 'Electrostatics',
        icon: 'femhub-electrostatics-launcher-icon',
    },
    winCls: FEMhub.Electrostatics,
});

