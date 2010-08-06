
FEMhub.Login = Ext.extend(Ext.Window, {
    loginHtml: '<div class="femhub-login-head">The FEMhub Online Laboratory</div>' +
               '<div class="femhub-login-text">' +
               'The goal of the FEMhub online lab is to make scientific computing ' +
               'accessible to anyone. No need to be a rocket scientist. No need to ' +
               'own a strong computer or buy expensive software either. Everything ' +
               'takes place inside the web browser window. Yes, the same browser ' +
               'that you use for e-mails or to watch YouTube movies. And yes, you ' +
               'can use your favorite iPhone or iPod. The online lab is backed up ' +
               'with substantial computing power of the <a href="http://unr.edu/"> ' +
               'University of Nevada, Reno</a>, that the University gives you free ' +
               'of charge.</div>',

               // XXX: add more info link (centered) -> window

    constructor: function(config) {
        config = config || {};

        this.addEvents({
            'loginsuccess': true,
        });

        var langs = new Ext.data.ArrayStore({
            fields: ['name', 'code'],
            data: [
                ['English', 'en'],
                ['Polski', 'pl'],
                ['Čeština', 'cz'],
            ],
        });

        var combo = new FEMhub.IconComboBox({
            width: 150,
            mode: 'local',
            store: langs,
            value: 'en',
            displayField: 'name',
            valueField: 'code',
            typeAhead: true,
            triggerAction: 'all',
            forceSelection: true,
            iconClsPrefix: 'femhub-flag-',
        });

        var login = new Ext.form.FormPanel({
            labelWidth: 65,
            border: false,
            padding: 10,
            items: [{
                id: 'femhub-login-username',
                fieldLabel: 'Username',
                xtype: 'textfield',
                width: 150,
                listeners: {
                    specialkey: {
                        fn: function(obj, evt) {
                            if (evt.getKey() == evt.ENTER) {
                                Ext.getCmp('femhub-login-password').focus();
                            }
                        },
                        scope: this,
                    },
                },
            }, {
                id: 'femhub-login-password',
                fieldLabel: 'Password',
                xtype: 'textfield',
                inputType: 'password',
                width: 150,
                listeners: {
                    specialkey: {
                        fn: function(obj, evt) {
                            if (evt.getKey() == evt.ENTER) {
                                this.login();
                            }
                        },
                        scope: this,
                    },
                },
            }, {
                id: 'femhub-login-language',
                fieldLabel: 'Language',
                border: false,
                items: combo,
                width: 150,
            }, {
                id: 'femhub-login-remember',
                xtype: 'checkbox',
                boxLabel: 'remember me',
            }],
        });

        Ext.apply(config, {
            title: "Welcome to FEMhub Online Lab",
            bodyCssClass: 'femhub-login-body',
            width: 563,
            height: 375,
            layout: 'table',
            layoutConfig: {
                columns: 2,
            },
            closable: false,
            resizable: false,
            items: [
                {
                    html: this.loginHtml,
                    bodyStyle: 'padding: 10px',
                    border: false,
                    width: 300,
                },
                login,
            ],
            buttons: [{
                text: 'Create account',
                minWidth: 110,
                handler: function() {
                    var win = new FEMhub.CreateAccount(this);
                    this.hide();
                    win.show();
                },
                scope: this,
            }, {
                text: 'Forgot password?',
                minWidth: 110,
                handler: function() {
                    var win = new FEMhub.RemindPassword(this);
                    this.hide();
                    win.show();
                },
                scope: this,
            }, '-', {
                text: 'Sign In',
                handler: function() {
                    this.login();
                },
                scope: this,
            }],
        });

        FEMhub.Login.superclass.constructor.call(this, config);
    },

    clearFields: function() {
        Ext.getCmp('femhub-login-username').setValue('');
        Ext.getCmp('femhub-login-password').setValue('');
    },

    focusUsername: function() {
        Ext.getCmp('femhub-login-username').focus();
    },

    login: function() {
        var username = Ext.getCmp('femhub-login-username');
        var password = Ext.getCmp('femhub-login-password');
        var language = Ext.getCmp('femhub-login-language');
        var remember = Ext.getCmp('femhub-login-remember');

        var params = {
            username: username.getValue(),
            password: password.getValue(),
        }

        FEMhub.RPC.Account.login(params, function(result) {
            if (result.ok === true) {
                this.close();
                this.fireEvent('loginsuccess');
            } else {
                switch (result.reason) {
                case 'disabled':
                    Ext.MessageBox.show({
                        title: 'Login failed',
                        msg: 'Your account has been disabled.',
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING,
                    });
                    break;
                case 'failed':
                    Ext.MessageBox.show({
                        title: 'Login failed',
                        msg: 'You have entered wrong username or password!',
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR,
                        fn: function() {
                            this.clearFields();
                            this.focusUsername();
                        },
                        scope: this,
                    });
                    break;
                }
            }
        }, this);
    },
});

