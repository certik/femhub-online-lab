
FEMhub.TextViewer = Ext.extend(FEMhub.Window, {

    constructor: function(config) {
        config = config || {};

        Ext.apply(config, {
            title: 'Text Viewer',
            iconCls: 'femhub-textviewer-icon',
            bodyCssClass: 'femhub-textviewer-body',
            layout: 'fit',
            buttons: [{
                text: 'Close',
                handler: function() {
                    this.close();
                },
                scope: this,
            }],
        });

        FEMhub.TextViewer.superclass.constructor.call(this, config);
    },

    onRender: function() {
        FEMhub.TextViewer.superclass.onRender.apply(this, arguments);

        this.body.createChild({
            tag: 'div',
            html: this.text || '(nothing)',
        });
    },
});

