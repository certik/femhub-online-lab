
FEMhub.Bookshelf = {}

FEMhub.Bookshelf.init = function() {
    var notebooks = new Ext.grid.GridPanel({
        border:false,
        ds: new Ext.data.Store({
            reader: new Ext.data.ArrayReader({}, [
                { name: 'title' },
                { name: 'engine' },
                { name: 'date', type: 'date' },
            ]),
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

    notebooks.on('celldblclick', function(grid, row, col, evt) {
        var record = grid.getStore().getAt(row);
        FEMhub.Bookshelf.openNotebook(record.id, record.data.title);
    }, this);

    notebooks.on('cellcontextmenu', function(grid, row, col, evt) {
        var context = new Ext.menu.Menu();

        context.add([
            new Ext.menu.Item({
                text: 'Share',
                handler: function(node) {
                    FEMhub.log("share");
                },
            }),
            new Ext.menu.Separator(),
            new Ext.menu.Item({
                text: 'Rename',
                handler: function(node) {
                    FEMhub.log("rename");
                },
            }),
            new Ext.menu.Item({
                text: 'Delete',
                handler: function(node) {
                    FEMhub.log("delete");
                },
            }),
        ]);

        context.showAt(evt.getXY());
        evt.stopEvent();
    }, this);

    var root = new Ext.tree.TreeNode({
        id: 'root-' + FEMhub.unique(),
        text: 'My Folders',
    });

    var folders = new Ext.tree.TreePanel({
        region: "west",
        width: 200,
        split: true,
        rootVisible: true,
        root: root,
        animate: true,
        enableDD: true,
        containerScroll: true,
    });

    folders.on('contextmenu', function(node, evt) {
        var context = new Ext.menu.Menu();

        context.add([
            new Ext.menu.Item({
                text: 'New notebook',
                handler: function(node) {
                    FEMhub.log("new notebook");
                },
            }),
            new Ext.menu.Item({
                text: 'New folder',
                handler: function(node) {
                    FEMhub.log("new folder");
                },
            }),
            new Ext.menu.Separator(),
            new Ext.menu.Item({
                text: 'Rename',
                handler: function(node) {
                    FEMhub.log("rename");
                },
            }),
            new Ext.menu.Item({
                text: 'Delete',
                handler: function(node) {
                    FEMhub.log("delete");
                },
            }),
        ]);

        context.showAt(evt.getXY());
        evt.stopEvent();
    }, this);

    folders.on('click', function(node) {
        if (/^root-/.test(node.id)) {
            var id = 'root';
        } else {
            var id = node.id;
        }

        Ext.Ajax.request({
            url: '/bookshelf/load?location=' + id + '&order=title&sort=asc',
            method: "GET",
            success: function(result, request) {
                var result = Ext.decode(result.responseText);
                notebooks.getStore().removeAll();

                Ext.each(result, function(notebook) {
                    var rec = Ext.data.Record.create(['title', 'engine', 'date']);

                    notebooks.getStore().add(new rec({
                        title: notebook[1],
                        engine: notebook[2],
                        date: notebook[3],
                    }, notebook[0]));
                }, this);
            },
            failure: Ext.emptyFn,
            scope: this,
        });
    }, this);

    var engines_menu = new Ext.menu.Menu();
    var default_engine = null;

    FEMhub.RPC.getEngines({}, function(engines) {
        default_engine = engines[0].id;

        Ext.each(engines, function(engine) {
            engines_menu.addMenuItem({
                engine: engine.id,
                text: engine.name,
                handler: function(item) {
                    FEMhub.Bookshelf.newNotebook(item.engine);
                },
            });
        });
    });

    var bookshelf = new Ext.Window({
        title: "FEMhub Bookshelf",
        layout: "border",
        width: 700,
        height: 500,
        maximizable: true,
        closable: false,
        onEsc: Ext.emptyFn,
        tbar: [
            {
                xtype: 'tbsplit',
                cls: 'x-btn-text-icon',
                icon: FEMhub.icons + 'page_add.png',
                text: 'New Notebook',
                handler: function() {
                    FEMhub.Bookshelf.newNotebook(default_engine);
                },
                menu: engines_menu,
                scope: this,
            }, {
                xtype: 'button',
                cls: 'x-btn-text-icon',
                icon: FEMhub.icons + 'page_attach.png',
                text: 'Import Notebook',
                handler: function() {
                    Ext.MessageBox.prompt(
                        'Import Notebook',
                        'Please enter plain text:',
                        function(button, text) {
                            if (button == 'ok') {
                                FEMhub.Bookshelf.newNotebook(default_engine, function(notebook) {
                                    notebook.importCells(text);
                                });
                            }
                        },
                        this,
                        true);
                },
                scope: this,
            },
        ],
        items: [folders, notebooks],
    });

    bookshelf.show();

    FEMhub.RPC.getFolders({}, function(folders) {
        Ext.each(folders, function(folder) {
            root.appendChild(new Ext.tree.TreeNode({
                id: folder.guid,
                text: folder.title,
            }));
        });

        root.expand();
    });
}

FEMhub.Bookshelf.newNotebook = function(engine, handler) {
    FEMhub.RPC.newNotebook({ engine_id: engine }, function(data) {
        var notebook = FEMhub.Bookshelf.openNotebook(data.id, 'untitled');

        if (Ext.isDefined(handler)) {
            handler(notebook);
        }
    });
}

FEMhub.Bookshelf.openNotebook = function(id, title) {
    var notebook = new FEMhub.Notebook({
        id: id,
        name: title,
        width: 600,
        height: 400,
    });

    notebook.show();
    return notebook;
}

FEMhub.Notebook = Ext.extend(Ext.Window, {
    maximizable: true,
    layout: 'fit',

    cells: null,
    baseTitle: 'FEMhub Notebook',

    constructor: function(config) {
        config.title = config.name;
        FEMhub.Notebook.superclass.constructor.apply(this, arguments);
    },

    getCellsManager: function() {
        return this.cells.getCellsManager();
    },

    setTitle: function(text) {
        var title = this.baseTitle;

        if (Ext.isDefined(text) && text !== null) {
            title += ' - ' + text;
        }

        FEMhub.Notebook.superclass.setTitle.apply(this, [title]);
    },

    initComponent: function() {
        this.tbar = new Ext.Toolbar({
            items: [
                {
                    icon: FEMhub.icons + 'page_go.png',
                    cls: 'x-btn-text-icon',
                    text: 'Share',
                }, '-', {
                    icon: FEMhub.icons + 'textfield_rename.png',
                    cls: 'x-btn-text-icon',
                    text: 'Rename',
                    handler: function() {
                        Ext.MessageBox.prompt(
                            'Rename Notebook',
                            'Please enter new title:',
                            function(button, text) {
                                if (button == 'ok') {
                                    this.getCellsManager().renameAtBackend(text);
                                    this.setTitle(text);

                                    // TODO: notify bookshelf about this change
                                }
                            },
                            this,
                            false,
                            this.getCellsManager().name);
                    },
                    scope: this,
                }, {
                    icon: FEMhub.icons + 'page_save.png',
                    cls: 'x-btn-text-icon',
                    text: 'Save',
                    handler: function() {
                        this.getCellsManager().saveToBackend();
                    },
                    scope: this,
                }, {
                    cls: 'x-btn-text',
                    text: 'Save & Close',
                    handler: function() {
                        this.getCellsManager().saveToBackend({
                            postsave: this.close,
                            scope: this,
                        });
                    },
                    scope: this,
                }, '-', {
                    icon: FEMhub.icons + 'cross.png',
                    cls: 'x-btn-text-icon',
                    text: 'Kill',
                    handler: function() {
                        this.getCellsManager().killBackend();
                    },
                    scope: this,
                },
            ],
        });

        FEMhub.Notebook.superclass.initComponent.call(this);
    },

    onRender: function() {
        FEMhub.Notebook.superclass.onRender.apply(this, arguments);

        this.cells = new FEMhub.Cells({
            nbid: this.id,
            name: this.name,
        });

        this.add(this.cells);
    },

    close: function() {
        var cells = this.getCellsManager();

        if (cells.isSavedToBackend()) {
            FEMhub.Notebook.superclass.close.call(this);
        } else {
            Ext.MessageBox.show({
                title: 'Save changes?',
                msg: 'There are unsaved cells in your notebook. Would you like to save your changes?',
                buttons: Ext.Msg.YESNOCANCEL,
                fn: function(button) {
                    switch (button) {
                        case 'yes':
                            cells.saveToBackend();
                        case 'no':
                            FEMhub.Notebook.superclass.close.call(this);
                            break;
                        case 'cancel':
                            break;
                    }
                },
                icon: Ext.MessageBox.QUESTION,
                scope: this,
            });
        }
    },

    importCells: function(text) {
        var cells = this.getCellsManager();

        var TEXT = 0;
        var INPUT = 1;
        var OUTPUT = 2;

        var lines = text.split('\n');
        var state = TEXT;

        var text = [];
        var input = [];
        var output = [];

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];

            switch (state) {
            case TEXT:
                if (/^{{{/.test(line)) {
                    state = INPUT;
                    input = [];
                } else {
                    text.push(line);
                }
                break;
            case INPUT:
                if (/^\/\/\//.test(line)) {
                    state = OUTPUT;
                    output = [];
                } else {
                    input.push(line);
                }
                break;
            case OUTPUT:
                if (/^}}}/.test(line)) {
                    var strInput = input.join('\n');
                    var strOutput = output.join('\n');

                    var icell = cells.newCell({
                        type: 'input',
                        setup: {
                        },
                    });

                    icell.setText(strInput);

                    if (output.length != 0) {
                        var ocell = cells.newCell({
                            type: 'output',
                            setup: {
                                id: icell.id + 'o',
                            },
                        });

                        ocell.setText(strOutput);
                    }

                    state = TEXT;
                    text = [];
                } else {
                    output.push(line);
                }
                break;
            }
        }
    },
});

