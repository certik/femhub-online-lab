
Ext.apply(Ext.form.VTypes, {
    password: function(value, field) {
        var hasSpecial = value.match(/[0-9!@#\$%\^&\*\(\)\-_=\+]+/i);
        var hasLength = (value.length >= 5);

        return hasSpecial && hasLength;
    },

    passwordText: 'Passwords must be at least 5 characters, containing either a number, or a valid special character (!@#$%^&*()-_=+)',
});

