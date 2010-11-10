
Ext.apply(Ext.form.VTypes, {
    password: function(value, field) {
        if (!field.relatedField) {
            return true;
        } else {
            var relatedField;

            if (Ext.isString(field.relatedField)) {
                relatedField = Ext.getCmp(field.relatedField);
            } else {
                relatedField = field.relatedField;
            }

            return value === relatedField.getValue();
        }
    },

    passwordText: "Passwords don't match.",

    emailText: "Enter a valid E-mail address, e.g. user@example.com",
});

