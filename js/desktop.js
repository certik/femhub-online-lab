
Ext.BLANK_IMAGE_URL = "/static/external/ext/images/default/s.gif";

var Codenode = {
    version: "some",
    icons: "/static/img/icons/",
    json: "/desktop/json/",
    id: 1,
};

Codenode.init = function(ready) {
    var namespace = Codenode;

    Ext.Ajax.request({
        url: Codenode.json,
        method: "POST",
        params: Ext.encode({
            jsonrpc: "2.0",
            method: "system.describe",
            params: {},
            id: 0,
        }),
        success: function(result, request) {
            var response = Ext.decode(result.responseText);

            Ext.each(response.result.procs, function(proc) {
                var items = proc.name.split(".");
                var ns = namespace;

                Ext.each(items, function(item, i) {
                    if (i == items.length - 1) {
                        if (!Ext.isDefined(ns[item])) {
                            ns[item] = function(params, handler) {
                                return namespace.call(proc.name, params, handler);
                            }
                        } else {
                            throw new Error("'" + item + "' method name already in use");
                        }
                    } else {
                        if (!Ext.isDefined(ns[item])) {
                            ns = ns[item] = {};
                        } else {
                            ns = ns[item];
                        }
                    }
                });
            });

            ready();
        },
        failure: function(result, request) {
            Ext.MessageBox.alert("Codenode failure", Ext.decode(result.responseText).error.message);
        },
    });
}

Codenode.call = function(method, params, handler) {
    if (!Ext.isDefined(handler)) {
        handler = Codenode.anonymous;
    }

    Ext.Ajax.request({
        url: Codenode.json,
        method: "POST",
        params: Ext.encode({
            jsonrpc: "2.0",
            method: method,
            params: params,
            id: Codenode.id++,
        }),
        success: function(result, request) {
            handler(Ext.decode(result.responseText).result);
        },
        failure: function(result, request) {
            Ext.MessageBox.alert("Codenode failure", Ext.decode(result.responseText).error.message);
        },
    });
}

Codenode.anonymous = function(result) {
    Ext.MessageBox.alert("Codenode", result.toString());
}

Codenode.Bookshelf = {}

Codenode.Bookshelf.init = function() {
    var root = new Ext.tree.TreeNode({
        id: 'folders-root',
        text: 'My Folders',
    });

    var folders = new Ext.tree.TreePanel({
        id: "folders",
        region: "west",
        width: 200,
        split: true,
        rootVisible: true,
        root: root,
    });

    var notebooks = new Ext.grid.GridPanel({
        id: "notebooks",
        border:false,
        ds: new Ext.data.Store({
            reader: new Ext.data.ArrayReader({}, [
                { name: 'title' },
                { name: 'engine' },
                { name: 'date', type: 'date' },
            ]),
            data: Ext.grid.dummyData
        }),
        cm: new Ext.grid.ColumnModel([
            new Ext.grid.RowNumberer(),
            { header: "Title", width: 200, sortable: true, dataIndex: 'title'},
            { header: "Engine", width: 70, sortable: true, dataIndex: 'engine'},
            { header: "Date", width: 100, sortable: true, dataIndex: 'date'},
        ]),
        viewConfig: {
            forceFit: true,
        },
        region: "center",
    });


    var engines_menu = new Ext.menu.Menu();

    Codenode.Desktop.get_engines({}, function(engines) {
        Ext.each(engines, function(engine) {
            engines_menu.addMenuItem({
                id: "item-engine-" + engine.id,
                text: engine.name,
                handler: function(item) {
                    Codenode.Bookshelf.start_new_notebook(item._engine_id);
                },
                _engine_id: engine.id,
            });
        });
    });

    var bookshelf = new Ext.Window({
        title: "Codenode Bookshelf",
        layout: "border",
        width: 900,
        height: 700,
        maximizable: true,
        applyTo: "bookshelf",
        tbar: [
            {
                xtype: 'tbsplit',
                cls: 'x-btn-text-icon',
                icon: Codenode.icons + 'page_go.png',
                text: 'New Notebook',
                handler: function() {
                    Codenode.Bookshelf.start_new_notebook();
                },
                menu: engines_menu,
            }, '-', {
                cls: 'x-btn-text-icon',
                icon: Codenode.icons + 'page_save.png',
                text: 'Save',
                handler: function(button) {},
            },
        ],
        items: [folders, notebooks],
    });

    bookshelf.show();

    Codenode.Desktop.get_folders({}, function(folders) {
        Ext.each(folders, function(folder) {
            root.appendChild(new Ext.tree.TreeNode({
                id: folder.guid,
                text: folder.title,
            }));
        });

        root.expand();
    });
}

