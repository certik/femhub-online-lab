
FEMhub.Cell = Ext.extend(Ext.BoxComponent, {
    ctype: 'base',

    saved: false,
    focused: false,
    collapsed: false,

    constructor: function(config) {
        if (Ext.isDefined(config.setup)) {
            Ext.apply(this, config.setup);
            config.setup = undefined;
        }

        if (!Ext.isDefined(config.id)) {
            config.id = FEMhub.util.unique();
        }

        FEMhub.Cell.superclass.constructor.apply(this, arguments);
    },

    setupCellObserver: function() {
        /* pass */
    },

    setupCellEvents: function() {
        this.el_bracket.on('click', this.collapseCell, this, { stopEvent: true });
    },

    onRender: function() {
        FEMhub.Cell.superclass.onRender.apply(this, arguments);

        this.el.addClass('femhub-cell');

        if (Ext.isDefined(this.initFontSize)) {
            this.setFontSize(this.initFontSize);
        }

        this.el_bracket = this.el.createChild({
            tag: 'div',
            cls: 'femhub-cell-bracket',
        });

        this.el_triangle = this.el_bracket.createChild({
            tag: 'div',
            cls: 'femhub-cell-triangle',
        });

        this.setupCellObserver();
        this.setupCellEvents();
    },

    afterRender: function() {
        FEMhub.Cell.superclass.afterRender.apply(this);

        var initialText = this.initialText;

        if (Ext.isDefined(initialText)) {
            delete this.initialText;
            this.setText(initialText);
        }

        var startCollapsed = this.startCollapsed;

        if (Ext.isDefined(startCollapsed)) {
            delete this.startCollapsed;

            if (startCollapsed === true) {
                this.collapseCell();
            }
        }
    },

    onFocusCell: function() {
         /* pass */
    },

    onBlurCell: function() {
         /* pass */
    },

    focusCell: function() {
        var active = this.owner.activeCell;

        if (active && active !== this && active.focused) {
            active.blurCell();
        }

        this.owner.activeCell = this;
        this.focused = true;

        if (this.collapsed) {
            this.el.addClass('femhub-focus');
        } else {
            this.onFocusCell();
        }
    },

    blurCell: function() {
        this.focused = false;

        if (this.collapsed) {
            this.el.removeClass('femhub-focus');
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

    onCollapseCell: function() {
        var children = Ext.query('*', this.el.dom);

        Ext.each(children, function(child) {
            child = Ext.get(child);

            if (child !== this.el_triangle) {
                child.hide();
            }
        }, this);
    },

    onExpandCell: function() {
        var children = Ext.query('*', this.el.dom);

        Ext.each(children, function(child) {
            child = Ext.get(child);

            if (child !== this.el_triangle) {
                child.show();
            }
        }, this);
    },

    collapseCell: function() {
        this.onCollapseCell();

        this.el.on('click', this.expandCell, this, {stopEvent: true});

        this.el_expand_triangle = this.el.createChild({
            tag: 'div',
            cls: 'femhub-cell-triangle',
        });

        this.el.addClass('femhub-cell-collapsed');
        this.el.addClass('femhub-enabled');
        this.collapsed = true;

        this.focusCell();
    },

    expandCell: function() {
        this.el.un('click', this.expandCell, this);
        this.el_expand_triangle.remove();

        this.el.removeClass('femhub-cell-collapsed');
        this.el.removeClass('femhub-enabled');
        this.collapsed = false;

        this.onExpandCell();
        this.focusCell();
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
                cell = this.getLastCell(type);
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

    hasFocus: function() {
        return this.focused;
    },

    handlePrev: function(evt) {
        evt.stopEvent();
        this.owner.activatePrevCell(this);
    },

    handleNext: function(evt) {
        evt.stopEvent();
        this.owner.activateNextCell(this);
    },

    getBaseCellForInsertBefore: function() {
        return this;
    },

    getBaseCellForInsertAfter: function() {
        return this;
    },

    insertInputCellBefore: function() {
        var base = this.getBaseCellForInsertBefore();
        return this.owner.insertCellBefore('input', base);
    },

    insertInputCellAfter: function() {
        var base = this.getBaseCellForInsertAfter();
        return this.owner.insertCellAfter('input', base);
    },

    insertTextCellBefore: function() {
        var base = this.getBaseCellForInsertBefore();
        return this.owner.insertCellBefore('text', base);
    },

    insertTextCellAfter: function() {
        var base = this.getBaseCellForInsertAfter();
        return this.owner.insertCellAfter('text', base);
    },
});

