
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
    modules: null,

    init: function() {
        /* pass */
    },

    initLab: function() {
        this.init();

        FEMhub.RPC.Account.isAuthenticated({}, function(result) {
            if (result.auth !== true) {
                var login = new FEMhub.Login({
                    listeners: {
                        loginsuccess: {
                            fn: this.afterLogin,
                            scope: this,
                        },
                    },
                });

                login.show();
            } else {
                this.afterLogin();
            }
        }, this);
     },

     afterLogin: function() {
        this.desktop = new FEMhub.Desktop(this);

        if (Ext.isArray(this.modules)) {
            for (var i = 0; i < this.modules.length; i++) {
                this.modules[i] = new this.modules[i]({ lab: this });
                this.desktop.addLauncher(this.modules[i]);
            }
        }

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