FEMhub.CreateAccount = Ext.extend(Ext.Window, {
    constructor: function(login, config) {
        this.login = login;
        config = config || {};

        Ext.apply(config, {
            title: 'Create accout',
            bodyStyle: 'background-color: white',
            padding: 10,
            layout: 'form',
            layoutConfig: {
                labelWidth: 80,
            },
            closable: false,
            resizable: false,
            items: [{
                id: 'femhub-create-username',
                fieldLabel: 'Username',
                xtype: 'textfield',
                width: 150,
                listeners: {
                    specialkey: {
                        fn: function(obj, evt) {
                            if (evt.getKey() == evt.ENTER) {
                                Ext.getCmp('femhub-create-password-1').focus();
                            }
                        },
                        scope: this,
                    },
                },
            }, {
                id: 'femhub-create-password-1',
                fieldLabel: 'Create password',
                xtype: 'textfield',
                width: 150,
            }, {
                id: 'femhub-create-password-2',
                fieldLabel: 'Re-type password',
                xtype: 'textfield',
                width: 150,
            }],
            buttons: [{
                text: 'OK',
                handler: function() {
                    this.createAccount();
                    this.closeAndReturn();
                },
                scope: this,
            }, {
                text: 'Cancel',
                handler: function() {
                    this.closeAndReturn();
                },
                scope: this,
            }],
        });

        FEMhub.CreateAccount.superclass.constructor.call(this, config);
    },

    createAccount: function() {
        var params = {};

        FEMhub.RPC.Account.createAccount(params, function(result) {
            /* pass */
        });
    },

    closeAndReturn: function() {
        this.close();
        this.login.show();
    },
});

FEMhub.RemindPassword = Ext.extend(Ext.Window, {
    constructor: function(login, config) {
        this.login = login;
        config = config || {};

        Ext.apply(config, {
            title: 'Remind password',
            bodyStyle: 'background-color: white',
            padding: 10,
            layout: 'form',
            layoutConfig: {
                labelWidth: 80,
            },
            closable: false,
            resizable: false,
            buttons: [{
                text: 'OK',
                handler: function() {
                    this.remindPassword();
                    this.closeAndReturn();
                },
                scope: this,
            }, {
                text: 'Cancel',
                handler: function() {
                    this.closeAndReturn();
                },
                scope: this,
            }],
        });

        FEMhub.RemindPassword.superclass.constructor.call(this, config);
    },

    remindPassword: function() {
        var params = {};

        FEMhub.RPC.Account.remindPassword(params, function(result) {
            /* pass */
        });
    },

    closeAndReturn: function() {
        this.close();
        this.login.show();
    },
});

FEMhub.Modules.Logout = Ext.extend(FEMhub.Module, {
    launcher: {
        text: 'Logout',
        icon: 'femhub-logout-launcher-icon',
    },
    start: function() {
        Ext.MessageBox.show({
            title: 'Logout',
            msg: 'Do you really want to logout from FEMhub Online Lab?',
            buttons: Ext.MessageBox.YESNO,
            icon: Ext.MessageBox.QUESTION,
            fn: function(button) {
                if (button === 'yes') {
                    FEMhub.RPC.Account.logout({}, function() {
                        FEMhub.lab.restartLab();
                    }, this);
                }
            },
        });
    },
});

