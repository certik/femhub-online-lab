
FEMhub.CellPanel = Ext.extend(Ext.BoxComponent, {
    cellsManager: null,

    constructor: function(config) {
        FEMhub.CellPanel.superclass.constructor.call(this, config);
    },

    onRender: function(container, position) {
        FEMhub.CellPanel.superclass.onRender.apply(this, arguments);

        this.el.addClass('femhub-cells');

        this.cellsManager = new FEMhub.CellManager(
            Ext.applyIf({ root: this.el }, this.conf)
        );

        this.cellsManager.initBackend();
    },

    getCellsManager: function() {
        return this.cellsManager;
    },
});

