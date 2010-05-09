
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
        tabWidth: 4,

        newCell: function(config) {
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
            return ++this.evalIndex;
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
    }, config, {
        root: Ext.getBody(),
    });
}

Codenode.Cell = Ext.extend(Ext.BoxComponent, {
    collapsed: false,
    prevHeight: null,
    hiddenEl: null,

    constructor: function(config) {
        config.id = Codenode.unique();
        Codenode.Cell.superclass.constructor.apply(this, arguments);
    },

    initComponent: function() {
        Codenode.Cell.superclass.initComponent.call(this);

        this.addEvents('collapsed', 'expanded');
    },

    onRender: function(container, position) {
        Codenode.Cell.superclass.onRender.apply(this, arguments);

        this.el.addClass('codenode-cell');

        this.el.createChild({
            tag: 'div',
            cls: 'codenode-cell-bracket',
            children: {
                tag: 'div',
                cls: 'codenode-cell-triangle',
            },
        });

        this.el_bracket = this.el.child('.codenode-cell-bracket');
        this.el_bracket.on('click', this.collapseCell, this, { stopEvent: true });
    },

    collapseCell: function() {
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
        this.collapsed = true;

        this.prevHeight = this.el.getHeight();
        this.el.setHeight(5, {
            duration: 0.5,
            callback: function() {
                this.el.addClass('codenode-enabled');
            },
            scope: this,
        });

        this.fireEvent('collapsed', this);
    },

    expandCell: function() {
        this.el.un('click', this.expandCell, this);

        this.el.removeClass('codenode-cell-collapsed');
        this.el.removeClass('codenode-enabled');

        this.el_expand_triangle.remove();
        this.collapsed = false;

        this.el.setHeight(this.prevHeight);
        this.prevHeight = null;

        Ext.each(this.hiddenEl, function(el) {
            el.show();
        }, this);

        this.hiddenEl = null;

        this.fireEvent('expanded', this);
    },
});

