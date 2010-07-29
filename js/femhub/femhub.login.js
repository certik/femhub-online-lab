
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

    constructor: function(config) {
        config = config || {};

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
            bodyStyle: 'padding: 10px',
            labelWidth: 65,
            border: false,
            items: [
                {
                    id: 'femhub-login-username',
                    fieldLabel: 'Username',
                    xtype: 'textfield',
                    spellCheck: false,
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
                },
            ],
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
            buttons: [
                {
                    text: 'Create account',
                    minWidth: 110,
                    handler: function() {
                        /* pass */
                    },
                    scope: this,
                }, {
                    text: 'Forgot password?',
                    minWidth: 110,
                    handler: function() {
                        /* pass */
                    },
                    scope: this,
                }, '-', {
                    text: '  Sign In  ',
                    handler: function() {
                        this.login();
                    },
                    scope: this,
                }
            ],
        });

        FEMhub.Login.superclass.constructor.call(this, config);

        this.on('show', function() {
            Ext.getCmp('femhub-login-username').focus();
        });
    },

    login: function() {
        var username = Ext.getCmp('femhub-login-username');
        var password = Ext.getCmp('femhub-login-password');
        var language = Ext.getCmp('femhub-login-language');
        var remember = Ext.getCmp('femhub-login-remember');

        var params = {
            username: username,
            password: password,
            remember: remember,
        }

        FEMhub.RPC.Account.login(params, function(result) {
            /* pass */
        }, this);
    },
});

