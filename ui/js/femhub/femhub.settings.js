
FEMhub.Settings = Ext.extend(FEMhub.Window, {
    tabsPanel: null,

    constructor: function(config) {
        config = config || {};

        this.initSettings();
        this.initTabsPanel();

        Ext.apply(config, {
            title: 'Settings',
            iconCls: 'femhub-settings-icon',
            layout: 'fit',
            width: 400,
            height: 300,
            items: this.tabsPanel,
            buttons: [{
                text: 'Apply',
                disabled: true,
                handler: function() {
                    this.saveSettings();
                },
                scope: this,
            }, '-', {
                text: 'Save',
                disabled: true,
                handler: function() {
                    this.saveSettings();
                    this.close();
                },
                scope: this,
            }, {
                text: 'Cancel',
                handler: function() {
                    if (this.isModified()) {
                        Ext.MessageBox.show({
                            title: 'Settings',
                            msg: 'Some settings were modified. Do you want save the modifications before closing?',
                            buttons: Ext.MessageBox.YESNO,
                            icon: Ext.MessageBox.QUESTION,
                            fn: function(button) {
                                if (button === 'yes') {
                                    this.saveSettings();
                                }

                                this.close();
                            },
                            scope: this,
                        });
                    } else {
                        this.close();
                    }
                },
                scope: this,
            }],
        });

        FEMhub.Settings.superclass.constructor.call(this, config);
    },

    initSettings: Ext.emptyFn,

    initTabsPanel: function() {
        this.tabsPanel = new Ext.TabPanel({
            activeTab: 0,
            border: false,
            items:[{
                title: 'User settings',
                padding: 10,
                items: {
                    xtype: 'button',
                    text: 'Change password',
                    handler: function() {
                        (new FEMhub.ChangePassword()).show();
                    },
                    scope: this,
                },
            }],
        });
    },

    saveSettings: function() {
        /* pass */
    },

    isModified: function() {
        return false;
    },
});

FEMhub.Modules.Settings = Ext.extend(FEMhub.Module, {
    launcher: {
        text: 'Settings',
        icon: 'femhub-settings-launcher-icon',
    },
    winCls: FEMhub.Settings,
});

