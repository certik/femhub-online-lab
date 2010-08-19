
FEMhub.Settings = Ext.extend(Ext.Window, {
    tabsPanel: null,

    constructor: function(config) {
        config = config || {};

        this.initSettings();
        this.initTabsPanel();

        Ext.apply(config, {
            title: "FEMhub Settings",
            layout: 'fit',
            width: 400,
            height: 300,
            iconCls: 'femhub-settings-icon',
            maximizable: true,
            minimizable: true,
            closable: true,
            onEsc: Ext.emptyFn,
            items: this.tabsPanel,
            buttons: [{
                text: 'Apply',
                handler: function() {
                    this.saveSettings();
                },
                scope: this,
            }, '-', {
                text: 'Save',
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

    initSettings: function() {
        this.userSettings = new Ext.FormPanel({
            padding: 10,
            border: false,
            labelWidth: 150,
            defaults: {
                anchor: '100%',
            },
            items: [{
                setting: 'email',
                fieldLabel: 'E-mail',
                xtype: 'textfield',
                vtype: 'email',
                allowBlank: true,
                maxLength: 70,
            }, {
                setting: 'password',
                fieldLabel: 'Choose password',
                xtype: 'textfield',
                vtype: 'password',
                inputType: 'password',
                allowBlank: true,
                maxLength: 128,
            }, {
                fieldLabel: 'Re-type password',
                xtype: 'textfield',
                vtype: 'password',
                inputType: 'password',
                allowBlank: true,
                maxLength: 128,
            }],
        });
    },

    initTabsPanel: function() {
        this.tabsPanel = new Ext.TabPanel({
            activeTab: 0,
            border: false,
            items:[{
                title: 'User settings',
                items: this.userSettings,
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