Codenode.Desktop = {}

Codenode.Bookshelf.start_new_notebook = function(engine_id) {
    if (!Ext.isDefined(engine_id)) {
        return;
    }


    Codenode.Desktop.new_notebook({engine_id: engine_id}, function(notebook) {
        //current_notebook = notebook.id;

        function makeid(some) { return some; }

        var notebook_id = makeid('notebook');
        var foot_id = makeid('foot');
        var auxinput_id = makeid('auxinput');
        var auxdisplay_id = makeid('auxdisplay');


        //var _inner = "<div id='{0}'></div><div id='{1}' class='foot'><input id='{2}' class='auxinput'></input><span id='{3}' class='auxdisplay'></span></div>";
        //var inner = String.format(_inner, notebook_id, foot_id, auxinput_id, auxdisplay_id);
        var inner = "<div id='notebook'></div><div id='foot'><input id='auxinput' class='auxinput'></input><span id='auxdisplay'></span></div>";

        var win = new Ext.Window({
            title: "Notebook",
            id: notebook.id,
            layout: 'fit',
            width: 1000,
            height: 800,
            maximizable: true,
            //applyTo: "window",
            //tbar: toolbar,
            items: {
                xtype: 'tabpanel',
                activeTab: 0,
                items: [
                    { title: 'Untitled 0', html: inner },
                ],
            },
        });

        win.on('activate', function() {
            //current_notebook = this.id; // huh
        });

        win.show();

        __notebook_component_inits__();
    });
}

Codenode.global_cell_index = 1;

Codenode.log = function(text) {
    Ext.getBody().createChild({tag: 'h1', html: text});
}

