
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
                setting: 'password',
                fieldLabel: 'Current password',
                xtype: 'textfield',
                vtype: 'password',
                inputType: 'password',
                allowBlank: true,
            }, {
                setting: 'password',
                fieldLabel: 'Choose password',
                xtype: 'textfield',
                vtype: 'password',
                inputType: 'password',
                allowBlank: true,
                minLength: 5,
                maxLength: 128,
            }, {
                fieldLabel: 'Re-type password',
                xtype: 'textfield',
                vtype: 'password',
                inputType: 'password',
                allowBlank: true,
                minLength: 5,
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

