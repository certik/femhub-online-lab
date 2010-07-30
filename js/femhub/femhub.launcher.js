
FEMhub.Launcher = Ext.extend(Ext.Component, {
    launcherText: null,
    launcherIcon: null,

    constructor: function(config) {
        this.addEvents({
            'click': true,
            'dblclick': true,
            'contextmenu': true,
        });

        FEMhub.Launcher.superclass.constructor.call(this, config);
    },

    onRender: function(container, position) {
        FEMhub.Launcher.superclass.onRender.apply(this, arguments);

        this.el.addClass('femhub-launcher-wrap');

        this.elLink = this.el.createChild({
            tag: 'a',
            href: '#',
            cls: 'femhub-launcher-link',
        });

        this.elIcon = this.elLink.createChild({
            tag: 'div',
            cls: 'femhub-launcher-icon ' + this.launcherIcon,
        });

        this.elText = this.elLink.createChild({
            tag: 'div',
            cls: 'femhub-launcher-text',
            html: this.launcherText,
        });

        this.elLink.addClassOnFocus('femhub-highlight');
        this.elLink.on('click', function() {
            this.elLink.focus();
        }, this);

        this.elLink.on('click', this.handleClick, this, {preventDefault: true});
        this.elLink.on('dblclick', this.handleDblClick, this, {preventDefault: true});
        this.elLink.on('contextmenu', this.handleContextMenu, this, {preventDefault: true});

        this.el.initDDProxy('launchers', {}, {
            startDrag: function(x, y) {
                var dd = Ext.get(this.getDragEl());
                var el = Ext.get(this.getEl());

                dd.update(el.dom.innerHTML);
                dd.applyStyles({border: 'none'});
                dd.addClass('femhub-launcher-drag');

                this.constrainTo('femhub-desktop');
            },

            afterDrag: function() {
                // TODO: save new position
            },
        });
    },

    handleClick: function() {
        this.fireEvent('click', this);
    },

    handleDblClick: function() {
        this.fireEvent('dblclick', this);
    },

    handleContextMenu: function() {
        this.fireEvent('contextmenu', this);
    },
});

