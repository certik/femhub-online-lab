
Ext.apply(Ext.form.VTypes, {
    password: function(value, field) {
        if (!field.relatedField) {
            return true;
        } else {
            var related = Ext.getCmp(field.relatedField);
            return value === related.getValue();
        }
    },

    passwordText: "Passwords don't match.",
});

