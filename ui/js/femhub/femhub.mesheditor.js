FEMhub.MeshEditor = Ext.extend(Ext.Window, {
    constructor: function(config) {
        config = config || {};

        Ext.apply(config, {
            title: "MeshEditor",
            layout: 'fit',
            width: 856,
            height: 668,
            iconCls: 'femhub-mesheditor-icon',
            bodyCssClass: 'femhub-mesheditor-body',
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

        FEMhub.MeshEditor.superclass.constructor.call(this, config);
    },

    onRender: function() {
        FEMhub.MeshEditor.superclass.onRender.apply(this, arguments);

        FEMhub.RPC.Template.render({ name: 'femhub/mesheditor.html' }, function(result) {
            if (result.ok === true) {
                this.body.createChild({
                    tag: 'div',
                    html: result.rendered,
                });
            }
        }, this);
    },
});

FEMhub.Modules.MeshEditor = Ext.extend(FEMhub.Module, {
    launcher: {
        text: 'MeshEditor',
        icon: 'femhub-mesheditor-launcher-icon',
    },
    winCls: FEMhub.MeshEditor,
});

