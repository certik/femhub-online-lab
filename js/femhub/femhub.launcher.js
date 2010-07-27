
FEMhub.Launcher = Ext.extend(Ext.Component, {

    constructor: function(config) {
        this.addEvents({
            'click': true,
        });

        FEMhub.Launcher.superclass.constructor.call(this, config);
    },

    onRender: function(container, position) {
        FEMhub.Launcher.superclass.onRender.apply(this, arguments);

        var tpl = new Ext.Template([
            '<dl>',
            '    <dt>',
            '        <img src="{1}"></img>',
            '        <div style="background-color: 0xffffff">{0}</div>',
            '    </dt>',
            '</dl>',
        ]);

        tpl.append(this.el, [this.text, this.icon]);
    },
});

