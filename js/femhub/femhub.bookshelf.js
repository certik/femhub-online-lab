
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
                    text: 'New Notebook',
                    iconCls: 'femhub-add-notebook-icon',
                    handler: function() {
                        this.newNotebook();
                    },
                    menu: this.enginesMenu,
                    scope: this,
                }, {
                    xtype: 'button',
                    cls: 'x-btn-text-icon',
                    text: 'Import Notebook',
                    iconCls: 'femhub-import-notebook-icon',
                    handler: function() {
                        this.importNotebook();
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
        this.root = new Ext.tree.TreeNode();

        this.foldersTree = new Ext.tree.TreePanel({
            region: 'west',
            width: 200,
            split: true,
            root: this.root,
            rootVisible: false,
            animate: true,
            enableDD: true,
            ddGroup: 'folders',
            containerScroll: true,
            listeners: {
                nodedragover: {
                    fn: function(evt) {
                        return Ext.isDefined(evt.source.tree) || (evt.point === 'append');
                    },
                    scope: this,
                },
                beforenodedrop: {
                    fn: function(evt) {
                        if (Ext.isDefined(evt.source.tree)) {
                            FEMhub.RPC.Folders.moveFolder({
                                parent_guid: evt.target.id,
                                folder_guid: evt.dropNode.id,
                            });
                        } else {
                            var selections = evt.data.selections;

                            if (Ext.isArray(selections)) {
                                var guids = [];

                                for (var i = 0; i < selections.length; i++) {
                                    guids.push(selections[i].id);
                                }

                                FEMhub.RPC.Notebooks.moveNotebooks({
                                    folder_guid: evt.target.id,
                                    notebooks_guid: guids,
                                }, function(result) {
                                    if (result.ok === true) {
                                        var store = this.notebooksGrid.getStore();

                                        for (var i = 0; i < guids.length; i++) {
                                            store.remove(store.getById(guids[i]));
                                        }
                                    } else {
                                        FEMhub.log("Couldn't move notebooks");
                                    }
                                }, this);
                            }
                        }
                    },
                    scope: this,
                },
            },
        });

        this.foldersTree.on('contextmenu', function(node, evt) {
            var context = new Ext.menu.Menu({
                items: [{
                    text: 'New notebook',
                    iconCls: 'femhub-add-notebook-icon',
                    handler: function() {
                        this.addNotebookAt(node);
                    },
                    scope: this,
                }, {

                    text: 'New folder',
                    iconCls: 'femhub-add-folder-icon',
                    handler: function() {
                        this.addFolder(node);
                    },
                    scope: this,
                }, '-', {
                    text: 'Rename',
                    iconCls: 'femhub-rename-icon',
                    handler: function() {
                        this.renameFolder(node);
                    },
                    scope: this,
                }, {
                    text: 'Delete',
                    iconCls: 'femhub-remove-icon',
                    handler: function() {
                        this.deleteFolder(node);
                    },
                    scope: this,
                }],
            });

            context.showAt(evt.getXY());
            evt.stopEvent();
        }, this);

        this.foldersTree.on('click', function(node) {
            this.getNotebooks(node);
        }, this);

        this.fillFoldersTree();
    },

    initNotebooksGrid: function() {
        this.notebooksGrid = new Ext.grid.GridPanel({
            border: false,
            ds: new Ext.data.Store({
                reader: new Ext.data.ArrayReader({}, [
                    { name: 'title' },
                    { name: 'engine' },
                    { name: 'datetime', type: 'date' },
                ]),
            }),
            cm: new Ext.grid.ColumnModel([
                new Ext.grid.RowNumberer(),
                { header: "Title", width: 200, sortable: true, dataIndex: 'title'},
                { header: "Engine", width: 70, sortable: true, dataIndex: 'engine'},
                { header: "Date", width: 100, sortable: true, dataIndex: 'datetime'},
            ]),
            viewConfig: {
                forceFit: true,
            },
            region: 'center',
            enableDragDrop: true,
            ddGroup: 'folders',
        });

        this.notebooksGrid.on('rowdblclick', function(grid, row, evt) {
            var record = grid.getStore().getAt(row);
            this.openNotebook(record.id, record.data.title);
        }, this);

        this.notebooksGrid.on('rowcontextmenu', function(grid, row, evt) {
            var record = grid.getStore().getAt(row);

            var context = new Ext.menu.Menu({
                items: [{
                    text: 'Edit',
                    iconCls: 'femhub-edit-notebook-icon',
                    handler: function() {
                        this.openNotebook(record.id, record.data.title);
                    },
                    scope: this,
                }, '-', {
                    text: 'Rename',
                    iconCls: 'femhub-rename-icon',
                    handler: function() {
                        this.renameNotebook(record);
                    },
                    scope: this,
                }, {
                    text: 'Delete',
                    iconCls: 'femhub-remove-icon',
                    handler: function() {
                        this.deleteNotebook(record);
                    },
                    scope: this,
                }],
            });

            context.showAt(evt.getXY());
            evt.stopEvent();
        }, this);
    },

    isRootNode: function(node) {
        return node.id == this.rootNode.id;
    },

    fillFoldersTree: function() {
        function recFillFoldersTree(node) {
            FEMhub.RPC.Folders.getFolders({guid: node.id}, function(folders) {
                Ext.each(folders, function(folder) {
                    var subNode = new Ext.tree.TreeNode({
                        id: folder.guid,
                        text: folder.title,
                    });

                    node.appendChild(subNode);
                    recFillFoldersTree(subNode);
                });

                node.expand();
            });
        }

        FEMhub.RPC.Folders.getRoot({}, function(folder) {
            this.rootNode = new Ext.tree.TreeNode({
                id: folder.guid,
                text: folder.title,
            });

            this.root.appendChild(this.rootNode);
            recFillFoldersTree(this.rootNode);

            this.foldersTree.getSelectionModel().select(this.rootNode);
            this.getNotebooks(this.rootNode);
        }, this);
    },

    addFolder: function(node) {
        Ext.MessageBox.prompt('Add folder', 'Enter folder name:', function(button, title) {
            if (button === 'ok') {
                if (FEMhub.isValidName(title) === false) {
                    Ext.MessageBox.show({
                        title: 'Add folder',
                        msg: "Invalid folder name.",
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR,
                    });
                } else {
                    FEMhub.RPC.Folders.addFolder({guid: node.id, title: title}, function(result) {
                        if (result.ok === true) {
                            node.appendChild(new Ext.tree.TreeNode({
                                id: result.guid,
                                text: title,
                            }));

                            node.expand();
                        } else {
                            FEMhub.log("Can't create folder");
                        }
                    });
                }
            }
        }, this);
    },

    renameFolder: function(node) {
        if (this.isRootNode(node)) {
            Ext.MessageBox.show({
                title: 'Rename folder',
                msg: "Can't rename root node. Sorry. ",
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.ERROR,
            });
        } else {
            Ext.MessageBox.prompt('Rename folder', 'Enter new folder name:', function(button, title) {
                if (button === 'ok') {
                    if (FEMhub.isValidName(title) === false) {
                        Ext.MessageBox.show({
                            title: 'Rename folder',
                            msg: "Invalid folder name.",
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.ERROR,
                        });
                    } else {
                        FEMhub.RPC.Folders.renameFolder({guid: node.id, title: title}, function(result) {
                            if (result.ok === true) {
                                node.setText(title);
                            } else {
                                FEMhub.log("Can't rename folder");
                            }
                        });
                    }
                }
            }, this);
        }
    },

    deleteFolder: function(node) {
        if (this.isRootNode(node)) {
            Ext.MessageBox.show({
                title: 'Delete folder',
                msg: "Can't delete root node. Sorry. ",
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.ERROR,
            });
        } else {
            Ext.MessageBox.show({
                title: 'Delete folder',
                msg: 'Do you really want to delete selected folder and all its contents?',
                buttons: Ext.MessageBox.YESNO,
                icon: Ext.MessageBox.QUESTION,
                fn: function(button) {
                    if (button === 'yes') {
                        FEMhub.RPC.Folders.deleteFolder({guid: node.id}, function(result) {
                            if (result.ok === true) {
                                node.remove(true);
                            } else {
                                FEMhub.log("Can't delete folder");
                            }
                        });
                    }
                },
                scope: this,
            });
        }
    },

    renameNotebook: function(record) {
        Ext.MessageBox.prompt('Rename notebook', 'Enter new notebook name:', function(button, title) {
            if (button === 'ok') {
                if (FEMhub.isValidName(title) === false) {
                    Ext.MessageBox.show({
                        title: 'Rename notebook',
                        msg: "Invalid notebook name.",
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR,
                    });
                } else {
                    FEMhub.RPC.Notebooks.renameNotebook({guid: record.id, title: title}, function(result) {
                        if (result.ok === true) {
                            record.set('title', title);
                            record.commit();
                        } else {
                            FEMhub.log("Can't rename notebook");
                        }
                    });
                }
            }
        }, this);
    },

    deleteNotebook: function(record) {
        Ext.MessageBox.show({
            title: 'Delete notebook',
            msg: 'Do you really want to delete selected notebook and all its contents?',
            buttons: Ext.MessageBox.YESNO,
            icon: Ext.MessageBox.QUESTION,
            fn: function(button) {
                if (button === 'yes') {
                    FEMhub.RPC.Notebooks.deleteNotebook({guid: record.id}, function(result) {
                        if (result.ok === true) {
                            this.notebooksGrid.getStore().remove(record);
                        } else {
                            FEMhub.log("Can't delete notebook");
                        }
                    }, this);
                }
            },
            scope: this,
        });
    },

    getNotebooks: function(node) {
        FEMhub.RPC.Notebooks.getNotebooks({ guid: node.id }, function(result) {
            if (result.ok === true) {
                var store = this.notebooksGrid.getStore();
                store.removeAll();

                var record = Ext.data.Record.create([
                    'title', 'engine', 'datetime'
                ]);

                Ext.each(result.notebooks, function(notebook) {
                    store.add(new record({
                        title: notebook.title,
                        engine: notebook.engine,
                        datetime: notebook.datetime,
                    }, notebook.guid));
                }, this);
            } else {
                FEMhub.log("Failed to get notebooks");
            }
        }, this);
    },

    addNotebookAt: function(node, engine, handler, scope) {
        return this.newNotebook(engine, handler, scope, node);
    },

    newNotebook: function(engine, handler, scope, node) {
        var model = this.foldersTree.getSelectionModel();

        node = node || model.getSelectedNode() || this.rootNode;
        engine = engine || this.defaultEngine;

        var params = { engine_guid: engine, folder_guid: node.id };

        FEMhub.RPC.Notebooks.addNotebook(params, function(result) {
            if (result.ok === true) {
                var notebook = this.openNotebook(result.guid);

                if (Ext.isDefined(handler)) {
                    handler.call(scope || this, notebook);
                }
            } else {
                FEMhub.log("Failed to add new notebook");
            }
        }, this);
    },

    openNotebook: function(id, title) {
        var desktop = FEMhub.lab.getDesktop();
        var title = title || 'untitled';

        var notebook = desktop.createWindow(FEMhub.Notebook, {
            id: id,
            name: title,
            width: 600,
            height: 400,
        });

        notebook.show();
        return notebook;
    },

    importNotebook: function() {
        Ext.MessageBox.prompt(
            'Import Notebook',
            'Please enter plain text:',
            function(button, text) {
                if (button === 'ok') {
                    this.newNotebook(this.defaultEngine, function(notebook) {
                        notebook.importCells(text);
                    });
                }
            }, this, true);
    },
});

FEMhub.Modules.Bookshelf = Ext.extend(FEMhub.Module, {
    launcher: {
        text: 'Bookshelf',
        icon: 'femhub-bookshelf-launcher-icon',
    },
    winCls: FEMhub.Bookshelf,
});

