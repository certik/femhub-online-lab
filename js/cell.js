
Ext.BLANK_IMAGE_URL = "/static/external/ext/images/default/s.gif";

var Codenode = {
    version: [0, 0, 1],
    icons: "/static/img/icons/",
    json: "/desktop/json/",
};

Codenode.log = function(text) {
    Ext.getBody().createChild({tag: 'h1', html: text});
}

Codenode.unique = function() {
    return (new Date()).getTime() + Math.random().toString().substr(2, 8);
}

Codenode.CellManager = function(config) {
    config = config || {};

    if (Ext.isDefined(config.root)) {
        config.root = Ext.get(config.root);
    }

    return Ext.apply({
        id: Codenode.unique(),

        evalIndex: 0,

        softEvalTimeout: null,
        hardEvalTimeout: null,
        newCellOnEval: false,
        cycleCells: true,
        autoJustify: true,
        tabWidth: 4,

        newInputCell: function(config) {
            config = config || {};

            var cell = new Codenode.InputCell({
                owner: this,
                start: config.start,
            });

            if (config.render !== false) {
                cell.render(this.root, config.position);
                this.root.scroll('bottom', 100);
            }

            return cell;
        },

        nextEvalIndex: function() {
            if (!this.autoJustify) {
                return ++this.evalIndex;
            } else {
                var prev = "" + this.evalIndex;
                this.evalIndex++;
                var curr = "" + this.evalIndex;

                if (prev.length != curr.length) {
                    this.justifyCells();
                }

                return this.evalIndex;
            }
        },

        getFirstCell: function() {
            return Ext.getCmp(Ext.DomQuery.selectNode(".codenode-cell-input:first", this.root.dom).id);
        },

        getLastCell: function() {
            return Ext.getCmp(Ext.DomQuery.selectNode(".codenode-cell-input:last", this.root.dom).id);
        },

        getNextCell: function(id) {
            var elt = Ext.DomQuery.selectNode(".codenode-cell-input:prev(div[id=" + id + "])", this.root.dom);

            if (Ext.isDefined(elt)) {
                return Ext.getCmp(elt.id);
            } else {
                return null;
            }
        },

        getPrevCell: function(id) {
            var elt = Ext.DomQuery.selectNode(".codenode-cell-input:next(div[id=" + id + "])", this.root.dom);

            if (Ext.isDefined(elt)) {
                return Ext.getCmp(elt.id);
            } else {
                return null;
            }
        },

        justifyCells: function() {
            var len = ('In [' + this.evalIndex + ']: ').length;

            var input = Ext.DomQuery.select(".codenode-cell-input", this.root.dom);
            var output = Ext.DomQuery.select(".codenode-cell-output", this.root.dom);

            Ext.each(input.concat(output), function(elt) {
                var cell = Ext.getCmp(elt.id);
                var label = cell.getLabel();

                for (var i = 0; i < len - label.length; i++) {
                    label += ' ';
                }

                cell.setLabel(label);
                cell.autosize();
            }, this);
        }
    }, config, {
        root: Ext.getBody(),
    });
}

Codenode.Cell = Ext.extend(Ext.BoxComponent, {
    collapsed: false,
    hiddenEl: null,

    constructor: function(config) {
        config.id = Codenode.unique();
        Codenode.Cell.superclass.constructor.apply(this, arguments);
    },

    initComponent: function() {
        Codenode.Cell.superclass.initComponent.call(this);

        this.addEvents('collapsing', 'collapsed', 'expanding', 'expanded');
    },

    setupCellEvents: function() {
        this.el_bracket.on('click', this.collapseCell, this, { stopEvent: true });
    },

    onRender: function(container, position) {
        Codenode.Cell.superclass.onRender.apply(this, arguments);

        this.el.addClass('codenode-cell');

        this.el_bracket = this.el.createChild({
            tag: 'div',
            cls: 'codenode-cell-bracket',
            children: {
                tag: 'div',
                cls: 'codenode-cell-triangle',
            },
        });

        this.setupCellEvents();
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
            cls: 'codenode-cell-triangle',
        });

        this.el.addClass('codenode-cell-collapsed');
        this.el.addClass('codenode-enabled');
        this.collapsed = true;

        this.fireEvent('collapsed', this);
    },

    expandCell: function() {
        this.fireEvent('expanding', this);

        this.el.un('click', this.expandCell, this);
        this.el_expand_triangle.remove();

        this.el.removeClass('codenode-cell-collapsed');
        this.el.removeClass('codenode-enabled');
        this.collapsed = false;

        Ext.each(this.hiddenEl, function(el) {
            el.show();
        }, this);

        this.hiddenEl = null;

        this.fireEvent('expanded', this);
    },
});

