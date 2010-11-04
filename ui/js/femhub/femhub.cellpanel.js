
FEMhub.CellPanel = Ext.extend(Ext.BoxComponent, {
    cellsManager: null,

    constructor: function(config) {
        config = config || {};

        this.cellsManager = new FEMhub.CellManager(config.conf);

        config = Ext.apply({}, config, {
            items: this.cellsManager,
        });

        FEMhub.CellPanel.superclass.constructor.call(this, config);
    },

    onRender: function() {
        FEMhub.CellPanel.superclass.onRender.apply(this, arguments);

        this.el.addClass('femhub-cells');
        this.cellsManager.setRoot(this.el);

        this.cellsManager.initEngine();
        this.cellsManager.loadCells();
    },

    beforeDestroy: function() {
        this.cellsManager.destroy();
        FEMhub.CellPanel.superclass.beforeDestroy.call(this);
    },

    getCellsManager: function() {
        return this.cellsManager;
    },
});

