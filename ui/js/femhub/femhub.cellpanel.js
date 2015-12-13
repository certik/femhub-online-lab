
FEMhub.CellPanel = Ext.extend(Ext.BoxComponent, {
    cellManager: null,

    constructor: function(config) {
        config = config || {};

        this.addEvents(['cellmanagerready']);

        this.cellManager = new FEMhub.CellManager(config.managerConfig);
        FEMhub.CellPanel.superclass.constructor.call(this, config);
    },

    onRender: function() {
        FEMhub.CellPanel.superclass.onRender.apply(this, arguments);

        this.el.addClass('femhub-cells');
        this.cellManager.setRoot(this.el);

        this.fireEvent('cellmanagerready', this, this.cellManager);
    },

    beforeDestroy: function() {
        this.cellManager.destroy();
        FEMhub.CellPanel.superclass.beforeDestroy.call(this);
    },

    getCellManager: function() {
        return this.cellManager;
    },
});

