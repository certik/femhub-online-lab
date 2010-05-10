
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

        types: {
            'input': 'InputCell',
            'output': 'OutputCell',
        },

        newCell: function(config) {
            config = config || {};

            if (!Ext.isDefined(config.type)) {
                var ctype = this.types.input;
            } else {
                var ctype = this.types[config.type];
            }

            var cell = new Codenode[ctype]({
                owner: this,
                content: config.content,
            });

            if (config.render !== false) {
                if (Ext.isDefined(config.position)) {
                    var id = config.position;
                } else if (Ext.isDefined(config.before)) {
                    var id = config.before.id;
                } else if (Ext.isDefined(config.after)) {
                    var next = config.after.getNextCell();

                    if (next === null) {
                        var id = undefined;
                    } else {
                        var id = next.id;
                    }
                } else {
                    var id = undefined;
                }

                cell.render(this.root, id);

                if (config.scroll !== false) {
                    this.root.scroll('bottom', 100);
                }
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

        typeToCls: function(type) {
            if (!Ext.isDefined(type)) {
                return '.codenode-cell';
            } else {
                return '.codenode-cell-' + type;
            }
        },

        getFirstCell: function(type) {
            return Ext.getCmp(Ext.DomQuery.selectNode(".codenode-cell-input:first", this.root.dom).id);
        },

        getLastCell: function(type) {
            return Ext.getCmp(Ext.DomQuery.selectNode(".codenode-cell-input:last", this.root.dom).id);
        },

        getNextCell: function(id, type) {
            var query = this.typeToCls(type) + ":prev(div[id=" + id + "])";
            var elt = Ext.DomQuery.selectNode(query, this.root.dom);

            if (Ext.isDefined(elt)) {
                return Ext.getCmp(elt.id);
            } else {
                return null;
            }
        },

        getPrevCell: function(id, type) {
            var query = this.typeToCls(type) + ":next(div[id=" + id + "])";
            var elt = Ext.DomQuery.selectNode(query, this.root.dom);

            if (Ext.isDefined(elt)) {
                return Ext.getCmp(elt.id);
            } else {
                return null;
            }
        },

        justifyCells: function() {
            var len = ('In [' + this.evalIndex + ']: ').length;

            var cells = Ext.DomQuery.select(".codenode-cell-io", this.root.dom);

            Ext.each(cells, function(elt) {
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
    bindings: {},

    constructor: function(config) {
        config.id = Codenode.unique();
        Codenode.Cell.superclass.constructor.apply(this, arguments);
    },

    initComponent: function() {
        Codenode.Cell.superclass.initComponent.call(this);

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

        this.setupCellObserver();
        this.setupCellEvents();
        this.setupCellKeyMap();
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

    focusCell: function() {
        /* pass */
    },

    blurCell: function() {
        /* pass */
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
});

Codenode.IOCell = Ext.extend(Codenode.Cell, {
    labelPrefix: null,

    initComponent: function() {
        Codenode.IOCell.superclass.initComponent.call(this);

        Ext.apply(this.bindings, {
            x_ctrl_up: {
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
            },
            x_ctrl_down: {
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
            },
            x_alt_up: {
                key: Ext.EventObject.UP,
                shift: false,
                ctrl: false,
                alt: true,
                scope: this,
                stopEvent: true,
                handler: this.insertInputCellBefore,
            },
            x_alt_down: {
                key: Ext.EventObject.DOWN,
                shift: false,
                ctrl: false,
                alt: true,
                scope: this,
                stopEvent: true,
                handler: this.insertInputCellAfter,
            },
            x_alt_left: {
                key: Ext.EventObject.LEFT,
                shift: false,
                ctrl: false,
                alt: true,
                scope: this,
                stopEvent: true,
                handler: this.collapseCell,
            },
            x_alt_right: {
                key: Ext.EventObject.RIGHT,
                shift: false,
                ctrl: false,
                alt: true,
                scope: this,
                stopEvent: true,
                handler: this.expandCell,
            },
            x_up: {
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
            },
            x_down: {
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
            },
        });
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
            } else if (obj === 'end') {
                var end = this.getInput().length;
                dom.setSelectionRange(end, end);
            } else if (Ext.isNumber(obj)) {
                dom.setSelectionRange(obj, obj);
            } else {
                dom.setSelectionRange(obj.start, obj.end);
            }
        } else {
            /* TODO */
        }
    },

    setupIOCellObserver: function() {
        /* pass */
    },

    setupIOCellEvents: function() {
        this.el_textarea.on('focus', this.focusCell, this);
        this.el_textarea.on('blur', this.blurCell, this);

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

    setupIOCellKeyMap: function() {
        this.keymap_expander_stop = new Ext.KeyMap(this.el_expander, [
            this.bindings.x_alt_right,
            this.bindings.x_ctrl_up, this.bindings.x_ctrl_down,
            this.bindings.x_alt_up, this.bindings.x_alt_down,
        ]);

        this.keymap_expander_nostop = new Ext.KeyMap(this.el_expander, [
            this.bindings.x_up, this.bindings.x_down,
        ]);
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
       Codenode.IOCell.superclass.focusCell.apply(this, arguments);

        if (this.collapsed) {
            this.el_expander.focus();
            this.el.addClass('codenode-cell-collapsed-focus');
        } else {
            this.el_textarea.focus();
            this.el_textarea.addClass('codenode-cell-io-textarea-focus');
        }
    },

    blurCell: function() {
       Codenode.IOCell.superclass.blurCell.apply(this, arguments);

        if (this.collapsed) {
            this.el.removeClass('codenode-cell-collapsed-focus');
            this.el_expander.blur();
        } else {
            this.el_textarea.removeClass('codenode-cell-io-textarea-focus');
            this.el_textarea.blur();
        }
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
        if (this.isLastCell()) {
            this.prevCell();
        } else {
            this.nextCell();
        }

        this.destroy();
    },
});

Codenode.OutputCell = Ext.extend(Codenode.IOCell, {
    labelPrefix: 'Out',

    initComponent: function() {
        Codenode.OutputCell.superclass.initComponent.call(this);

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
        return this.getText();
    },

    setOutput: function(output) {
        return this.setText(output);
    },

    setupOutputCellObserver: function() {
        /* pass */
    },

    setupOutputCellEvents: function() {
        /* pass */
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
        Codenode.OutputCell.superclass.onRender.apply(this, arguments);

        this.el.addClass('codenode-cell-output');

        this.setupOutputCellObserver();
        this.setupOutputCellEvents();
        this.setupOutputCellKeyMap();
    },
});

Codenode.InputCell = Ext.extend(Codenode.IOCell, {
    labelPrefix: 'In ',

    evaluating: false,

    observedInputLength: 0,
    observationInterval: 250,

    initComponent: function() {
        Codenode.InputCell.superclass.initComponent.call(this);

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
        });
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
        this.keymap_textarea_stop = new Ext.KeyMap(this.el_textarea, [
            this.bindings.x_tab, this.bindings.x_shift_tab,
            this.bindings.x_enter, this.bindings.x_backspace,
            this.bindings.x_shift_enter, this.bindings.x_ctrl_enter,
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

        if (Ext.isChrome) {
            this.el_controls.addClass('chrome');
        }

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
                this.removeCell();
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
            this.focusCell(); /* needed for 'evaluate' button */
        } else {
            if (this.owner.newCellOnEval || this.isLastCell()) {
                this.insertInputCellAfter();
            } else {
                this.nextCell('input');
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
        this.cellMgr.newCell({ type: 'input' });
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

    cells.addInputCell();
}

Ext.onReady(function() {
    var cells1 = new Codenode.CellManager({ root: 'cells1' });

    for (var i = 0; i < 3; i++) {
        cells1.newCell({ type: 'input' });
    }

    var cells2 = new Codenode.CellManager({ root: 'cells2' });

    for (var i = 0; i < 3; i++) {
        cells2.newCell({ type: 'input' });
    }

    newWindow(0);
    newWindow(1);
});