Codenode.IOCell = Ext.extend(Codenode.Cell, {
    labelPrefix: 'In ',

    initComponent: function() {
        Codenode.IOCell.superclass.initComponent.call(this);
    },

    copyFontStyles: function(from, to) {
        var styles = from.getStyles(
            'line-height', 'font-size', 'font-family', 'font-weight', 'font-style');
        to.applyStyles(styles);
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

    getText: function() {
        return this.el_textarea.getValue();
    },

    setText: function(text) {
        this.setRowsCols(text);
        this.el_textarea.dom.value = text;
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
            }
        } else {
            /* TODO */
        }
    },

    setSelection: function(obj) {
        var dom = this.el_textarea.dom;

        if (Ext.isDefined(dom.selectionStart)) {
            if (obj === 'start') {
                dom.setSelectionRange(0, 0);
            } else if (obj == 'end') {
                var end = this.getInput().length;
                dom.setSelectionRange(end, end);
            } else {
                dom.setSelectionRange(obj.start, obj.end);
            }
        } else {
            /* TODO */
        }
    },

    getFirstCell: function() {
        return this.owner.getFirstCell();
    },

    getLastCell: function() {
        return this.owner.getLastCell();
    },

    isFirstCell: function() {
        return this.getFirstCell().id == this.id;
    },

    isLastCell: function() {
        return this.getLastCell().id == this.id;
    },

    getNextCell: function() {
        return this.owner.getNextCell(this.id);
    },

    getPrevCell: function() {
        return this.owner.getPrevCell(this.id);
    },

    setupIOCellObserver: function() {
        /* pass */
    },

    setupIOCellEvents: function() {
        this.el_textarea.on('focus', this.focusCell, this);
        this.el_textarea.on('blur', this.blurCell, this);

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

    setupIOCellKeyMap: function() {
        /* pass */
    },

    onRender: function(container, position) {
        Codenode.IOCell.superclass.onRender.apply(this, arguments);

        this.el.addClass('codenode-cell-io');

        this.el_expander = this.el.createChild({
            tag: 'textarea',
            cls: 'codenode-cell-expander',
        });

        this.el_expander.dom.readonly = true;

        this.el_label = this.el.createChild({
            tag: 'div',
            cls: 'codenode-cell-io-label',
            html: this.labelPrefix + '[' + this.owner.evalIndex + ']: ',
        });

        this.el_content = this.el.createChild({
            tag: 'div',
            cls: 'codenode-cell-io-content',
        });

        var textarea = "<textarea class='codenode-cell-io-textarea' rows='1' cols='0' wrap='off'></textarea>";
        this.el_textarea = (new Ext.DomHelper.createTemplate(textarea)).append(this.el_content, [], true);

        this.autosize();

        this.setupIOCellObserver();
        this.setupIOCellEvents();
        this.setupIOCellKeyMap();
    },

    autosize: function() {
        this.copyFontStyles(this.el_textarea, this.el_label);

        var x_border = this.el_textarea.getBorderWidth('t');
        var x_padding = this.el_textarea.getPadding('t');

        var margin_top = x_border + x_padding + 'px';
        this.el_label.applyStyles({ 'margin-top': margin_top });

        var width = this.el_label.getWidth() + 'px';
        this.el_content.applyStyles({'margin-left': width});

        if (!this.collapsed) {
            this.setRowsCols(this.getInput());
        }
    },

    focusCell: function() {
        if (this.collapsed) {
            this.el_expander.focus();
            this.el.addClass('codenode-cell-collapsed-focus');
        } else {
            this.el_textarea.focus();
            this.el_textarea.addClass('codenode-cell-io-textarea-focus');
        }
    },

    blurCell: function() {
        if (this.collapsed) {
            this.el.removeClass('codenode-cell-collapsed-focus');
            this.el_expander.blur();
        } else {
            this.el_textarea.removeClass('codenode-cell-io-textarea-focus');
            this.el_textarea.blur();
        }
    },

    nextCell: function() {
        var cell = this.getNextCell();

        if (cell === null) {
            if (this.owner.cycleCells) {
                cell = this.getFirstCell();
            } else {
                return;
            }
        }

        this.blurCell();
        cell.focusCell();

        return cell;
    },

    prevCell: function() {
        var cell = this.getPrevCell();

        if (cell === null) {
            if (this.owner.cycleCells) {
                var cell = this.getLastCell();
            } else {
                return;
            }
        }

        this.blurCell();
        cell.focusCell();

        return cell;
    },

    insertCellBefore: function() {
        this.blurCell();

        var cell = this.owner.newInputCell({ position: this.id });
        cell.focusCell();

        return cell;
    },

    insertCellAfter: function() {
        this.blurCell();

        var next = this.getNextCell();

        if (next === null) {
            var cell = this.owner.newInputCell();
        } else {
            var cell = this.owner.newInputCell({ position: next.id });
        }

        cell.focusCell();

        return cell;
    },

    removeCell: function() {
        if (this.isLastCell()) {
            this.prevCell();
        } else {
            this.nextCell();
        }

        this.destroy();
    },
});

