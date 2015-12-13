
Ext.apply(Ext.form.VTypes, {
    password: function(value, field) {
        if (!field.relatedField) {
            return true;
        } else {
            var relatedField = field.relatedField;

            if (Ext.isString(relatedField)) {
                relatedField = Ext.getCmp(relatedField);
            } else if (Ext.isFunction(relatedField)) {
                relatedField = relatedField();
            }

            return value === relatedField.getValue();
        }
    },

    passwordText: "Passwords don't match.",

    emailText: "Enter a valid E-mail address, e.g. user@example.com",
});

