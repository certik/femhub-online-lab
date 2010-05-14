
FEMhub.CellManager = function(config) {
    config = config || {};

    if (Ext.isDefined(config.root)) {
        config.root = Ext.get(config.root);
    }

    return Ext.apply({
        id: FEMhub.unique(),

        evalIndex: 0,

        softEvalTimeout: null,
        hardEvalTimeout: null,
        showInputControls: true,
        moveForwardOnRemove: false,
        mergeOnBackspace: true,
        newCellOnEval: false,
        autoLoadOutputCells: true,
        cycleCells: true,
        autoJustify: true,
        wrapOutputText: true,
        tabWidth: 4,

        types: {
            'input': 'InputCell',
            'output': 'OutputCell',
            'image': 'ImageCell',
        },

        newCell: function(config) {
            config = config || {};

            if (!Ext.isDefined(config.type)) {
                var ctype = this.types.input;
            } else {
                var ctype = this.types[config.type];
            }

            var cell = new FEMhub[ctype](Ext.apply({
                owner: this,
            }, config.setup));

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

                // TODO: fix visibility issue
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

        typeToCls: function(type, dot) {
            if (!Ext.isDefined(type)) {
                var cls = 'femhub-cell';
            } else {
                var cls = 'femhub-cell-' + type;
            }

            if (dot === false) {
                return cls;
            } else {
                return '.' + cls;
            }
        },

        getFirstCell: function(type) {
            return Ext.getCmp(Ext.DomQuery.selectNode(this.typeToCls(type) + ":first", this.root.dom).id);
        },

        getLastCell: function(type) {
            return Ext.getCmp(Ext.DomQuery.selectNode(this.typeToCls(type) + ":last", this.root.dom).id);
        },

        getNextCell: function(id, type) {
            var query = "div[id=" + id + "] ~ " + this.typeToCls(type) + ":first";
            var elt = Ext.DomQuery.selectNode(query, this.root.dom);

            if (Ext.isDefined(elt)) {
                return Ext.getCmp(elt.id);
            } else {
                return null;
            }
        },

        getPrevCell: function(id, type) {
            var cls = this.typeToCls(type, false);

            while (1) {
                var query = ".femhub-cell:next(div[id=" + id + "])";
                var elt = Ext.DomQuery.selectNode(query, this.root.dom);

                if (Ext.isDefined(elt)) {
                    if (Ext.get(elt).hasClass(cls)) {
                        return Ext.getCmp(elt.id);
                    } else {
                        id = elt.id;
                    }
                } else {
                    return null;
                }
            }
        },

        justifyCells: function() {
            var len = ('In [' + this.evalIndex + ']: ').length;

            var cells = Ext.DomQuery.select(".femhub-cell-io", this.root.dom);

            Ext.each(cells, function(elt) {
                var cell = Ext.getCmp(elt.id);
                var label = cell.getLabel();

                for (var i = 0; i < len - label.length; i++) {
                    label += ' ';
                }

                cell.setLabel(label);
                cell.autosize();
            }, this);
        },

        getDataURL: function() {
            return '/notebook/' + this.notebook + '/';
        },

        getAsyncURL: function() {
            return '/asyncnotebook/' + this.notebook + '/';
        },

        initBackend: function() {
            Ext.Ajax.request({
                url: this.getDataURL() + 'nbobject',
                method: "GET",
                success: function(result, request) {
                    var result = Ext.decode(result.responseText);

                    if (result.orderlist == 'orderlist') {
                        this.newCell({ type: 'input', setup: { start: true } });
                    } else {
                        Ext.each(Ext.decode(result.orderlist), function(id) {
                            var data = result.cells[id];

                            if (data.cellstyle == 'outputtext') {
                                if (this.autoLoadOutputCells) {
                                    data.cellstyle = 'output';
                                } else {
                                    return;
                                }
                            }

                            if (data.cellstyle == 'outputimage') {
                                if (this.autoLoadOutputCells) {
                                    data.cellstyle = 'image';
                                } else {
                                    return;
                                }
                            }

                            var cell = this.newCell({ type: data.cellstyle, setup: { id: id } });
                            cell.setText(data.content);
                        }, this);
                    }
                },
                failure: Ext.emptyFn,
                scope: this,
            });

            Ext.Ajax.request({
                url: this.getAsyncURL(),
                method: "POST",
                params: Ext.encode({
                    method: 'start',
                }),
                success: Ext.emptyFn,
                failure: Ext.emptyFn,
                scope: this,
            });
        },

        saveBackend: function() {
            /* pass */
        },

        killBackend: function() {
            Ext.Ajax.request({
                url: this.getAsyncURL(),
                method: "POST",
                params: Ext.encode({
                    method: 'interrupt',
                }),
                success: Ext.emptyFn,
                failure: Ext.emptyFn,
                scope: this,
            });
        },
    }, config, {
        root: Ext.getBody(),
    });
}

FEMhub.Cell = Ext.extend(Ext.BoxComponent, {
    ctype: 'base',

    collapsed: false,
    hiddenEl: null,
    bindings: {},

    constructor: function(config) {
        if (Ext.isDefined(config.setup)) {
            Ext.apply(this, config.setup);
            config.setup = undefined;
        }

        if (!Ext.isDefined(config.id)) {
            config.id = FEMhub.unique();
        }

        FEMhub.Cell.superclass.constructor.apply(this, arguments);
    },

    initComponent: function() {
        FEMhub.Cell.superclass.initComponent.call(this);

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
        FEMhub.Cell.superclass.onRender.apply(this, arguments);

        this.el.addClass('femhub-cell');

        this.el_bracket = this.el.createChild({
            tag: 'div',
            cls: 'femhub-cell-bracket',
            children: {
                tag: 'div',
                cls: 'femhub-cell-triangle',
            },
        });

        this.setupCellObserver();
        this.setupCellEvents();
        this.setupCellKeyMap();
    },

    onFocusCell: function() {
         /* pass */
    },

    onBlurCell: function() {
         /* pass */
    },

    focusCell: function() {
        if (this.collapsed) {
            this.el.addClass('femhub-focus');
            this.el_expander.focus();
        } else {
            this.onFocusCell();
        }
    },

    blurCell: function() {
        if (this.collapsed) {
            this.el.removeClass('femhub-focus');
            this.el_expander.blur();
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
            cls: 'femhub-cell-triangle',
        });

        this.el.addClass('femhub-cell-collapsed');
        this.el.addClass('femhub-enabled');
        this.collapsed = true;

        this.fireEvent('collapsed', this);
    },

    expandCell: function() {
        this.fireEvent('expanding', this);

        this.el.un('click', this.expandCell, this);
        this.el_expand_triangle.remove();

        this.el.removeClass('femhub-cell-collapsed');
        this.el.removeClass('femhub-enabled');
        this.collapsed = false;

        Ext.each(this.hiddenEl, function(el) {
            el.show();
        }, this);

        this.hiddenEl = null;

        this.fireEvent('expanded', this);
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

FEMhub.IOCell = Ext.extend(FEMhub.Cell, {
    ctype: 'io',
    labelPrefix: null,

    initComponent: function() {
        FEMhub.IOCell.superclass.initComponent.call(this);

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

                    if (cell.ctype == 'input') {
                        cell.setSelection('end');
                    }
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

                    if (cell.ctype == 'input') {
                        cell.setSelection('start');
                    }
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
                    if (this.collapsed || this.ctype != 'input') {
                        var cell = this.prevCell();

                        if (cell.ctype == 'input') {
                            cell.setSelection('end');
                        }
                    } else {
                        var selection = this.getSelection();

                        if (selection.start == selection.end) {
                            var input = this.getText();
                            var index = input.indexOf('\n');

                            if (index == -1 || selection.start <= index) {
                                ev.stopEvent();

                                var cell = this.prevCell();

                                if (cell.ctype == 'input') {
                                    cell.setSelection('end');
                                }
                            }
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
                    if (this.collapsed || this.ctype != 'input') {
                        var cell = this.nextCell();

                        if (cell.ctype == 'input') {
                            cell.setSelection('start');
                        }
                    } else {
                        var selection = this.getSelection();

                        if (selection.start == selection.end) {
                            var input = this.getText();
                            var index = input.lastIndexOf('\n');

                            if (index == -1 || selection.start > index) {
                                ev.stopEvent();

                                var cell = this.nextCell();

                                if (cell.ctype == 'input') {
                                    cell.setSelection('start');
                                }
                            }
                        }
                    }
                },
            },
        });
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
                var end = this.getText().length;
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
        FEMhub.IOCell.superclass.onRender.apply(this, arguments);

        this.el.addClass('femhub-cell-io');

        this.el_expander = this.el.createChild({
            tag: 'textarea',
            cls: 'femhub-cell-expander',
        });

        this.el_expander.dom.setAttribute('readOnly','readonly');

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
        this.setupIOCellKeyMap();
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
        var width = this.el_label.getWidth() + 'px';
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

        this.destroy();
    },
});

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
        output = output.replace(/&gt;/g, '<');

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

FEMhub.ImageCell = Ext.extend(FEMhub.OutputCell, {
    ctype: 'image',
    imageURL: null,

    initComponent: function() {
        FEMhub.ImageCell.superclass.initComponent.call(this);
    },

    getOutput: function() {
        return this.imageURL;
    },

    setOutput: function(url) {
        this.el_image.dom.setAttribute('src', '/data/' + url);
        this.imageURL = url;
    },

    onRender: function(container, position) {
        FEMhub.ImageCell.superclass.onRender.apply(this, arguments);

        this.el.addClass('femhub-cell-image');
        this.el_textarea.addClass('femhub-cell-image-textarea');

        this.el_image = this.el_textarea.createChild({
            tag: 'img',
            cls: 'femhub-cell-image-image',
        });
    },
});

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
            x_ctrl_alt_up: {
                key: Ext.EventObject.UP,
                shift: false,
                ctrl: true,
                alt: true,
                scope: this,
                stopEvent: true,
                handler: this.mergeCellBefore,
            },
            x_ctrl_alt_down: {
                key: Ext.EventObject.DOWN,
                shift: false,
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
            this.bindings.x_ctrl_alt_up, this.bindings.x_ctrl_alt_down,
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
                    this.mergeCellBefore();
                } else if (input.length == 0) {
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
                            myInputCell: this,
                        },
                    });
                }

                this.myOutputCell = cell;

                cell.setLabel();
                cell.setOutput(output);
                cell.autosize();
                cell.showLabel();
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

        if (cell !== null) {
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

            cell.autosize();
            cell.focusCell();
            this.destroy();
        }
    },

    mergeCellAfter: function() {
        var cell = this.getNextCell('input');

        if (cell !== null) {
            var input = cell.getInput();

            if (input.length != 0) {
                input = '\n' + input;
            }

            input = this.getInput() + input;
            var selection = this.getSelection();

            cell.setInput(input);
            cell.setSelection(selection);

            cell.autosize();
            cell.focusCell();
            this.destroy();
        }
    },
});

FEMhub.Cells = Ext.extend(Ext.BoxComponent, {
    cellsMgr: null,

    constructor: function(config) {
        this.config = config;
        FEMhub.Cells.superclass.constructor.apply(this, arguments);
    },

    initComponent: function() {
        FEMhub.Cells.superclass.initComponent.call(this);
    },

    onRender: function(container, position) {
        FEMhub.Cells.superclass.onRender.apply(this, arguments);

        this.el.addClass('femhub-cells');

        this.cellsMgr = new FEMhub.CellManager(
            Ext.applyIf({ root: this.el }, this.config)
        );

        this.cellsMgr.initBackend();
    },

    getCellsManager: function() {
        return this.cellsMrg;
    },

    addInputCell: function(config) {
        this.cellsMgr.newCell({ type: 'input' });
    },
});

Ext.onReady(function() {
    FEMhub.init(function() {
        FEMhub.Bookshelf.init();
    });
});

