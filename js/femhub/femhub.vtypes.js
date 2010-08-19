
Ext.apply(Ext.form.VTypes, {
    password: function(value, field) {
        if (field.initialPasswordField) {
            var pwdElt = Ext.getCmp(field.initialPasswordField);
            this.passwordText = this.passwordConfirmText;
            return value == pwdElt.getValue();
        } else {
            this.passwordText = this.passwordDefaultText;

            var hasSpecial = value.match(/[0-9!@#\$%\^&\*\(\)\-_=\+]+/i);
            var hasLength = (value.length >= 5);

            return hasSpecial && hasLength;
        }
    },

    passwordDefaultText: 'Passwords must be at least 5 characters, containing either a number, or a valid special character (!@#$%^&*()-_=+)',
    passwordConfirmText: 'Confirmation does not match your intial password entry.',
});

