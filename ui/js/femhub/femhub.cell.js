
FEMhub.Cell = Ext.extend(Ext.BoxComponent, {
    ctype: 'base',

    saved: false,

    collapsed: false,
    hiddenEl: null,
    bindings: {},

    constructor: function(config) {
        if (Ext.isDefined(config.setup)) {
            Ext.apply(this, config.setup);
            config.setup = undefined;
        }

        if (!Ext.isDefined(config.id)) {
            config.id = FEMhub.util.unique();
        }

        FEMhub.Cell.superclass.constructor.apply(this, arguments);

        Ext.apply(this.bindings, {
            x_shift_alt_up: {
                key: Ext.EventObject.UP,
                shift: true,
                ctrl: false,
                alt: true,
                scope: this,
                stopEvent: true,
                handler: this.insertTextCellBefore,
            },
            x_shift_alt_down: {
                key: Ext.EventObject.DOWN,
                shift: true,
                ctrl: false,
                alt: true,
                scope: this,
                stopEvent: true,
                handler: this.insertTextCellAfter,
            },
        });
    },

    initComponent: function() {
        FEMhub.Cell.superclass.initComponent.call(this);

        this.addEvents('collapsing', 'collapsed', 'expanding', 'expanded');
    },

    setupCellObserver: function() {
        /* pass */
    },

    setupCellEvents: function() {
        this.el_bracket.on('click', this.collapseCell, this, { stopEvent: true });
    },

    setupCellKeyMap: function() {
        /* pass */
    },

    onRender: function(container, position) {
        FEMhub.Cell.superclass.onRender.apply(this, arguments);

        this.el.addClass('femhub-cell');

        if (Ext.isDefined(this.initFontSize)) {
            this.setFontSize(this.initFontSize);
        }

        this.el_bracket = this.el.createChild({
            tag: 'div',
            cls: 'femhub-cell-bracket',
            children: {
                tag: 'div',
                cls: 'femhub-cell-triangle',
            },
        });

        this.setupCellObserver();
        this.setupCellEvents();
        this.setupCellKeyMap();
    },

    onFocusCell: function() {
         /* pass */
    },

    onBlurCell: function() {
         /* pass */
    },

    focusCell: function() {
        if (this.collapsed) {
            this.el.addClass('femhub-focus');
            this.el_expander.focus();
        } else {
            this.onFocusCell();
        }
    },

    blurCell: function() {
        if (this.collapsed) {
            this.el.removeClass('femhub-focus');
            this.el_expander.blur();
        } else {
            this.onBlurCell();
        }
    },

    getFirstCell: function(type) {
        return this.owner.getFirstCell(type);
    },

    getLastCell: function(type) {
        return this.owner.getLastCell(type);
    },

    isFirstCell: function(type) {
        return this.getFirstCell(type).id == this.id;
    },

    isLastCell: function(type) {
        return this.getLastCell(type).id == this.id;
    },

    getNextCell: function(type) {
        return this.owner.getNextCell(this.id, type);
    },

    getPrevCell: function(type) {
        return this.owner.getPrevCell(this.id, type);
    },

    collapseCell: function() {
        this.fireEvent('collapsing', this);

        var children = Ext.query('*', this.el.dom);
        this.hiddenEl = [];

        Ext.each(children, function(child) {
            var el = Ext.get(child);

            if (el.isVisible()) {
                this.hiddenEl.push(el);
                el.hide();
            }
        }, this);

        this.el.on('click', this.expandCell, this, { stopEvent: true });

        this.el_expand_triangle = this.el.createChild({
            tag: 'div',
            cls: 'femhub-cell-triangle',
        });

        this.el.addClass('femhub-cell-collapsed');
        this.el.addClass('femhub-enabled');
        this.collapsed = true;

        this.fireEvent('collapsed', this);
    },

    expandCell: function() {
        this.fireEvent('expanding', this);

        this.el.un('click', this.expandCell, this);
        this.el_expand_triangle.remove();

        this.el.removeClass('femhub-cell-collapsed');
        this.el.removeClass('femhub-enabled');
        this.collapsed = false;

        Ext.each(this.hiddenEl, function(el) {
            el.show();
        }, this);

        this.hiddenEl = null;

        this.fireEvent('expanded', this);
    },

    nextCell: function(type) {
        var cell = this.getNextCell(type);

        if (cell === null) {
            if (this.owner.cycleCells) {
                cell = this.getFirstCell(type);
            } else {
                return null;
            }
        }

        this.blurCell();
        cell.focusCell();

        return cell;
    },

    prevCell: function(type) {
        var cell = this.getPrevCell(type);

        if (cell === null) {
            if (this.owner.cycleCells) {
                var cell = this.getLastCell(type);
            } else {
                return null;
            }
        }

        this.blurCell();
        cell.focusCell();

        return cell;
    },

    autosize: function() {
        /* pass */
    },

    insertTextCellBefore: function() {
        return this.owner.newCell({ type: 'content', before: this });
    },

    insertTextCellAfter: function() {
        return this.owner.newCell({ type: 'content', after: this });
    },

    removeCell: function() {
        this.owner.statusSaved = false;
        this.destroy();
    },

    setSaved: function() {
        this.saved = true;
    },

    setUnsaved: function() {
        this.saved = false;
    },

    createContextMenu: function(items) {
        items = items || [];

        if (this.collapsed === true) {
            items.push({
                text: 'Expand',
                iconCls: 'femhub-expand-icon',
                handler: function() {
                    this.expandCell();
                },
                scope: this,
            });
        } else {
            items.push({
                text: 'Collapse',
                iconCls: 'femhub-collapse-icon',
                handler: function() {
                    this.collapseCell();
                },
                scope: this,
            });
        }

        items = items.concat([{
            text: 'Remove',
            iconCls: 'femhub-remove-icon',
            handler: function() {
                this.removeCell();
            },
            scope: this,
        }]);

        var context = new Ext.menu.Menu({
            items: items,
        });

        return context;
    },

    setFontSize: function(size) {
        this.el.setStyle('font-size', size + '%');
    },
});