Codenode.InputCell = Ext.extend(Codenode.IOCell, {
    evaluating: false,

    observedInputLength: 0,
    observationInterval: 250,

    initComponent: function() {
        Codenode.InputCell.superclass.initComponent.call(this);

        this.addEvents('preevaluate', 'postevaluate');
    },

    getInput: function() {
        return this.getText();
    },

    setInput: function(input) {
        return this.setText(input);
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
        this.el_evaluate.on('click', function() {
            this.evaluateCell({ keepfocus: true });
        }, this);
        this.el_clear.on('click', this.clearCell, this);
        this.el_interrupt.on('click', this.interruptCell, this);
    },

    setupInputCellKeyMap: function() {
        var x_tab = {
            key: Ext.EventObject.TAB,
            shift: false,
            ctrl: false,
            alt: false,
            scope: this,
            stopEvent: true,
            handler: Ext.emptyFn,
        };

        var x_shift_tab = {
            key: Ext.EventObject.TAB,
            shift: true,
            ctrl: false,
            alt: false,
            scope: this,
            stopEvent: true,
            handler: Ext.emptyFn,
        };

        var x_shift_enter = {
            key: Ext.EventObject.ENTER,
            shift: true,
            ctrl: false,
            alt: false,
            scope: this,
            stopEvent: true,
            handler: function() {
                this.evaluateCell({ keepfocus: false });
            },
        };

        var x_ctrl_enter = {
            key: Ext.EventObject.ENTER,
            shift: false,
            ctrl: true,
            alt: false,
            scope: this,
            stopEvent: true,
            handler: function() {
                this.evaluateCell({ keepfocus: true });
            },
        };

        var x_enter = {
            key: Ext.EventObject.ENTER,
            shift: false,
            ctrl: false,
            alt: false,
            scope: this,
            stopEvent: true,
            handler: this.newline,
        };

        var x_backspace = {
            key: Ext.EventObject.BACKSPACE,
            shift: false,
            ctrl: false,
            alt: false,
            scope: this,
            stopEvent: true,
            handler: this.backspace,
        };

        var x_ctrl_up = {
            key: Ext.EventObject.UP,
            shift: false,
            ctrl: true,
            alt: false,
            scope: this,
            stopEvent: true,
            handler: function() {
                var cell = this.prevCell();
                cell.setSelection('end');
            },
        };

        var x_ctrl_down = {
            key: Ext.EventObject.DOWN,
            shift: false,
            ctrl: true,
            alt: false,
            scope: this,
            stopEvent: true,
            handler: function() {
                var cell = this.nextCell();
                cell.setSelection('start');
            },
        };

        var x_alt_up = {
            key: Ext.EventObject.UP,
            shift: false,
            ctrl: false,
            alt: true,
            scope: this,
            stopEvent: true,
            handler: this.insertCellBefore,
        };

        var x_alt_down = {
            key: Ext.EventObject.DOWN,
            shift: false,
            ctrl: false,
            alt: true,
            scope: this,
            stopEvent: true,
            handler: this.insertCellAfter,
        };

        var x_alt_left = {
            key: Ext.EventObject.LEFT,
            shift: false,
            ctrl: false,
            alt: true,
            scope: this,
            stopEvent: true,
            handler: this.collapseCell,
        };

        var x_alt_right = {
            key: Ext.EventObject.RIGHT,
            shift: false,
            ctrl: false,
            alt: true,
            scope: this,
            stopEvent: true,
            handler: this.expandCell,
        };

        var x_up = {
            key: Ext.EventObject.UP,
            shift: false,
            ctrl: false,
            alt: false,
            scope: this,
            stopEvent: false,
            handler: function(key, ev) {
                var selection = this.getSelection();

                if (selection.start == selection.end) {
                    var input = this.getInput();
                    var index = input.indexOf('\n');

                    if (index == -1 || selection.start <= index) {
                        ev.stopEvent();

                        var cell = this.prevCell();
                        cell.setSelection('end');
                    }
                }
            },
        };

        var x_down = {
            key: Ext.EventObject.DOWN,
            shift: false,
            ctrl: false,
            alt: false,
            scope: this,
            stopEvent: false,
            handler: function(key, ev) {
                var selection = this.getSelection();

                if (selection.start == selection.end) {
                    var input = this.getInput();
                    var index = input.lastIndexOf('\n');

                    if (index == -1 || selection.start > index) {
                        ev.stopEvent();

                        var cell = this.nextCell();
                        cell.setSelection('start');
                    }
                }
            },
        };

        var x_ctrl_space = {
            key: Ext.EventObject.SPACE,
            shift: false,
            ctrl: true,
            alt: false,
            scope: this,
            stopEvent: false,
            handler: this.autocomplete,
        };

        this.keymap_textarea_stop = new Ext.KeyMap(this.el_textarea, [
            x_tab, x_shift_tab,
            x_enter, x_backspace,
            x_shift_enter, x_ctrl_enter,
            x_ctrl_up, x_ctrl_down,
            x_alt_up, x_alt_down,
            x_alt_left,
            x_ctrl_space,
        ]);

        this.keymap_textarea_nostop = new Ext.KeyMap(this.el_textarea, [
            x_up, x_down,
        ]);

        this.keymap_expander_stop = new Ext.KeyMap(this.el_expander, [
            x_alt_right,
            x_ctrl_up, x_ctrl_down,
            x_alt_up, x_alt_down,
        ]);

        this.keymap_expander_nostop = new Ext.KeyMap(this.el_expander, [
            x_up, x_down,
        ]);
    },

    onRender: function(container, position) {
        Codenode.InputCell.superclass.onRender.apply(this, arguments);

        this.el.addClass('codenode-cell-input');

        this.el_controls = this.el_content.createChild({
            tag: 'div',
            cls: 'codenode-cell-input-controls',
            children: [
                {
                    tag: 'div',
                    cls: 'codenode-cell-input-control codenode-cell-input-evaluate codenode-enabled',
                    html: 'evaluate',
                }, {
                    tag: 'div',
                    cls: 'codenode-cell-input-control codenode-cell-input-clear codenode-enabled',
                    html: 'clear',
                }, {
                    tag: 'div',
                    cls: 'codenode-cell-input-control codenode-cell-input-interrupt',
                    html: 'interrupt',
                },
            ],
        });

        this.el_evaluate = this.el_controls.child('.codenode-cell-input-evaluate');
        this.el_clear = this.el_controls.child('.codenode-cell-input-clear');
        this.el_interrupt = this.el_controls.child('.codenode-cell-input-interrupt');

        this.setupInputCellObserver();
        this.setupInputCellEvents();
        this.setupInputCellKeyMap();

        if (this.start === true) {
            // TODO: this.el_textarea.update("Click here to start ...");
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

                while (i >= 0) {
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
                this.removeCell();
                return;
            }

            input = input.slice(0, --pos) + input.slice(pos+1);
        } else {
            input = input.slice(0, selection.start) + input.slice(selection.end);
        }

        this.setInput(input);
        this.autosize();

        this.setSelection({ start: pos, end: pos });
    },

    autocomplete: function() {
        var menu = new Ext.menu.Menu({
            id: 'codenode-completion-menu',
            items: [],
        });

        menu.showAt([0, 0]);
    },

    evaluateCell: function(config) {
        config = config || {};

        var input = this.getInput();

        this.fireEvent('preevaluate', this, input);

        this.el_evaluate.removeClass('codenode-enabled');
        this.el_clear.removeClass('codenode-enabled');
        this.el_interrupt.addClass('codenode-enabled');

        this.evaluating = true;

        // XXX: evaluate here
        var output = null;

        this.evaluating = false;

        this.owner.nextEvalIndex();

        this.setLabel();
        this.autosize();
        this.showLabel();

        this.el_evaluate.addClass('codenode-enabled');
        this.el_clear.addClass('codenode-enabled');
        this.el_interrupt.removeClass('codenode-enabled');

        if (config.keepfocus === true) {
            this.focusCell();
        } else {
            if (this.owner.newCellOnEval || this.isLastCell()) {
                this.insertCellAfter();
            } else {
                this.nextCell();
            }
        }

        this.fireEvent('postevaluate', this, input, output);
    },

    clearCell: function() {
        this.setInput('');
        this.clearLabel();
        this.autosize();
        this.focusCell();
    },

    interruptCell: function() {
        /* pass */
    },
});

