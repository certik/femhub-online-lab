
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

Codenode.CellManager = function(root, json) {
    return {
        id: Codenode.unique(),
        json: json || Codenode.json,
        root: root, // || Ext.getBody(),

        evalIndex: 0,

        softEvalTimeout: null,
        hardEvalTimeout: null,
        newCellOnEval: true,
        cycleCells: true,

        newCell: function(render) {
            var cell = new Codenode.Cell({owner: this});

            if (Ext.isDefined(render) && render) {
                cell.render(this.root);
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
        this.el_label.applyStyles({ visibility: 'visible' });
    },

    hideLabel: function() {
        this.el_label.applyStyles({ visibility: 'hidden' });
    },

    setupLabel: function() {
        this.el_label.update('In [' + this.owner.nextEvalIndex() + ']: ');
        this.showLabel();
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

        this.el_evaluate.on('click', this.evaluateCell, this);
        this.el_clear.on('click', this.clearCell, this);
        this.el_interrupt.on('click', this.interruptCell, this);

        this.el_bracket.on('click', this.collapseCell, this);
    },

    setupKeyMap: function() {
        this.keymap = new Ext.KeyMap(this.el_textarea, [
            {
                key: Ext.EventObject.TAB,
                shift: false,
                ctrl: false,
                alt: false,
                scope: this,
                handler: Ext.emptyFn,
            }, {
                key: Ext.EventObject.TAB,
                shift: true,
                ctrl: false,
                alt: false,
                scope: this,
                handler: Ext.emptyFn,
            }, {
                key: Ext.EventObject.ENTER,
                shift: false,
                ctrl: false,
                alt: false,
                scope: this,
                handler: this.evaluateCell,
            }, {
                key: Ext.EventObject.ENTER,
                shift: true,
                ctrl: false,
                alt: false,
                scope: this,
                handler: this.newline,
            }, {
                key: Ext.EventObject.BACKSPACE,
                shift: false,
                ctrl: false,
                alt: false,
                scope: this,
                handler: this.backspace,
            }, {
                key: Ext.EventObject.UP,
                shift: false,
                ctrl: true,
                alt: false,
                scope: this,
                handler: this.prevCell,
            }, {
                key: Ext.EventObject.DOWN,
                shift: false,
                ctrl: true,
                alt: false,
                scope: this,
                handler: this.nextCell,
            }, {
                key: Ext.EventObject.LEFT,
                shift: false,
                ctrl: false,
                alt: true,
                scope: this,
                handler: this.collapseCell,
            }, {
                key: Ext.EventObject.RIGHT,
                shift: false,
                ctrl: false,
                alt: true,
                scope: this,
                handler: this.expandCell,
            },
        ]);

        this.keymap.stopEvent = true;
    },

    onRender: function(container, position) {
        Codenode.Cell.superclass.onRender.apply(this, arguments);

        this.el.addClass('codenode-cell-input');

        this.el.createChild({
            tag: 'div',
            cls: 'codenode-cell-input-label',
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
        /* DUMMY */
        this.autosize(true);
        var text = this.el_textarea.getValue();
        this.el_textarea.dom.value = text + '\n';
    },

    backspace: function() {
        var input = this.el_textarea.getValue();

        if (input.length == 0) {
            this.remove();
        } else {

        }
    },

    autosize: function(enter) {
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

        if (Ext.isDefined(enter) && enter) {
            input += '\nX';
        }

        this.el_hidden.update(input);

        var height = this.el_hidden.getHeight();
        this.el_textarea.setHeight(height);

        this.fireEvent('postautosize', this, height);
    },

    evaluateCell: function() {
        var input = this.getInput();

        this.fireEvent('preevaluate', this, input);

        this.el_evaluate.removeClass('codenode-enabled');
        this.el_interrupt.addClass('codenode-enabled');

        Codenode.log("eval");
        // XXX: evaluate here
        var output = null;

        this.setupLabel();
        this.autosize();

        this.el_evaluate.addClass('codenode-enabled');
        this.el_interrupt.removeClass('codenode-enabled');

        this.fireEvent('postevaluate', this, input, output);
    },

    clearCell: function() {
        this.setInput('');
        this.clearLabel();
        this.autosize();
    },

    interruptCell: function() {
        /* pass */
    },

    removeCell: function() {
        /* pass */
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
        var elt = Ext.DomQuery.selectNode(".codenode-cell-input:prev(div[id=" + this.id + "])", this.owner.root.dom);

        if (Ext.isDefined(elt)) {
            var cell = Ext.getCmp(elt.id);
        } else if (this.owner.cycleCells) {
            var cell = Ext.getCmp(Ext.DomQuery.selectNode(".codenode-cell-input:first", this.owner.root.dom).id);
        } else {
            return;
        }

        this.blurCell();
        cell.focusCell();
    },

    prevCell: function(cell) {
        var elt = Ext.DomQuery.selectNode(".codenode-cell-input:next(div[id=" + this.id + "])", this.owner.root.dom);

        if (Ext.isDefined(elt)) {
            var cell = Ext.getCmp(elt.id);
        } else if (this.owner.cycleCells) {
            var cell = Ext.getCmp(Ext.DomQuery.selectNode(".codenode-cell-input:last", this.owner.root.dom).id);
        } else {
            return;
        }

        this.blurCell();
        cell.focusCell();
    },
});

Ext.onReady(function() {
    var cells = new Codenode.CellManager(Ext.get('cells'));

    for (var i = 0; i < 5; i++) {
        cells.newCell(true);
    }
});

