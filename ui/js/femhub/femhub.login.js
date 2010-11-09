
FEMhub.Login = Ext.extend(FEMhub.Window, {

    constructor: function(config) {
        config = config || {};

        this.addEvents(['loginsuccess']);

        var content = new Ext.Panel({
            bodyStyle: 'padding: 10px',
            border: false,
            width: 300,
            listeners: {
                afterrender: function(panel) {
                    FEMhub.Template.render('femhub/login.html', function(html) {
                        panel.body.update(html);
                        this.center();
                        this.show();
                    }, this);
                },
                scope: this,
            },
        });

        var langs = new Ext.data.ArrayStore({
            fields: ['name', 'code'],
            data: [
                ['English', 'en'],
                //['Polski', 'pl'],
                //['Čeština', 'cz'],
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

        var form = new Ext.form.FormPanel({
            bodyCssClass: 'femhub-login-form',
            labelWidth: 65,
            border: false,
            items: [{
                id: 'femhub-login-username',
                fieldLabel: 'Username',
                xtype: 'textfield',
                maxLength: 30,
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
                maxLength: 128,
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
                checked: true,
            }],
        });

        Ext.apply(config, {
            title: "Welcome to FEMhub Online Lab",
            bodyCssClass: 'femhub-login-body',
            width: 563,
            autoHeight: true,
            layout: 'column',
            closable: false,
            resizable: false,
            items: [content, form],
            buttonAlign: 'left',
            buttons: [{
                text: 'Published worksheets',
                minWidth: 130,
                align: 'left',
                handler: function() {
                    var win = new FEMhub.PublishedWorksheets();
                    win.show();
                },
                scope: this,
            }, '->', {
                text: 'Create account',
                minWidth: 110,
                handler: function() {
                    var win = new FEMhub.CreateAccount(this);
                    win.show();
                },
                scope: this,
            }, {
                text: 'Forgot password?',
                minWidth: 110,
                handler: function() {
                    var win = new FEMhub.RemindPassword(this);
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

    onShow: function() {
        this.focusUsername();
    },

    focusUsername: function() {
        Ext.getCmp('femhub-login-username').focus();
    },

    focusPassword: function() {
        Ext.getCmp('femhub-login-password').focus();
    },

    clearUsername: function() {
        Ext.getCmp('femhub-login-username').setValue('');
        this.focusUsername();
    },

    clearPassword: function() {
        Ext.getCmp('femhub-login-password').setValue('');
        this.focusPassword();
    },

    clearFields: function() {
        this.clearPassword();
        this.clearUsername();
    },

    setUsername: function(username) {
        Ext.getCmp('femhub-login-username').setValue(username);
    },

    login: function() {
        var username = Ext.getCmp('femhub-login-username');
        var password = Ext.getCmp('femhub-login-password');
        var remember = Ext.getCmp('femhub-login-remember');

        var params = {
            username: username.getValue(),
            password: password.getValue(),
            remember: remember.getValue(),
        };

        FEMhub.RPC.User.login(params, {
            okay: function(result) {
                this.fireEvent('loginsuccess');
                this.close();
            },
            fail: {
                title: "Login error",
                errors: {
                    'username': 'Account doesn\'t exist. Use "Create account" button to create new one.',
                    'password': 'Wrong password. Use "Forgot password?" button to create new one.',
                    'disabled': 'Your account has been disabled.',
                },
            },
            scope: this,
        });
    },
});

FEMhub.CreateAccount = Ext.extend(FEMhub.Window, {
    constructor: function(login, config) {
        this.login = login;
        config = config || {};

        Ext.apply(config, {
            title: 'Create accout',
            bodyStyle: 'background-color: white',
            padding: 10,
            width: 400,
            autoHeight: true,
            modal: true,
            layout: 'form',
            closable: false,
            resizable: false,
            items: [{
                id: 'femhub-create-form',
                xtype: 'form',
                border: false,
                labelAlign: 'top',
                items: [{
                    xtype: 'x-femhub-textfield',
                    id: 'femhub-create-username',
                    fieldLabel: 'Username',
                    vtype: 'alphanum',
                    allowBlank: false,
                    blankText: "Choose your username.",
                    minLength: 3,
                    minLengthText: "Username must be at least 3 characters long.",
                    maxLength: 30,
                    maxLengthText: "Username must be at most 30 characters long.",
                    helpText: "Your username must contain only alphanumeric characters and be " +
                              "between 3 and 30 characters long. Note that your username will " +
                              "publicly visible and you won't be allowed to change it later " +
                              "so make sure you choose right.",
                    nextField: 'femhub-create-email',
                }, {
                    xtype: 'x-femhub-textfield',
                    id: 'femhub-create-email',
                    fieldLabel: 'E-mail',
                    vtype: 'email',
                    allowBlank: false,
                    blankText: "Enter your E-mail address.",
                    maxLength: 70,
                    maxLengthText: "E-mail address must be at most 70 characters long.",
                    helpText: "Enter a valid E-mail address. We don't check this but we strongly " +
                              "recommend that this E-mail is valid, because it may get useful, for " +
                              "example if you forget you password. Note that we won't share your E-mail " +
                              "address with anyone, unless you allow us explicitly to do so.",
                    nextField: 'femhub-create-password',
                }, {
                    xtype: 'x-femhub-textfield',
                    id: 'femhub-create-password',
                    fieldLabel: 'Choose password',
                    inputType: 'password',
                    allowBlank: false,
                    blankText: "Choose your password.",
                    minLength: 5,
                    minLengthText: "Password must be at least 5 characters long.",
                    maxLength: 128,
                    maxLengthText: "Password must be at most 128 characters long.",
                    helpText: "Your password can contain any letters and must be between 5 and 128 " +
                              "characters long. Although we don't check this, we recommend that you " +
                              "choose a strong password (use lower and upper case letter, digits and/or " +
                              "special characters) to protect your privacy.",
                    nextField: 'femhub-create-password-retype',
                }, {
                    xtype: 'x-femhub-textfield',
                    id: 'femhub-create-password-retype',
                    fieldLabel: 'Re-type password',
                    inputType: 'password',
                    allowBlank: false,
                    blankText: "Confirm your password.",
                    minLength: 5,
                    minLengthText: "Password must be at least 5 characters long.",
                    maxLength: 128,
                    maxLengthText: "Password must be at most 128 characters long.",
                    helpText: "This must be exactly the same password you entered above. This in required " +
                              "just to make sure you didn't mistype your password.",
                    listeners: {
                        specialkey: {
                            fn: function(obj, evt) {
                                if (evt.getKey() == evt.ENTER) {
                                    this.createAccount();
                                }
                            },
                            scope: this,
                        },
                    },
                }],
            }],
            buttonAlign: 'left',
            buttons: [{
                iconCls: 'femhub-refresh-icon',
                handler: function() {
                    this.clearFields();
                },
                scope: this,
            }, '->', {
                text: 'OK',
                handler: function() {
                    this.createAccount();
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

    onShow: function() {
        this.focusUsername();
    },

    focusUsername: function() {
        Ext.getCmp('femhub-create-username').focus();
    },

    clearFields: function() {
        var ids = ['femhub-create-username',
                   'femhub-create-email',
                   'femhub-create-password',
                   'femhub-create-password-retype'];

        Ext.each(ids, function(id) {
            var el = Ext.getCmp(id);
            el.setValue('');
            el.clearInvalid();
        });
    },

    createAccount: function() {
        var form = Ext.getCmp('femhub-create-form').getForm();

        if (!form.isValid()) {
            return;
        }

        var username = Ext.getCmp('femhub-create-username');
        var email = Ext.getCmp('femhub-create-email');
        var password = Ext.getCmp('femhub-create-password');
        var passwordRetype = Ext.getCmp('femhub-create-password-retype');

        var params = {
            username: username.getValue(),
            email: email.getValue(),
            password: password.getValue(),
        };

        if (params.password != passwordRetype.getValue()) {
            Ext.MessageBox.show({
                title: 'Account creation failed',
                msg: "Passwords don't match, please fix this.",
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.ERROR,
                fn: function(button) {
                    Ext.getCmp('femhub-create-password-retype').setValue('');
                },
                scope: this,
            });
        } else {
            FEMhub.RPC.User.createAccount(params, function(result) {
                if (result.ok === true) {
                    this.login.setUsername(params.username);
                    this.closeAndReturn();
                } else {
                    if (result.reason === 'exists') {
                        Ext.MessageBox.show({
                            title: 'Account creation failed',
                            msg: "'" + params.username + "' is already in use. Choose different username.",
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.ERROR,
                            fn: function(button) {
                                Ext.getCmp('femhub-create-username').setValue('');
                            },
                            scope: this,
                        });
                    } else {
                        this.clearFields();
                    }
                }
            }, this);
        }
    },

    closeAndReturn: function() {
        this.close();
    },
});

FEMhub.RemindPassword = Ext.extend(FEMhub.Window, {
    constructor: function(login, config) {
        this.login = login;
        config = config || {};

        Ext.apply(config, {
            title: 'Remind password',
            bodyStyle: 'background-color: white',
            padding: 10,
            width: 340,
            autoHeight: true,
            modal: true,
            layout: 'form',
            closable: false,
            resizable: false,
            items: {
                id: 'femhub-remind-form',
                xtype: 'form',
                border: false,
                labelWidth: 150,
                defaults: {
                    anchor: '100%',
                },
                items: [{
                    id: 'femhub-remind-username',
                    fieldLabel: 'Username',
                    xtype: 'textfield',
                    vtype: 'alphanum',
                    allowBlank: false,
                    blankText: "Choose your username.",
                    maxLength: 30,
                    maxLengthText: "Username must be at most 30 characters long.",
                    validationEvent: false,
                    listeners: {
                        specialkey: {
                            fn: function(obj, evt) {
                                if (evt.getKey() == evt.ENTER) {
                                    this.remindPassword();
                                }
                            },
                            scope: this,
                        },
                    },
                }],
            },
            buttons: [{
                text: 'OK',
                handler: function() {
                    this.remindPassword();
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

    onShow: function() {
        this.focusUsername();
    },

    clearFields: function() {
        Ext.getCmp('femhub-remind-username').setValue('');
    },

    focusUsername: function() {
        Ext.getCmp('femhub-remind-username').focus();
    },

    remindPassword: function() {
        var form = Ext.getCmp('femhub-remind-form').getForm();

        if (!form.isValid()) {
            return;
        }

        var username = Ext.getCmp('femhub-remind-username');

        var params = {
            username: username.getValue(),
        };

        FEMhub.RPC.User.remindPassword(params, function(result) {
            if (result.ok === true) {
                Ext.MessageBox.show({
                    title: 'Remind password',
                    msg: "New password was sent to your E-mail account.",
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.INFO,
                    fn: function(button) {
                        if (button === 'ok') {
                            this.login.setUsername(params.username);
                            this.closeAndReturn();
                        }
                    },
                    scope: this,
                });
            } else {
                var msg;

                switch (result.reason) {
                case 'does-not-exist':
                    msg = "'" + params.username + "' account does not exists. Choose a correct one.";
                    break;
                case 'invalid-email':
                    msg = "Invalid E-mail. No message was sent.";
                    break;
                default:
                    msg = result.reason;
                }

                FEMhub.msg.error('Remind password', msg);
                this.clearFields();
            }
        }, this);
    },

    closeAndReturn: function() {
        this.close();
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
                    FEMhub.lab.cleanupLab();

                    FEMhub.RPC.User.logout({}, function() {
                        FEMhub.lab.restartLab();
                    }, this);
                }
            },
        });
    },
});

