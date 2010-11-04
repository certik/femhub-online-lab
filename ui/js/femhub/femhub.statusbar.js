
FEMhub.Statusbar = Ext.extend(Ext.ux.StatusBar, {
    defaultIconCls: 'femhub-ok-icon',

    clearBusy: function() {
        this.clearStatus({useDefaults: true});
    },
});