Codenode.Cells = Ext.extend(Ext.BoxComponent, {

    constructor: function(config) {
        this.config = config;
        Codenode.Cells.superclass.constructor.apply(this, arguments);
    },

    initComponent: function() {
        Codenode.Cells.superclass.initComponent.call(this);
    },

    onRender: function(container, position) {
        Codenode.Cells.superclass.onRender.apply(this, arguments);

        this.el.addClass('codenode-cells');

        this.cellMgr = new Codenode.CellManager(
            Ext.applyIf({ root: this.el }, this.config)
        );
    },

    addInputCell: function(config) {
        this.cellMgr.newInputCell(config);
    },
});

Ext.reg('x-codenode-cells', Codenode.Cells);

function newWindow(title) {
    var notebook = new Ext.Window({
        title: 'Codenode Notebook: ' + title,
        layout: 'fit',
        width: 300,
        height: 200,
        maximizable: true,
    })

    var cells = new Codenode.Cells({
        tabWidth: 2,
    });

    notebook.add(cells);
    notebook.doLayout();

    notebook.show();

    cells.addInputCell({ start: true });
}

Ext.onReady(function() {
    var cells1 = new Codenode.CellManager({ root: 'cells1' });

    for (var i = 0; i < 3; i++) {
        cells1.newInputCell({ start: !i ? true : false });
    }

    var cells2 = new Codenode.CellManager({ root: 'cells2' });

    for (var i = 0; i < 3; i++) {
        cells2.newInputCell({ start: !i ? true : false });
    }

    newWindow(0);
    newWindow(1);
});

