
FEMhub.Button = Ext.extend(Ext.Button, {
    showArrow: false,

    getMenuClass: function() {
        if (this.showArrow === false) {
            return '';
        } else {
            return FEMhub.Button.superclass.getMenuClass.call(this);
        }
    },
});

Ext.reg('x-femhub-button', FEMhub.Button);