Codenode.Cell = Ext.extend(Ext.BoxComponent, {
    maxRows: null, // null = oo, or a positive value
    processingTab: false,
    evaluating: false,
    spawnCell: true,
    textLength: 0,

    constructor: function(config) {
        config.id = Codenode.Util.makeUniqueId();
        Codenode.Cell.superclass.constructor.apply(this, arguments);
    },

    initComponent: function() {
        Codenode.Cell.superclass.initComponent.call(this);

        this.addEvents(
            'preautosize',      // TODO
            'postautosize',     // TODO
            'preevaluate',      // TODO
            'postevaluate',     // TODO
            'collapse',         // TODO
            'expand'            // TODO
        );
    },

    needsTabHack: function() {
        return Ext.isGecko || Ext.isOpera;
    },

    copyFontStyles: function(from, to) {
        var styles = from.getStyles(
            'line-height', 'font-size', 'font-family', 'font-weight', 'font-style');
        to.applyStyles(styles);
    },

    onRender: function(container, position) {
        Codenode.Cell.superclass.onRender.apply(this, arguments);

        this.el.addClass('codenode-cell-input');

        this.el.createChild({
            tag: 'div',
            cls: 'codenode-cell-input-label',
            html: 'In [1]: ',
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
        this.el_controls = this.el.child('.codenode-cell-input-controls');
        this.el_hidden = this.el.child('.codenode-cell-input-hidden');
        this.el_bracket = this.el.child('.codenode-cell-input-bracket');

        this.el_evaluate = this.el_controls.child('.codenode-cell-input-evaluate');
        this.el_clear = this.el_controls.child('.codenode-cell-input-clear');
        this.el_interrupt = this.el_controls.child('.codenode-cell-input-interrupt');

        this.el_evaluate.on('click', this.evaluate, this);
        this.el_clear.on('click', this.clear, this);
        this.el_interrupt.on('click', this.interrupt, this);

        /*
        var styles = this.el_textarea.getStyles(
            'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
            'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
            'border-top-width', 'border-bottom-width', 'border-left-width', 'border-right-width');
        this.el_hidden.applyStyles(styles);
        */

        this.copyFontStyles(this.el_textarea, this.el_label);
        this.copyFontStyles(this.el_textarea, this.el_hidden);

        var x_padding = this.el_textarea.getPadding('t');
        var x_margin = this.el_textarea.getMargins('t');
        var x_border = this.el_textarea.getBorderWidth('t');

        this.el_label.applyStyles({'margin-top': x_padding + x_margin + x_border + 'px'});
        this.el_content.applyStyles({'margin-left': this.el_label.getWidth() + 'px'});

        this.el_textarea.on('focus', function(ev, target, config) {
            this.el_textarea.addClass('codenode-cell-input-textarea-focus');
        }, this);

        this.el_textarea.on('blur', function(ev, target, config) {
            if (this.needsTabHack() && this.processingTab) {
                (function() {
                    this.el_textarea.focus();
                }).defer(10, this);
            } else {
                this.el_textarea.removeClass('codenode-cell-input-textarea-focus');
            }

            this.processingTab = false;
        }, this);

        var observer = {
            run: function() {
                var text = this.el_textarea.getValue();

                if (text.length != this.textLength) {
                    this.textLength = text.length;
                    this.autosize();
                }
            },
            scope: this,
            interval: 250,
        };

        Ext.TaskMgr.start(observer);

        this.keymap = new Ext.KeyMap(this.el_textarea, [
            {
                key: Ext.EventObject.TAB,
                shift: false,
                ctrl: false,
                alt: false,
                scope: this,
                handler: function() {
                    if (this.needsTabHack()) {
                        this.processingTab = true;
                    }
                },
            }, {
                key: Ext.EventObject.TAB,
                shift: true,
                ctrl: false,
                alt: false,
                scope: this,
                handler: function() {
                    if (this.needsTabHack()) {
                        this.processingTab = true;
                    }
                },
            }, {
                key: Ext.EventObject.ENTER,
                shift: false,
                ctrl: false,
                alt: false,
                scope: this,
                handler: this.evaluate,
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

        this.el_bracket.on('click', this.collapse, this);

        this.autosize();
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
        Codenode.log('autosize');
        this.fireEvent('preautosize', this);

        var styles = this.el_textarea.getStyles(
            'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
            'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
            'border-top-width', 'border-bottom-width', 'border-left-width', 'border-right-width');
        this.el_hidden.applyStyles(styles);

        var width = this.el_textarea.getWidth();
        this.el_hidden.setWidth(width);

        var input = this.el_textarea.getValue();

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

    evaluate: function() {
        var input = this.el_textarea.getValue();

        this.fireEvent('preevaluate', this, input);

        this.el_evaluate.removeClass('codenode-enabled');
        this.el_interrupt.addClass('codenode-enabled');

        Codenode.log("eval");

        // XXX: evaluate here
        var output = null;

        this.el_evaluate.addClass('codenode-enabled');
        this.el_interrupt.removeClass('codenode-enabled');

        this.fireEvent('postevaluate', this, input, output);
    },

    clear: function() {
        this.el_textarea.dom.value = "";
        this.el_label.applyStyles('visibility: hidden');
    },

    interrupt: function() {
        /* pass */
    },

    remove: function() {
        /* pass */
    },

    collapse: function() {
        /* pass */
    },

    expand: function() {
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
        var elt = Ext.DomQuery.selectNode("*[id=" + this.id + "]:next(.codenode-cell-input)", this.owner.root);

        if (Ext.isDefined(elt)) {
            var cell = Ext.getCmp(elt.id);
            Codenode.log(this.id);
        } else if (this.owner.cycleCells) {
            var cell = Ext.getCmp(Ext.DomQuery.selectNode(".codenode-cell-input:first", this.owner.root).id);
        } else {
            return;
        }

        this.blurCell();
        cell.focusCell();
    },

    prevCell: function(cell) {
        var elt = Ext.DomQuery.selectNode("*[id=" + this.id + "]:prev(.codenode-cell-input)", this.owner.root);

        if (Ext.isDefined(elt)) {
            var cell = Ext.getCmp(elt.id);
            Codenode.log(this.id);
        } else if (this.owner.cycleCells) {
            var cell = Ext.getCmp(Ext.DomQuery.selectNode(".codenode-cell-input:last", this.owner.root).id);
        } else {
            return;
        }

        this.blurCell();
        cell.focusCell();
    },
});

Ext.reg('codnode-cell', Codenode.Cell);

Codenode.Util = {};

Codenode.Util.makeUniqueId = function() {
    return (new Date()).getTime() + Math.random().toString().substr(2, 8);
}

Codenode.CellManager = function(root, json) {
    var id = Codenode.Util.makeUniqueId();

    return {

        id: id,
        json: json || Codenode.json,
        root: root || Ext.getBody(),

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

    }
}

Ext.onReady(function() {
    Codenode.init(function() {
        var mgr = new Codenode.CellManager('frame');

        var cell0 = mgr.newCell(true);
        var cell1 = mgr.newCell(true);
        var cell2 = mgr.newCell(true);
        var cell3 = mgr.newCell(true);

        //Codenode.Bookshelf.init();
        Ext.getBody().createChild({tag: 'h1', html: "DONE!"});
    });
});

/*
        //var cell0 = new Codenode.Cell();
        //var cell1 = new Codenode.Cell();
        //var cell2 = new Codenode.Cell();
        //var cell3 = new Codenode.Cell();

        //var frame = Ext.get('frame');

        //cell0.render(mgr.root);
        //cell1.render(mgr.root);
        //cell2.render(mgr.root);
        //cell3.render(mgr.root);


        Ext.get('ble').on('click', function() {
            Ext.getBody().createChild({tag: 'h1', html: "click"});
        });

        Ext.get('ble').on('change', function() {
            Ext.getBody().createChild({tag: 'h1', html: "change"});
        });


        //Ext.getBody().back

        var simple = new Ext.form.FormPanel({
            standardSubmit: true,
            frame:true,
            title: 'Register',
            width: 350,
            defaults: {width: 230},
            defaultType: 'textfield',
            items: [{
                    id: 'ble',
                    fieldLabel: 'Username',
                    name: 'username',
                    allowBlank:false,
                    grow: true,
                },
                {
                    inputType: 'hidden',
                    id: 'submitbutton',
                    name: 'myhiddenbutton',
                    value: 'hiddenvalue',
                }

            ],
            buttons: [{
                text: 'Submit',
                handler: function() {
                    simple.getForm().getEl().dom.action = 'test.php';
                    simple.getForm().getEl().dom.method = 'POST';
                    simple.getForm().submit();
                }
            }]
        });

        simple.render('form')
*/
        /*
        textarea.on('keydown', function(ev, target, config) {
            ev.stopEvent();
            //ev.preventDefault();
            Ext.getBody().createChild({tag: 'h1', html: "any(d)!"});
            return false;
        });
        */

        /*
        textarea.on('keydown', function(ev, target, config) {
            ev.stopEvent();
            ev.preventDefault();
            Ext.getBody().createChild({tag: 'h1', html: "any(u)!"});
            return false;
        }, this, { stopEvent: true });
        */


        /*

        this.el_textarea.on('keyup', function(ev, target, config) {
            this.autosize();
        }, this);

        this.el_textarea.on('change', function(ev, target, config) {
            this.autosize();
        }, this);

        this.el_textarea.on('select', function(ev, target, config) {
            this.autosize();
        }, this);

        this.el.on('resize', function(ev, target, config) {
            Codenode.log("resize");
        }, this);
        */

