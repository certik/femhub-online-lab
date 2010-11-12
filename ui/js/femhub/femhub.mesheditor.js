
FEMhub.MeshEditor = Ext.extend(FEMhub.Window, {
    constructor: function(config) {
        config = config || {};

        Ext.apply(config, {
            title: "Mesh Editor",
            layout: 'fit',
            width: 870,
            height: 656,
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
                    style: 'width: 100%; height: 100%',
                });
            }
        }, this);
    },
});

FEMhub.Modules.MeshEditor = Ext.extend(FEMhub.Module, {
    launcher: {
        text: 'Mesh Editor',
        icon: 'femhub-mesheditor-launcher-icon',
    },
    winCls: FEMhub.MeshEditor,
});