Codenode.InputCell = Ext.extend(Codenode.Cell, {
    evaluating: false,

    observedFontSize: 0,
    observedInputLength: 0,
    observationInterval: 250,

    initComponent: function() {
        Codenode.InputCell.superclass.initComponent.call(this);

        this.addEvents('preevaluate', 'postevaluate');
    },

    copyFontStyles: function(from, to) {
        var styles = from.getStyles(
            'line-height', 'font-size', 'font-family', 'font-weight', 'font-style');
        to.applyStyles(styles);
    },

    copyBoxStyles: function(from, to) {
        var styles = from.getStyles(
            'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
            'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
            'border-top-width', 'border-bottom-width', 'border-left-width', 'border-right-width');
        to.applyStyles(styles);
    },

    showLabel: function() {
        this.el_label.show();
    },

    hideLabel: function() {
        this.el_label.hide();
    },

    setupLabel: function() {
        this.el_label.update('In [' + this.owner.nextEvalIndex() + ']: ');
    },

    clearLabel: function() {
        this.el_label.update('');
        this.hideLabel();
    },

    getInput: function() {
        return this.el_textarea.getValue();
    },

    setInput: function(input) {
        this.el_textarea.dom.value = input;
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
                dom.selectionStart = 0;
                dom.selectionEnd = 0;
            } else if (obj == 'end') {
                var end = this.getInput().length;
                dom.selectionStart = end;
                dom.selectionEnd = end;
            } else {
                dom.selectionStart = obj.start;
                dom.selectionEnd = obj.end;
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

    setupObserver: function() {
        var observer = {
            run: function() {
                var input = this.getInput();
                var autosized = false;

                if (input.length != this.observedInputLength) {
                    this.observedInputLength = input.length;
                    this.autosize();
                    autosized = true;
                }

                var size = this.el_textarea.getStyle('font-size');

                if (size != this.observedFontSize) {
                    this.observedFontSize = size;

                    if (!autosized) {
                        this.autosize();
                    }
                }
            },
            scope: this,
            interval: this.observationInterval,
        };

        Ext.TaskMgr.start(observer);
    },

    setupEvents: function() {
        this.el_textarea.on('focus', this.focusCell, this);
        this.el_textarea.on('blur', this.blurCell, this);

        this.el_evaluate.on('click', function() {
            this.evaluateCell({ keepfocus: true });
        }, this);

        this.el_clear.on('click', this.clearCell, this);
        this.el_interrupt.on('click', this.interruptCell, this);
    },

    setupKeyMap: function() {
        this.keymap_stop = new Ext.KeyMap(this.el_textarea, [
            {
                key: Ext.EventObject.TAB,
                shift: false,
                ctrl: false,
                alt: false,
                scope: this,
                stopEvent: true,
                handler: Ext.emptyFn,
            }, {
                key: Ext.EventObject.TAB,
                shift: true,
                ctrl: false,
                alt: false,
                scope: this,
                stopEvent: true,
                handler: Ext.emptyFn,
            }, {
                key: Ext.EventObject.ENTER,
                shift: true,
                ctrl: false,
                alt: false,
                scope: this,
                stopEvent: true,
                handler: function() {
                    this.evaluateCell({ keepfocus: false });
                },
            }, {
                key: Ext.EventObject.ENTER,
                shift: false,
                ctrl: true,
                alt: false,
                scope: this,
                stopEvent: true,
                handler: function() {
                    this.evaluateCell({ keepfocus: true });
                },
            }, {
                key: Ext.EventObject.ENTER,
                shift: false,
                ctrl: false,
                alt: false,
                scope: this,
                stopEvent: true,
                handler: this.newline,
            }, {
                key: Ext.EventObject.BACKSPACE,
                shift: false,
                ctrl: false,
                alt: false,
                scope: this,
                stopEvent: true,
                handler: this.backspace,
            }, {
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
            }, {
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
            }, {
                key: Ext.EventObject.UP,
                shift: false,
                ctrl: false,
                alt: true,
                scope: this,
                stopEvent: true,
                handler: this.insertCellBefore,
            }, {
                key: Ext.EventObject.DOWN,
                shift: false,
                ctrl: false,
                alt: true,
                scope: this,
                stopEvent: true,
                handler: this.insertCellAfter,
            }, {
                key: Ext.EventObject.LEFT,
                shift: false,
                ctrl: false,
                alt: true,
                scope: this,
                stopEvent: true,
                handler: this.collapseCell,
            }, {
                key: Ext.EventObject.RIGHT,
                shift: false,
                ctrl: false,
                alt: true,
                scope: this,
                stopEvent: true,
                handler: this.expandCell,
            },
        ]);

        this.keymap_nostop = new Ext.KeyMap(this.el_textarea, [
            {
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
            }, {
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
        ]);
    },

    onRender: function(container, position) {
        Codenode.InputCell.superclass.onRender.apply(this, arguments);

        this.el.addClass('codenode-cell-input');

        this.el.createChild({
            tag: 'div',
            cls: 'codenode-cell-input-label',
            html: 'In [' + this.owner.evalIndex + ']: ',
        });

        this.el.createChild({
            tag: 'div',
            cls: 'codenode-cell-input-content',
            children: [
                {
                    tag: 'textarea',
                    cls: 'codenode-cell-input-textarea',
                }, {
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
                },
            ],
        });

        this.el.createChild({
            tag: 'div',
            cls: 'codenode-cell-input-hidden',
        });

        this.el_label = this.el.child('.codenode-cell-input-label');

        this.el_content = this.el.child('.codenode-cell-input-content');
        this.el_textarea = this.el.child('.codenode-cell-input-textarea');
        this.el_hidden = this.el.child('.codenode-cell-input-hidden');

        this.el_controls = this.el.child('.codenode-cell-input-controls');
        this.el_evaluate = this.el.child('.codenode-cell-input-evaluate');
        this.el_clear = this.el.child('.codenode-cell-input-clear');
        this.el_interrupt = this.el.child('.codenode-cell-input-interrupt');

        this.autosize();

        this.setupObserver();
        this.setupEvents();
        this.setupKeyMap();

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

    autosize: function() {
        this.copyFontStyles(this.el_textarea, this.el_label);
        this.copyFontStyles(this.el_textarea, this.el_hidden);

        var x_margin = this.el_textarea.getMargins('t');
        var x_border = this.el_textarea.getBorderWidth('t');
        var x_padding = this.el_textarea.getPadding('t');

        var margin_top = x_margin + x_border + x_padding + 'px';

        this.el_label.applyStyles({ 'margin-top': margin_top });
        this.copyBoxStyles(this.el_textarea, this.el_hidden);

        this.el_content.applyStyles({'margin-left': this.el_label.getWidth() + 'px'});

        if (!this.collapsed) {
            var width = this.el_textarea.getWidth();
            this.el_hidden.setWidth(width);

            var input = this.getInput();

            if (input.length == 0) {
                input = 'X';
            } else {
                input = input.replace(/<|>|&/g, 'X');
                input = input.replace(/\n$/g, '\nX');
            }

            this.el_hidden.update(input);

            var height = this.el_hidden.getHeight();
            this.el_textarea.setHeight(height);
        }
    },

    evaluateCell: function(config) {
        if (!Ext.isDefined(config)) {
            config = {};
        }

        var input = this.getInput();

        this.fireEvent('preevaluate', this, input);

        this.el_evaluate.removeClass('codenode-enabled');
        this.el_clear.removeClass('codenode-enabled');
        this.el_interrupt.addClass('codenode-enabled');

        this.evaluating = true;

        // XXX: evaluate here
        var output = null;

        this.evaluating = false;

        this.setupLabel();
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

    removeCell: function() {
        if (this.isLastCell()) {
            this.prevCell();
        } else {
            this.nextCell();
        }

        this.destroy();
    },

    focusCell: function() {
        this.el_textarea.addClass('codenode-cell-input-textarea-focus');
        this.el_textarea.focus();
    },

    blurCell: function() {
        this.el_textarea.removeClass('codenode-cell-input-textarea-focus');
        this.el_textarea.blur();
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

        var cell = this.owner.newCell({ position: this.id });
        cell.focusCell();

        return cell;
    },

    insertCellAfter: function() {
        this.blurCell();

        var next = this.getNextCell();

        if (next === null) {
            var cell = this.owner.newCell();
        } else {
            var cell = this.owner.newCell({ position: next.id });
        }

        cell.focusCell();

        return cell;
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

    addCell: function(config) {
        this.cellMgr.newCell(config);
    },
});

Ext.reg('x-codenode-cells', Codenode.Cells);

Ext.onReady(function() {
    var cells1 = new Codenode.CellManager({ root: 'cells1' });

    for (var i = 0; i < 3; i++) {
        cells1.newCell({ start: !i ? true : false });
    }

    var cells2 = new Codenode.CellManager({ root: 'cells2' });

    for (var i = 0; i < 3; i++) {
        cells2.newCell({ start: !i ? true : false });
    }

    var notebook = new Ext.Window({
        title: 'Codenode Notebook',
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

    cells.addCell({ start: true });
});

