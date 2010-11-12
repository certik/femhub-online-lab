
FEMhub.OutputCell = Ext.extend(FEMhub.IOCell, {
    ctype: 'output',

    labelPrefix: 'Out',

    getOutput: function() {
        var output = this.el_textarea.dom.innerHTML;

        output = output.replace(/&amp;/g, '&');

        output = output.replace(/&lt;/g, '<');
        output = output.replace(/&gt;/g, '>');

        return output;
    },

    setOutput: function(output) {
        output = output.replace(/&/g, '&amp;');

        output = output.replace(/</g, '&lt;');
        output = output.replace(/>/g, '&gt;');

        this.el_textarea.dom.innerHTML = output;
    },

    getText: function() {
        return this.getOutput();
    },

    setText: function(output) {
        return this.setOutput(output);
    },

    getInputCell: function() {
       return Ext.getCmp(this.id.slice(0, this.id.indexOf('o'))) || null;
    },

    setupOutputCellObserver: function() {
        /* pass */
    },

    setupOutputCellEvents: function() {
        this.el_textarea.on('focus', this.focusCell, this);
        this.el_textarea.on('blur', this.blurCell, this);
    },

    onRender: function() {
        FEMhub.OutputCell.superclass.onRender.apply(this, arguments);

        this.el.addClass('femhub-cell-output');

        this.el_textarea = this.el_content.createChild({
            tag: 'div',
            cls: 'femhub-cell-io-textarea femhub-cell-output-textarea',
        });

        this.el_textarea.dom.setAttribute('tabIndex', '0');

        this.autosize();

        this.setupOutputCellObserver();
        this.setupOutputCellEvents();
    },

    getBaseCellForInsertBefore: function() {
        return this.getInputCell() || this;
    },

    getBaseCellForInsertAfter: function() {
        var cell = this.getInputCell();

        if (cell === null) {
            return this;
        } else {
            var cells = cell.getOutputCells();
            return cells[cells.length-1];
        }
    },

    backspace: function() {
        this.removeCell();
    },
});

