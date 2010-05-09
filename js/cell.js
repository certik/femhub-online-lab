
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
    if (!Ext.isDefined(config)) {
        config = {};
    }

    if (Ext.isDefined(config.root)) {
        config.root = Ext.get(config.root);
    } else {
        config.root = Ext.getBody();
    }

    return {
        id: Codenode.unique(),
        root: config.root,

        evalIndex: 0,

        softEvalTimeout: null,
        hardEvalTimeout: null,
        newCellOnEval: false,
        cycleCells: true,
        tabWidth: 4,

        newCell: function(config) {
            var cell = new Codenode.Cell({owner: this});

            if (!Ext.isDefined(config)) {
                config = {};
            }

            if (config.render !== false) {
                cell.render(this.root, config.position);
            }

            return cell;
        },

        nextEvalIndex: function() {
            return ++this.evalIndex;
        },
    }
}

Codenode.Cell = Ext.extend(Ext.BoxComponent, {
    evaluating: false,

    observedFontSize: 0,
    observedInputLength: 0,
    observationInterval: 250,

    constructor: function(config) {
        config.id = Codenode.unique();
        Codenode.Cell.superclass.constructor.apply(this, arguments);
    },

    initComponent: function() {
        Codenode.Cell.superclass.initComponent.call(this);

        this.addEvents('preautosize', 'postautosize', 'preevaluate', 'postevaluate', 'collapse', 'expand');
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
        return Ext.getCmp(Ext.DomQuery.selectNode(".codenode-cell-input:first", this.owner.root.dom).id);
    },

    getLastCell: function() {
        return Ext.getCmp(Ext.DomQuery.selectNode(".codenode-cell-input:last", this.owner.root.dom).id);
    },

    isFirstCell: function() {
        return this.getFirstCell().id == this.id;
    },

    isLastCell: function() {
        return this.getLastCell().id == this.id;
    },

    getNextCell: function() {
        var elt = Ext.DomQuery.selectNode(".codenode-cell-input:prev(div[id=" + this.id + "])", this.owner.root.dom);

        if (Ext.isDefined(elt)) {
            return Ext.getCmp(elt.id);
        } else {
            return null;
        }
    },

    getPrevCell: function() {
        var elt = Ext.DomQuery.selectNode(".codenode-cell-input:next(div[id=" + this.id + "])", this.owner.root.dom);

        if (Ext.isDefined(elt)) {
            return Ext.getCmp(elt.id);
        } else {
            return null;
        }
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

        this.el_bracket.on('click', this.collapseCell, this);
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
        Codenode.Cell.superclass.onRender.apply(this, arguments);

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

        this.el.createChild({
            tag: 'div',
            cls: 'codenode-cell-input-bracket',
        });

        this.el_label = this.el.child('.codenode-cell-input-label');

        this.el_content = this.el.child('.codenode-cell-input-content');
        this.el_textarea = this.el.child('.codenode-cell-input-textarea');
        this.el_hidden = this.el.child('.codenode-cell-input-hidden');

        this.el_controls = this.el.child('.codenode-cell-input-controls');
        this.el_evaluate = this.el.child('.codenode-cell-input-evaluate');
        this.el_clear = this.el.child('.codenode-cell-input-clear');
        this.el_interrupt = this.el.child('.codenode-cell-input-interrupt');

        this.el_bracket = this.el.child('.codenode-cell-input-bracket');

        this.autosize();

        this.setupObserver();
        this.setupEvents();
        this.setupKeyMap();
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
        this.fireEvent('preautosize', this);

        this.copyFontStyles(this.el_textarea, this.el_label);
        this.copyFontStyles(this.el_textarea, this.el_hidden);

        var x_margin = this.el_textarea.getMargins('t');
        var x_border = this.el_textarea.getBorderWidth('t');
        var x_padding = this.el_textarea.getPadding('t');

        var margin_top = x_margin + x_border + x_padding + 'px';

        this.el_label.applyStyles({ 'margin-top': margin_top });
        this.copyBoxStyles(this.el_textarea, this.el_hidden);

        this.el_content.applyStyles({'margin-left': this.el_label.getWidth() + 'px'});

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

        this.fireEvent('postautosize', this, height);
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

    collapseCell: function() {
        /* pass */
    },

    expandCell: function() {
        /* pass */
    },

    focusCell: function() {
        this.el_textarea.addClass('codenode-cell-input-textarea-focus');
        this.el_textarea.focus();
    },

    blurCell: function() {
        this.el_textarea.removeClass('codenode-cell-input-textarea-focus');
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
        var cell = this.owner.newCell({ position: this.id });

        this.blurCell();
        cell.focusCell();

        return cell;
    },

    insertCellAfter: function() {
        var next = this.getNextCell();

        if (next === null) {
            var cell = this.owner.newCell();
        } else {
            var cell = this.owner.newCell({ position: next.id });
        }

        this.blurCell();
        cell.focusCell();

        return cell;
    },
});

Ext.onReady(function() {
    var cells = new Codenode.CellManager({ root: 'cells' });

    for (var i = 0; i < 3; i++) {
        cells.newCell();
    }

    /*
    <div id='cells2' class="codenode-cell-frame"></div>
    var cells2 = new Codenode.CellManager(Ext.get('cells2'));

    for (var i = 0; i < 15; i++) {
        cells2.newCell(true);
    }
    */
});

