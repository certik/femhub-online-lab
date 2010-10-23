
FEMhub.Launcher = Ext.extend(Ext.Component, {
    launcherText: null,
    launcherIcon: null,

    constructor: function(config) {
        this.addEvents(['click', 'dblclick', 'contextmenu']);
        FEMhub.Launcher.superclass.constructor.call(this, config);
    },

    onRender: function() {
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

        this.elLink.on('click', this.onClick, this, {stopEvent: true});
        this.elLink.on('dblclick', this.onDblClick, this, {stopEvent: true});
        this.elLink.on('contextmenu', this.onContextMenu, this, {stopEvent: true});

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

    onClick: function(evt) {
        if (!this.disabled) {
            this.elLink.focus();
            this.fireEvent('click', this, evt);
        }
    },

    onDblClick: function(evt) {
        if (!this.disabled) {
            this.fireEvent('dblclick', this, evt);
        }
    },

    onContextMenu: function(evt) {
        if (!this.disabled) {
            this.fireEvent('contextmenu', this, evt);
        }
    },
});

