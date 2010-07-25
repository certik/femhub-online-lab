
FEMhub.InputCell = Ext.extend(FEMhub.IOCell, {
    ctype: 'input',

    labelPrefix: 'In ',
    myOutputCell: null,

    evaluating: false,

    observedInputLength: 0,
    observationInterval: 250,

    initComponent: function() {
        FEMhub.InputCell.superclass.initComponent.call(this);

        this.addEvents('preevaluate', 'postevaluate');

        Ext.apply(this.bindings, {
            x_tab: {
                key: Ext.EventObject.TAB,
                shift: false,
                ctrl: false,
                alt: false,
                scope: this,
                stopEvent: true,
                handler: function() {
                    var selection = this.getSelection();

                    if (selection.start == selection.end) {
                        var input = this.getInput();
                        var pos = selection.start;

                        var head = input.slice(0, pos);
                        var tail = input.slice(pos);

                        for (var i = 0; i < this.owner.tabWidth; i++) {
                            head += ' ';
                        }

                        this.setInput(head + tail);
                        this.setSelection(pos + this.owner.tabWidth);
                    }
                },
            },
            x_shift_tab: {
                key: Ext.EventObject.TAB,
                shift: true,
                ctrl: false,
                alt: false,
                scope: this,
                stopEvent: true,
                handler: Ext.emptyFn,
            },
            x_shift_enter: {
                key: Ext.EventObject.ENTER,
                shift: true,
                ctrl: false,
                alt: false,
                scope: this,
                stopEvent: true,
                handler: function() {
                    this.evaluateCell({ keepfocus: false });
                },
            },
            x_ctrl_enter: {
                key: Ext.EventObject.ENTER,
                shift: false,
                ctrl: true,
                alt: false,
                scope: this,
                stopEvent: true,
                handler: function() {
                    this.evaluateCell({ keepfocus: true });
                },
            },
            x_enter: {
                key: Ext.EventObject.ENTER,
                shift: false,
                ctrl: false,
                alt: false,
                scope: this,
                stopEvent: true,
                handler: this.newline,
            },
            x_backspace: {
                key: Ext.EventObject.BACKSPACE,
                shift: false,
                ctrl: false,
                alt: false,
                scope: this,
                stopEvent: true,
                handler: this.backspace,
            },
            x_ctrl_space: {
                key: Ext.EventObject.SPACE,
                shift: false,
                ctrl: true,
                alt: false,
                scope: this,
                stopEvent: false,
                handler: this.autocomplete,
            },
            x_shift_ctrl_alt_up: {
                key: Ext.EventObject.UP,
                shift: true,
                ctrl: true,
                alt: true,
                scope: this,
                stopEvent: true,
                handler: this.mergeCellBefore,
            },
            x_shift_ctrl_alt_down: {
                key: Ext.EventObject.DOWN,
                shift: true,
                ctrl: true,
                alt: true,
                scope: this,
                stopEvent: true,
                handler: this.mergeCellAfter,
            },
        });
    },

    getInput: function() {
        return this.el_textarea.getValue();
    },

    setInput: function(text) {
        this.setRowsCols(text);
        this.el_textarea.dom.value = text;
    },

    getText: function() {
        return this.getInput();
    },

    setText: function(input) {
        return this.setInput(input);
    },

    getOutputCell: function() {
       if (this.myOutputCell === null) {
           var cmp = Ext.getCmp(this.id + 'o');

           if (cmp === null || !Ext.isDefined(cmp)) {
               return null;
           } else {
               return cmp;
           }
       } else {
           var elt = Ext.get(this.myOutputCell.id);

           if (elt === null || !Ext.isDefined(elt)) {
               return null;
           } else {
               return this.myOutputCell;
           }
       }
    },

    destroyOutputCellIfCan: function() {
        var cell = this.getOutputCell();

        if (cell !== null) {
            cell.destroy();
        }
    },

    setupInputCellObserver: function() {
        var observer = {
            run: function() {
                var input = this.getInput();

                if (input.length != this.observedInputLength) {
                    this.observedInputLength = input.length;
                    this.autosize();
                }
            },
            scope: this,
            interval: this.observationInterval,
        };

        Ext.TaskMgr.start(observer);
    },

    setupInputCellEvents: function() {
        this.el_textarea.on('focus', this.focusCell, this);
        this.el_textarea.on('blur', this.blurCell, this);

        this.el_evaluate.on('click', function() {
            this.evaluateCell({ keepfocus: true });
        }, this);
        this.el_clear.on('click', this.clearCell, this);
        this.el_interrupt.on('click', this.interruptCell, this);
    },

    setupInputCellKeyMap: function() {
        this.keymap_textarea_stop = new Ext.KeyMap(this.el_textarea, [
            this.bindings.x_tab, this.bindings.x_shift_tab,
            this.bindings.x_enter, this.bindings.x_backspace,
            this.bindings.x_shift_enter, this.bindings.x_ctrl_enter,
            this.bindings.x_ctrl_up, this.bindings.x_ctrl_down,
            this.bindings.x_alt_up, this.bindings.x_alt_down,
            this.bindings.x_shift_ctrl_alt_up, this.bindings.x_shift_ctrl_alt_down,
            this.bindings.x_alt_left,
            this.bindings.x_ctrl_space,
        ]);

        this.keymap_textarea_nostop = new Ext.KeyMap(this.el_textarea, [
            this.bindings.x_up, this.bindings.x_down,
        ]);
    },

    onRender: function(container, position) {
        FEMhub.InputCell.superclass.onRender.apply(this, arguments);

        this.el.addClass('femhub-cell-input');

        var ta_form = "<textarea class='{0}' rows='{1}' cols='{2}' wrap='{3}' spellcheck='{4}'></textarea>";
        var ta_args = ['femhub-cell-io-textarea femhub-cell-input-textarea', '1', '0', 'off', 'false'];
        var ta_tmpl = new Ext.DomHelper.createTemplate(ta_form);

        this.el_textarea = ta_tmpl.append(this.el_content, ta_args, true);

        this.el_controls = this.el_content.createChild({
            tag: 'div',
            cls: 'femhub-cell-input-controls',
            children: [
                {
                    tag: 'div',
                    cls: 'femhub-cell-input-control femhub-cell-input-evaluate femhub-enabled',
                    html: 'evaluate',
                }, {
                    tag: 'div',
                    cls: 'femhub-cell-input-control femhub-cell-input-clear femhub-enabled',
                    html: 'clear',
                }, {
                    tag: 'div',
                    cls: 'femhub-cell-input-control femhub-cell-input-interrupt',
                    html: 'interrupt',
                },
            ],
        });

        if (Ext.isChrome) {
            this.el_controls.addClass('femhub-chrome');
        }

        if (this.owner.showInputControls) {
            this.el_controls.addClass('femhub-enabled');
        }

        this.el_evaluate = this.el_controls.child('.femhub-cell-input-evaluate');
        this.el_clear = this.el_controls.child('.femhub-cell-input-clear');
        this.el_interrupt = this.el_controls.child('.femhub-cell-input-interrupt');

        this.autosize();

        this.setupInputCellObserver();
        this.setupInputCellEvents();
        this.setupInputCellKeyMap();

        if (this.start === true) {
            // TODO: this.el_textarea.update("Click here to start ...");
        }
    },

    onFocusCell: function() {
        FEMhub.InputCell.superclass.onFocusCell.apply(this, arguments);

        if (!this.owner.showInputControls) {
            this.el_controls.addClass('femhub-enabled');
        }
    },

    onBlurCell: function() {
        FEMhub.InputCell.superclass.onBlurCell.apply(this, arguments);

        if (!this.owner.showInputControls) {
            this.el_controls.removeClass('femhub-enabled');
        }
    },

    autosize: function() {
        FEMhub.InputCell.superclass.autosize.apply(this, arguments);

        if (!this.collapsed) {
            this.setRowsCols(this.getInput());
        }
    },

    newline: function() {
        var input = this.getInput();
        var selection = this.getSelection();

        var pos = selection.start;

        if (selection.start == selection.end) {
            if (pos == 0) {
                input = '\n' + input;
                pos += 1;
            } else {
                var insert = '\n';
                var i = pos;

                while (i > 0) {
                    if (input[i-1] == '\n') {
                        break;
                    } else {
                        i--;
                    }
                }

                while (input[i++] == ' ') {
                    insert += ' ';
                }

                if (input[pos-1] == ':') {
                    for (var i = 0; i < this.owner.tabWidth; i++) {
                        insert += ' ';
                    }
                }

                input = input.slice(0, pos) + insert + input.slice(pos);
                pos += insert.length;
            }
        } else {
            input = input.slice(0, selection.start) + input.slice(selection.end);
        }

        this.setInput(input);
        this.autosize();

        this.setSelection({ start: pos, end: pos });
    },

    backspace: function() {
        var input = this.getInput();
        var selection = this.getSelection();

        var pos = selection.start;

        if (selection.start == selection.end) {
            if (pos == 0) {
                if (this.owner.mergeOnBackspace) {
                    var result = this.mergeCellBefore();
                } else {
                    var result = false;
                }

                if (!result && (input.length == 0)) {
                    this.removeCell();
                }

                return;
            }

            var i = pos, dirty = false;

            loop: while (i > 0) {
                switch (input[i-1]) {
                    case ' ':
                        i--;
                        break;
                    case '\n':
                        break loop;
                    default:
                        dirty = true;
                        break loop;
                }
            }

            var end = pos;

            if (dirty || i == pos) {
                --pos;
            } else {
                pos = Ext.max([i, pos - this.owner.tabWidth])
            }

            input = input.slice(0, pos) + input.slice(end);
        } else {
            input = input.slice(0, selection.start) + input.slice(selection.end);
        }

        this.setInput(input);
        this.autosize();

        this.setSelection({ start: pos, end: pos });
    },

    autocomplete: function() {
        var menu = new Ext.menu.Menu({
            id: 'femhub-completion-menu',
            items: [],
        });

        menu.showAt([0, 0]);
    },

    evaluateCell: function(config) {
        config = config || {};

        var input = this.getInput();

        this.fireEvent('preevaluate', this, input);

        this.el_evaluate.removeClass('femhub-enabled');
        this.el_clear.removeClass('femhub-enabled');
        this.el_interrupt.addClass('femhub-enabled');

        this.evaluating = true;

        function evalSuccess(ctype, output) {
            this.evaluating = false;

            this.el_evaluate.addClass('femhub-enabled');
            this.el_clear.addClass('femhub-enabled');
            this.el_interrupt.removeClass('femhub-enabled');

            this.owner.nextEvalIndex();

            this.setLabel();
            this.autosize();
            this.showLabel();

            if (output.length > 0) {
                if (/\n$/.test(output)) {
                    output = output.slice(0, output.length-1);
                }

                var cell = this.getOutputCell();

                if (cell !== null && cell.ctype !== ctype) {
                    cell.destroy();
                    cell = null;
                }

                if (cell === null) {
                    cell = this.owner.newCell({
                        type: ctype,
                        after: this,
                        setup: {
                            id: this.id + 'o',
                            myInputCell: this,
                        },
                    });
                }

                this.myOutputCell = cell;

                cell.setLabel();
                cell.setOutput(output);
                cell.autosize();
                cell.showLabel();
                cell.saved = false;
            }

            if (config.keepfocus === true) {
                this.focusCell(); /* needed for 'evaluate' button */
            } else {
                if (this.owner.newCellOnEval || this.isLastCell('input')) {
                    this.insertInputCellAfter();
                } else {
                    this.nextCell('input');
                }
            }

            this.saved = false;

            this.fireEvent('postevaluate', this, input, output);
        }

        function evalFailure(output) {
            this.evaluating = false;

            this.el_evaluate.addClass('femhub-enabled');
            this.el_clear.addClass('femhub-enabled');
            this.el_interrupt.removeClass('femhub-enabled');

            FEMhub.log(output);
        }

        Ext.Ajax.request({
            url: this.owner.getAsyncURL(),
            method: "POST",
            params: Ext.encode({
                method: 'evaluate',
                cellid: this.id,    // XXX: currently not supported
                input: input,
            }),
            success: function(result, request) {
                var result = Ext.decode(result.responseText);

                switch (result.cellstyle) {
                    case 'outputtext':
                        var ctype = 'output';
                        break;
                    case 'outputimage':
                        var ctype = 'image';
                        break;
                    default:
                        return evalFailure('unsupported type of cell');
                }

                evalSuccess.call(this, ctype, result.out + result.err);
            },
            failure: function(result, request) {
                evalFailure.call(this, result.statusText);
            },
            scope: this,
        });
    },

    clearCell: function() {
        var cell = this.getOutputCell();

        if (cell !== null) {
            this.myOutputCell = null;
            cell.destroy();
        }

        this.setInput('');
        this.clearLabel();
        this.autosize();
        this.focusCell();
    },

    interruptCell: function() {
        if (!this.evaluating) {
            return;
        }

        Ext.Ajax.request({
            url: this.owner.getAsyncURL(),
            method: "POST",
            params: Ext.encode({
                method: 'interrupt',
            }),
            success: function(result, request) {
                this.evaluating = false;

                this.el_evaluate.addClass('femhub-enabled');
                this.el_clear.addClass('femhub-enabled');
                this.el_interrupt.removeClass('femhub-enabled');

                this.focusCell();
            },
            failure: Ext.emptyFn,
            scope: this,
        });
    },

    insertInputCellAfter: function() {
        this.blurCell();

        var after = this.getOutputCell();

        if (after === null) {
            after = this;
        }

        var cell = this.owner.newCell({ type: 'input', after: after });
        cell.focusCell();

        return cell;
    },

    mergeCellBefore: function() {
        var cell = this.getPrevCell('input');

        if (cell === null) {
            return false;
        }

        var input = cell.getInput();

        if (input.length != 0) {
            input += '\n';
        }

        var length = input.length;
        input += this.getInput();

        var selection = this.getSelection();

        selection.start += length;
        selection.end += length;

        cell.setInput(input);
        cell.setSelection(selection);

        this.destroyOutputCellIfCan();

        cell.autosize();
        cell.focusCell();
        this.destroy();

        return true;
    },

    mergeCellAfter: function() {
        var cell = this.getNextCell('input');

        if (cell === null) {
            return false;
        }

        var input = cell.getInput();

        if (input.length != 0) {
            input = '\n' + input;
        }

        input = this.getInput() + input;
        var selection = this.getSelection();

        cell.setInput(input);
        cell.setSelection(selection);

        this.destroyOutputCellIfCan();

        cell.autosize();
        cell.focusCell();
        this.destroy();

        return true;
    },

    removeCell: function() {
        this.destroyOutputCellIfCan();
        FEMhub.InputCell.superclass.removeCell.apply(this, arguments);
    },
});

