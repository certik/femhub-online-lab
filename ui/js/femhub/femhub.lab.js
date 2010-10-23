
FEMhub.Lab = function(config) {
    Ext.apply(this, config);

    this.addEvents(['ready', 'beforeunload']);

    FEMhub.RPC.init(function() {
        Ext.onReady(this.initLab, this);
    }, this);
};

Ext.extend(FEMhub.Lab, Ext.util.Observable, {
    isReady: false,
    desktop: null,
    modules: [],

    initLab: function() {
        if (Ext.isDefined(this.init)) {
            this.init();
        }

        Ext.EventManager.on(window, 'beforeunload', this.onUnload, this);

        this.fireEvent('ready', this);
        this.isReady = true;

        this.bindings = new FEMhub.Bindings();

        FEMhub.RPC.User.isAuthenticated({}, function(result) {
            if (result.authenticated !== true) {
                this.startLogin();
            } else {
                this.afterLogin();
            }
        }, this);
    },

    restartLab: function() {
        this.desktop.destroy();
        this.startLogin();
    },

    startLogin: function() {
        var login = new FEMhub.Login({
            listeners: {
                loginsuccess: {
                    fn: this.afterLogin,
                    scope: this,
                },
            },
        });

        login.show();
    },

    afterLogin: function() {
        this.desktop = new FEMhub.Desktop(this);

        for (var i = 0; i < this.modules.length; i++) {
            var module = new this.modules[i]({ lab: this });
            this.desktop.addLauncher(module);
        }

        this.desktop.arrangeLaunchers();
    },

    onReady: function(handler, scope) {
        if (!this.isReady) {
            this.on('ready', handler, scope);
        } else {
            handler.call(scope, this);
        }
    },

    onUnload: function(evt) {
        var group = this.desktop.getGroup();

        group.each(function(wnd) {
            if (wnd.getXType() === 'x-femhub-worksheet') {
                wnd.getCellsManager().killEngine();
            }
        }, this);

        if (this.fireEvent('beforeunload', this) === false) {
            evt.stopEvent();
        }
    },

    getDesktop: function() {
        return this.desktop;
    },
});

FEMhub.getDesktop = function() {
    if (Ext.isDefined(FEMhub.lab)) {
        return FEMhub.lab.getDesktop();
    } else {
        return null; /* XXX: show error */
    }
};

