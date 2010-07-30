
FEMhub.Bookshelf = Ext.extend(Ext.Window, {
    toolbar: null,
    enginesMenu: null,
    foldersTree: null,
    notebooksGrid: null,

    defaultEngine: null,

    constructor: function(config) {
        this.initToolbar();
        this.initEnginesMenu();
        this.initFoldersTree();
        this.initNotebooksGrid();

        config = config || {};

        Ext.apply(config, {
            title: "FEMhub Bookshelf",
            layout: 'border',
            width: 700,
            height: 500,
            iconCls: 'femhub-bookshelf-icon',
            maximizable: true,
            minimizable: true,
            closable: true,
            onEsc: Ext.emptyFn,
            tbar: this.toolbar,
            items: [this.foldersTree, this.notebooksGrid],
        });

        FEMhub.Bookshelf.superclass.constructor.call(this, config);
    },

    initToolbar: function() {
        this.toolbar = new Ext.Toolbar({
            items: [
                {
                    xtype: 'tbsplit',
                    cls: 'x-btn-text-icon',
                    icon: FEMhub.icons + 'page_add.png',
                    text: 'New Notebook',
                    handler: function() {
                        this.newNotebook(this.defaultEngine);
                    },
                    menu: this.enginesMenu,
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
                                    this.newNotebook(this.defaultEngine, function(notebook) {
                                        notebook.importCells(text);
                                    });
                                }
                            }, this, true);
                    },
                    scope: this,
                },
            ],
        });
    },

    initEnginesMenu: function() {
        this.enginesMenu = new Ext.menu.Menu();

        FEMhub.RPC.getEngines({}, function(engines) {
            this.defaultEngine = engines[0].id;

            Ext.each(engines, function(engine) {
                this.enginesMenu.addMenuItem({
                    engine: engine.id,
                    text: engine.name,
                    handler: function(item) {
                        this.newNotebook(item.engine);
                    },
                    scope: this,
                });
            }, this);
        }, this);
    },

    initFoldersTree: function() {
        var root = new Ext.tree.TreeNode({
            id: 'root-' + FEMhub.unique(),
            text: 'My Folders',
        });

        this.foldersTree = new Ext.tree.TreePanel({
            region: 'west',
            width: 200,
            split: true,
            rootVisible: true,
            root: root,
            animate: true,
            enableDD: true,
            containerScroll: true,
        });

        this.foldersTree.on('contextmenu', function(node, evt) {
            var context = new Ext.menu.Menu();

            context.add([
                new Ext.menu.Item({
                    text: 'New notebook',
                    handler: function(node) {
                        FEMhub.log("new notebook");
                    },
                    scope: this,
                }),
                new Ext.menu.Item({
                    text: 'New folder',
                    handler: function(node) {
                        FEMhub.log("new folder");
                    },
                    scope: this,
                }),
                new Ext.menu.Separator(),
                new Ext.menu.Item({
                    text: 'Rename',
                    handler: function(node) {
                        FEMhub.log("rename");
                    },
                    scope: this,
                }),
                new Ext.menu.Item({
                    text: 'Delete',
                    handler: function(node) {
                        FEMhub.log("delete");
                    },
                    scope: this,
                }),
            ]);

            context.showAt(evt.getXY());
            evt.stopEvent();
        }, this);

        this.foldersTree.on('click', function(node) {
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
                    this.notebooksGrid.getStore().removeAll();

                    Ext.each(result, function(notebook) {
                        var rec = Ext.data.Record.create(['title', 'engine', 'date']);

                        this.notebooksGrid.getStore().add(new rec({
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

        FEMhub.RPC.getFolders({}, function(folders) {
            Ext.each(folders, function(folder) {
                root.appendChild(new Ext.tree.TreeNode({
                    id: folder.guid,
                    text: folder.title,
                }));
            });

            root.expand();
        });
    },

    initNotebooksGrid: function() {
        this.notebooksGrid = new Ext.grid.GridPanel({
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
            region: 'center',
        });

        this.notebooksGrid.on('celldblclick', function(grid, row, col, evt) {
            var record = grid.getStore().getAt(row);
            this.openNotebook(record.id, record.data.title);
        }, this);

        this.notebooksGrid.on('cellcontextmenu', function(grid, row, col, evt) {
            var context = new Ext.menu.Menu();

            context.add([
                new Ext.menu.Item({
                    text: 'Share',
                    handler: function(node) {
                        FEMhub.log("share");
                    },
                    scope: this,
                }),
                new Ext.menu.Separator(),
                new Ext.menu.Item({
                    text: 'Rename',
                    handler: function(node) {
                        FEMhub.log("rename");
                    },
                    scope: this,
                }),
                new Ext.menu.Item({
                    text: 'Delete',
                    handler: function(node) {
                        FEMhub.log("delete");
                    },
                    scope: this,
                }),
            ]);

            context.showAt(evt.getXY());
            evt.stopEvent();
        }, this);
    },

    newNotebook: function(engine, handler, scope) {
        FEMhub.RPC.newNotebook({ engine_id: engine }, function(data) {
            var notebook = this.openNotebook(data.id, 'untitled');

            if (Ext.isDefined(handler)) {
                handler.apply(scope || this, [notebook]);
            }
        }, this);
    },

    openNotebook: function(id, title) {
        var notebook = new FEMhub.Notebook({
            id: id,
            name: title,
            width: 600,
            height: 400,
        });

        notebook.show();
        return notebook;
    },
});

FEMhub.Modules.Bookshelf = Ext.extend(FEMhub.Module, {
    launcher: {
        text: 'Bookshelf',
        icon: 'femhub-bookshelf-launcher-icon',
    },
    winCls: FEMhub.Bookshelf,
});

