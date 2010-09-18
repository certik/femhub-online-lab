
FEMhub.Module = Ext.extend(Ext.util.Observable, {
    //launcher: {},
    //winCls: null,
    //lab: null,

    constructor: function(config) {
        this.lab = config.lab;
        FEMhub.Module.superclass.constructor.call(this, config);
        this.init();
    },

    init: function() {
        /* pass */
    },

    start: function() {
        this.createWindow();
    },

    createWindow: function() {
        var desktop = this.lab.getDesktop();

        var win = desktop.createWindow(this.winCls);
        win.show();

        return win;
    },
});

FEMhub.Modules = {}; // global namespace of Online Lab modules

