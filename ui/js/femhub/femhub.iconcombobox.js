
FEMhub.IconComboBox = Ext.extend(Ext.form.ComboBox, {
    iconClsPrefix: '',

    constructor: function(config){
        FEMhub.IconComboBox.superclass.constructor.call(this, config);

        this.tpl = config.tpl ||
            '<tpl for="."><div class="x-combo-list-item x-icon-combo-item ' +
            this.iconClsPrefix + '{' + this.valueField + '}">{' +
            this.displayField + '}</div></tpl>';
    },

    onRender: function() {
        FEMhub.IconComboBox.superclass.onRender.apply(this, arguments);

        this.el.addClass('x-icon-combo-input');

        this.flag = Ext.DomHelper.append(this.el.parent(), {
            tag: 'div', style: 'position: absolute'
        });
    },

    setIconCls: function() {
        this.flag.className = 'x-icon-combo-icon ' + this.iconClsPrefix + this.getValue();
    },

    setValue: function(value) {
        FEMhub.IconComboBox.superclass.setValue.call(this, value);
        this.setIconCls();
    },
});

Ext.reg('iconcombo', FEMhub.IconComboBox);

