
FEMhub.IOCell = Ext.extend(FEMhub.Cell, {
    ctype: 'io',
    labelPrefix: null,

    initComponent: function() {
        FEMhub.IOCell.superclass.initComponent.call(this);

    },

    showLabel: function() {
        this.el_label.show();
    },

    hideLabel: function() {
        this.el_label.hide();
    },

    getLabel: function() {
        return this.el_label.dom.innerHTML;
    },

    setLabel: function(value) {
        if (Ext.isDefined(value)) {
            this.el_label.update(value);
        } else {
            this.el_label.update(this.labelPrefix + '[' + this.owner.evalIndex + ']: ');
        }
    },

    clearLabel: function() {
        this.setLabel();
        this.hideLabel();
    },

    setRowsCols: function(text) {
        var rows = text.replace(/[^\n]/g, '').length + 1;
        var cols = text.split();

        for (var i = 0; i < cols.length; i++) {
            cols[i] = cols[i].length;
        }

        cols = Ext.max(cols);

        this.el_textarea.dom.rows = rows;
        this.el_textarea.dom.cols = cols;
    },

    getSelection: function() {
        var dom = this.el_textarea.dom;

        if (Ext.isDefined(dom.selectionStart)) {
            return {
                start: dom.selectionStart,
                end: dom.selectionEnd,
            };
        } else {
            return null; /* TODO: IE */
        }
    },

    setSelection: function(obj) {
        var dom = this.el_textarea.dom;

        if (Ext.isDefined(dom.selectionStart)) {
            if (obj === 'start') {
                dom.setSelectionRange(0, 0);
            } else if (obj === 'end') {
                var end = this.getText().length;
                dom.setSelectionRange(end, end);
            } else if (Ext.isNumber(obj)) {
                dom.setSelectionRange(obj, obj);
            } else {
                dom.setSelectionRange(obj.start, obj.end);
            }
        }

        /* TODO: IE */
    },

    setupIOCellObserver: function() {
        /* pass */
    },

    setupIOCellEvents: function() {
        this.el_expander.on('focus', this.focusCell, this);
        this.el_expander.on('blur', this.blurCell, this);

        this.on('collapsed', function() {
            this.el_expander.show();
            this.focusCell();
        }, this);

        this.on('expanding', function() {
            this.el_expander.hide();
        }, this);

        this.on('expanded', function() {
            this.focusCell();
        }, this);
    },

    onRender: function() {
        FEMhub.IOCell.superclass.onRender.apply(this, arguments);

        this.el.addClass('femhub-cell-io');

        this.el_expander = this.el.createChild({
            tag: 'textarea',
            cls: 'femhub-cell-expander',
        });

        this.el_expander.dom.setAttribute('readOnly', 'readonly');

        this.el_label = this.el.createChild({
            tag: 'div',
            cls: 'femhub-cell-io-label',
            html: this.labelPrefix + '[' + this.owner.evalIndex + ']: ',
        });

        this.el_content = this.el.createChild({
            tag: 'div',
            cls: 'femhub-cell-io-content',
        });

        this.setupIOCellObserver();
        this.setupIOCellEvents();
    },

    onFocusCell: function() {
        FEMhub.IOCell.superclass.onFocusCell.apply(this, arguments);
        this.el_textarea.addClass('femhub-focus');
        this.el_textarea.focus();
    },

    onBlurCell: function() {
        FEMhub.IOCell.superclass.onBlurCell.apply(this, arguments);
        this.el_textarea.removeClass('femhub-focus');
        this.el_textarea.blur();
    },

    autosize: function() {
        var width = this.el_label.getTextWidth(this.el_label.dom.innerHTML.replace(/ /g, 'x')) + 'px';
        this.el_content.applyStyles({'margin-left': width});
    },

    insertInputCellBefore: function() {
        this.blurCell();

        var cell = this.owner.newCell({ type: 'input', before: this });
        cell.focusCell();

        return cell;
    },

    insertInputCellAfter: function() {
        this.blurCell();

        var cell = this.owner.newCell({ type: 'input', after: this });
        cell.focusCell();

        return cell;
    },

    removeCell: function() {
        if (this.owner.moveForwardOnRemove) {
            if (this.isLastCell()) {
                this.prevCell();
            } else {
                this.nextCell();
            }
        } else {
            if (this.isFirstCell()) {
                this.nextCell();
            } else {
                this.prevCell();
            }
        }

        FEMhub.IOCell.superclass.removeCell.call(this);
    },
});

