
FEMhub.OutputCell = Ext.extend(FEMhub.IOCell, {
    ctype: 'output',

    labelPrefix: 'Out',
    myInputCell: null,

    initComponent: function() {
        FEMhub.OutputCell.superclass.initComponent.call(this);

        Ext.apply(this.bindings, {
            x_backspace: {
                key: Ext.EventObject.BACKSPACE,
                shift: false,
                ctrl: false,
                alt: false,
                scope: this,
                stopEvent: true,
                handler: this.removeCell,
            },
        });
    },

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
       if (this.myInputCell === null) {
           return null;
       } else {
           var elt = Ext.get(this.myInputCell.id);

           if (elt === null || !Ext.isDefined(elt)) {
               return null;
           } else {
               return this.myInputCell;
           }
       }
    },

    setupOutputCellObserver: function() {
        /* pass */
    },

    setupOutputCellEvents: function() {
        this.el_textarea.on('focus', this.focusCell, this);
        this.el_textarea.on('blur', this.blurCell, this);
    },

    setupOutputCellKeyMap: function() {
        this.keymap_textarea_stop = new Ext.KeyMap(this.el_textarea, [
            this.bindings.x_backspace,
            this.bindings.x_ctrl_up, this.bindings.x_ctrl_down,
            this.bindings.x_alt_up, this.bindings.x_alt_down,
            this.bindings.x_alt_left,
            this.bindings.x_ctrl_space,
        ]);

        this.keymap_textarea_nostop = new Ext.KeyMap(this.el_textarea, [
            this.bindings.x_up, this.bindings.x_down,
        ]);
    },

    onRender: function(container, position) {
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
        this.setupOutputCellKeyMap();
    },

    insertInputCellBefore: function() {
        this.blurCell();

        var before = this.getInputCell();

        if (before === null) {
            before = this;
        }

        var cell = this.owner.newCell({ type: 'input', before: before });
        cell.focusCell();

        return cell;
    },
});

