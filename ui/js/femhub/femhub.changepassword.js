
FEMhub.ChangePassword = Ext.extend(FEMhub.Window, {
    htmlBanner: "<h1>Change your password</h1>" +
                "<p>To change your password, first enter your current password to " +
                "the field below and click <b>Authenticate</b>. After successful " +
                "authentication, choose a new password, retype it for verification " +
                "and click <b>Change password</b>.</p>",

    passwordDefaults: {
        minLength: 5,
        minLengthText: "At least 5 characters required.",
        maxLength: 128,
        maxLengthText: "At most 128 characters allowed.",
    },

    constructor: function(config) {
        config = config || {};

        this.form = new Ext.FormPanel({
            labelWidth: 120,
            border: false,
            padding: '5px 10px',
            unstyled: true,
            items: [Ext.apply({
                fieldLabel: 'Current password',
                xtype: 'x-femhub-textfield',
                ref: '../currentPassword',
                inputType: 'password',
                allowBlank: false,
                blankText: "Enter your current password.",
                onEnter: this.authenticate.createDelegate(this),
                helpText: "",
            }, this.passwordDefaults), Ext.apply({
                fieldLabel: 'Choose password',
                xtype: 'x-femhub-textfield',
                ref: '../choosePassword',
                inputType: 'password',
                allowBlank: false,
                blankText: "Enter a new password.",
                disabled: true,
                helpText: "",
                nextField: (function() {
                    return this.retypePassword;
                }).createDelegate(this),
            }, this.passwordDefaults), Ext.apply({
                fieldLabel: 'Retype password',
                xtype: 'x-femhub-textfield',
                ref: '../retypePassword',
                inputType: 'password',
                vtype: 'password',
                allowBlank: false,
                blankText: "Confirm your new password.",
                disabled: true,
                helpText: "",
                relatedField: (function() {
                    return this.choosePassword;
                }).createDelegate(this),
                onEnter: this.changePassword.createDelegate(this),
            }, this.passwordDefaults)],
        });

        config = Ext.apply({
            title: 'Change password',
            width: 400,
            autoHeight: true,
            closable: true,
            resizable: false,
            layout: 'auto',
            items: [{
                bodyCfg: {
                    html: this.htmlBanner,
                    cls: 'femhub-change-password-heading',
                },
            }, this.form],
            buttons: [{
                text: 'Authenticate',
                iconCls: 'femhub-ok-icon',
                ref: '../buttonAuthenticate',
                handler: function() {
                    this.authenticate();
                },
                scope: this,
            }, '-', {
                text: 'Change password',
                ref: '../buttonChangePassword',
                disabled: true,
                handler: function() {
                    this.changePassword();
                },
                scope: this,
            }, {
                text: 'Cancel',
                handler: function() {
                    this.close();
                },
                scope: this,
            }],
        }, config);

        FEMhub.ChangePassword.superclass.constructor.call(this, config);
    },

    authenticate: function() {
        if (this.form.getForm().isValid()) {
            var password = this.currentPassword.getValue();

            FEMhub.RPC.User.authenticate({password: password}, {
                okay: function(result) {
                    this.currentPassword.clearInvalid();
                    this.currentPassword.disable();

                    this.choosePassword.enable();
                    this.retypePassword.enable();

                    this.buttonAuthenticate.disable();
                    this.buttonChangePassword.enable();

                    this.choosePassword.focus();
                },
                fail: function(reason) {
                    this.currentPassword.markInvalid("You've entered an invalid password.");
                    this.currentPassword.focus();
                },
                scope: this,
            });
        }
    },

    changePassword: function() {
        if (this.form.getForm().isValid()) {
            var password = this.choosePassword.getValue();

            FEMhub.RPC.User.changePassword({password: password}, {
                okay: function(result) {
                    this.close();
                    FEMhub.msg.info(this, "Password was changed successfully.");
                },
                scope: this,
            });
        }
    },
});

