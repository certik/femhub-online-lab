
FEMhub.Lab = function(config) {
    Ext.apply(this, config);

    this.addEvents({
        'ready': true,
        'beforeunload': true,
    });

    FEMhub.init(function() {
        Ext.onReady(this.initLab, this);
    }, this);
};

Ext.extend(FEMhub.Lab, Ext.util.Observable, {
    isReady: false,
    desktop: null,

    init: function() {
        /* pass */
    },

    initLab: function() {
        this.desktop = new FEMhub.Desktop(this);

        this.init();

        Ext.EventManager.on(window, 'beforeunload', this.onUnload, this);

        this.fireEvent('ready', this);
        this.isReady = true;
    },

    onReady: function(handler, scope) {
        if (!this.isReady) {
            this.on('ready', handler, scope);
        } else {
            handler.call(scope, this);
        }
    },

    onUnload: function(evt) {
        if (this.fireEvent('beforeunload', this) === false) {
            evt.stopEvent();
        }
    },

    getDesktop: function() {
        return this.desktop;
    },
});

