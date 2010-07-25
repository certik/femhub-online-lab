
FEMhub.Cells = Ext.extend(Ext.BoxComponent, {
    cellsMgr: null,

    constructor: function(config) {
        this.config = config;
        FEMhub.Cells.superclass.constructor.apply(this, arguments);
    },

    initComponent: function() {
        FEMhub.Cells.superclass.initComponent.call(this);
    },

    onRender: function(container, position) {
        FEMhub.Cells.superclass.onRender.apply(this, arguments);

        this.el.addClass('femhub-cells');

        this.cellsMgr = new FEMhub.CellManager(
            Ext.applyIf({ root: this.el }, this.config)
        );

        this.cellsMgr.initBackend();
    },

    getCellsManager: function() {
        return this.cellsMgr;
    },

    addInputCell: function(config) {
        this.cellsMgr.newCell({ type: 'input' });
    },
});

