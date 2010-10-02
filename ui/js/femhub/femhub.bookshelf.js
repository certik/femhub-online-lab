
FEMhub.Bookshelf = Ext.extend(Ext.Window, {
    toolbar: null,
    foldersTree: null,
    notebooksGrid: null,

    engines: null,

    constructor: function(config) {
        this.initEngines();

        this.initToolbar();
        this.initFoldersTree();
        this.initNotebooksGrid();

        config = config || {};

        Ext.apply(config, {
            title: "Bookshelf",
            iconCls: 'femhub-bookshelf-icon',
            layout: 'border',
            tbar: this.toolbar,
            items: [this.foldersTree, this.notebooksGrid],
        });

        FEMhub.Bookshelf.superclass.constructor.call(this, config);
    },

    initToolbar: function() {
        this.toolbar = new Ext.Toolbar({
            enableOverflow: true,
            items: [{
                xtype: 'button',
                cls: 'x-btn-text-icon',
                text: 'New Notebook',
                iconCls: 'femhub-add-notebook-icon',
                handler: function() {
                    this.newNotebook();
                },
                scope: this,
            }, {
                xtype: 'button',
                cls: 'x-btn-text-icon',
                text: 'New folder',
                iconCls: 'femhub-add-folder-icon',
                handler: function() {
                    this.addFolder();
                },
                scope: this,
            }, '-', {
                xtype: 'button',
                cls: 'x-btn-text-icon',
                text: 'Import Notebook',
                iconCls: 'femhub-import-notebook-icon',
                handler: function() {
                    this.importNotebook();
                },
                scope: this,
            }, '-', {
                xtype: 'button',
                cls: 'x-btn-text-icon',
                text: 'Refresh',
                iconCls: 'femhub-refresh-icon',
                handler: function() {
                    this.getNotebooks();
                },
                scope: this,
            }, {
                xtype: 'button',
                cls: 'x-btn-text-icon',
                text: 'Rename',
                iconCls: 'femhub-rename-icon',
                handler: function() {
                    var model = this.notebooksGrid.getSelectionModel();

                    if (model.getCount()) {
                        var record = model.getSelected();
                        this.renameNotebook(record);
                    } else {
                        this.renameFolder();
                    }
                },
                scope: this,
            }, {
                xtype: 'button',
                cls: 'x-btn-text-icon',
                text: 'Delete',
                iconCls: 'femhub-remove-icon',
                handler: function() {
                    var model = this.notebooksGrid.getSelectionModel();

                    if (model.getCount()) {
                        var record = model.getSelected();
                        this.deleteNotebook(record);
                    } else {
                        this.deleteFolder();
                    }
                },
                scope: this,
            }],
        });
    },

    initEngines: function() {
        FEMhub.RPC.Core.getEngines({}, function(result) {
            if (result.ok === true) {
                var engines = result.engines;

                if (engines.length == 0) {
                    Ext.MessageBox.show({
                        title: 'Internal Error',
                        msg: "No engines were specified. Consult administrator about this problem.",
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR,
                    });
                } else {
                    this.engines = engines;
                }
            }
        }, this);
    },

    initFoldersTree: function() {
        this.foldersTree = new Ext.tree.TreePanel({
            region: 'west',
            width: 200,
            split: true,
            root: new Ext.tree.TreeNode(),
            rootVisible: false,
            useArrows: true,
            animate: true,
            enableDD: true,
            ddGroup: 'folders',
            containerScroll: true,
            autoScroll: true,
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
                            FEMhub.RPC.Folder.move({
                                folder_uuid: evt.dropNode.id,
                                target_uuid: evt.target.id,
                            });
                        } else {
                            var selections = evt.data.selections;

                            if (Ext.isArray(selections)) {
                                var uuids = [];

                                for (var i = 0; i < selections.length; i++) {
                                    uuids.push(selections[i].id);
                                }

                                FEMhub.RPC.Notebook.move({
                                    uuid: uuids,
                                    target_uuid: evt.target.id,
                                }, function(result) {
                                    if (result.ok === true) {
                                        var store = this.notebooksGrid.getStore();

                                        for (var i = 0; i < uuids.length; i++) {
                                            store.remove(store.getById(uuids[i]));
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
            var engines = [];

            Ext.each(this.engines, function(engine) {
                if (!engine.description.length) {
                    var text = engine.name;
                } else {
                    var text = String.format("{0} ({1})", engine.name, engine.description);
                }

                engines.push({
                    uuid: engine.uuid,
                    text: text,
                    handler: function(item) {
                        this.addNotebookAt(node, item.uuid);
                    },
                    scope: this,
                });
            }, this);

            var context = new Ext.menu.Menu({
                items: [{
                    text: 'New notebook',
                    iconCls: 'femhub-add-notebook-icon',
                    handler: function() {
                        this.addNotebookAt(node);
                    },
                    menu: engines,
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
            sm: new Ext.grid.RowSelectionModel({ singleSelect: true }),
            viewConfig: {
                forceFit: true,
            },
            region: 'center',
            enableDragDrop: true,
            ddGroup: 'folders',
        });

        this.notebooksGrid.on('rowdblclick', function(grid, row, evt) {
            var record = grid.getStore().getAt(row);

            this.openNotebook({
                uuid: record.id,
                name: record.data.title,
            });
        }, this);

        this.notebooksGrid.on('rowcontextmenu', function(grid, row, evt) {
            var record = grid.getStore().getAt(row);

            var context = new Ext.menu.Menu({
                items: [{
                    text: 'Open',
                    iconCls: 'femhub-edit-notebook-icon',
                    menu: [{
                        text: 'Open without output cells',
                        handler: function() {
                            this.openNotebook({
                                uuid: record.id,
                                name: record.data.title,
                                loadOutputCells: false,
                            });
                        },
                        scope: this,
                    }],
                    handler: function() {
                        this.openNotebook({
                            uuid: record.id,
                            name: record.data.title,
                        });
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
        return node.getDepth() == 1;
    },

    fillFoldersTree: function() {
        function recFillTree(folders, node) {
            Ext.each(folders, function(folder) {
                var subNode = new Ext.tree.TreeNode({
                    id: folder.uuid,
                    text: folder.name,
                    cls: 'femhub-folder',
                });

                node.appendChild(subNode);
                recFillTree.call(this, folder.folders, subNode);
            }, this);
        }

        var root = this.foldersTree.getRootNode();

        FEMhub.RPC.Folder.getRoot({}, function(result) {
            if (result.ok === true) {
                FEMhub.RPC.Folder.getFolders({}, function(result) {
                    if (result.ok === true) {
                        recFillTree.call(this, result.folders, root);
                        root.expand(true);
                    }
                }, this);
            }
        }, this);
    },

    addFolder: function(node) {
        var node = this.getCurrentNode(node);

        Ext.MessageBox.prompt('Add folder', 'Enter folder name:', function(button, title) {
            if (button === 'ok') {
                if (FEMhub.util.isValidName(title) === false) {
                    Ext.MessageBox.show({
                        title: 'Add folder',
                        msg: "Invalid folder name.",
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR,
                    });
                } else {
                    FEMhub.RPC.Folder.create({uuid: node.id, name: title}, function(result) {
                        if (result.ok === true) {
                            node.appendChild(new Ext.tree.TreeNode({
                                id: result.uuid,
                                text: title,
                                cls: 'femhub-folder',
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
        var node = this.getCurrentNode(node);

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
                    if (FEMhub.util.isValidName(title) === false) {
                        Ext.MessageBox.show({
                            title: 'Rename folder',
                            msg: "Invalid folder name.",
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.ERROR,
                        });
                    } else {
                        FEMhub.RPC.Folder.rename({uuid: node.id, name: title}, function(result) {
                            if (result.ok === true) {
                                node.setText(title);
                            } else {
                                FEMhub.log("Can't rename folder");
                            }
                        });
                    }
                }
            }, this, false, node.text);
        }
    },

    deleteFolder: function(node) {
        var node = this.getCurrentNode(node);

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
                        FEMhub.RPC.Folder.remove({uuid: node.id}, function(result) {
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
                if (FEMhub.util.isValidName(title) === false) {
                    Ext.MessageBox.show({
                        title: 'Rename notebook',
                        msg: "'" + title + "' is not a valid notebook name.",
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR,
                    });
                } else {
                    FEMhub.RPC.Notebook.rename({uuid: record.id, name: title}, function(result) {
                        if (result.ok === true) {
                            record.set('title', title);
                            record.commit();
                        } else {
                            FEMhub.log("Can't rename notebook");
                        }
                    });
                }
            }
        }, this, false, record.get('title'));
    },

    deleteNotebook: function(record) {
        Ext.MessageBox.show({
            title: 'Delete notebook',
            msg: 'Do you really want to delete selected notebook and all its contents?',
            buttons: Ext.MessageBox.YESNO,
            icon: Ext.MessageBox.QUESTION,
            fn: function(button) {
                if (button === 'yes') {
                    FEMhub.RPC.Notebook.remove({uuid: record.id}, function(result) {
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

    getCurrentNode: function(node) {
        if (Ext.isDefined(node) && node !== null) {
            return node;
        } else {
            var model = this.foldersTree.getSelectionModel();
            return model.getSelectedNode() || this.rootNode;
        }
    },

    getNotebooks: function(node) {
        var node = this.getCurrentNode(node);

        FEMhub.RPC.Folder.getNotebooks({uuid: node.id}, function(result) {
            if (result.ok === true) {
                var store = this.notebooksGrid.getStore();
                store.removeAll();

                var record = Ext.data.Record.create([
                    'title', 'engine', 'created'
                ]);

                Ext.each(result.notebooks, function(notebook) {
                    store.add(new record({
                        title: notebook.name,
                        engine: notebook.engine.name,
                        datetime: notebook.created,
                    }, notebook.uuid));
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
        var node = this.getCurrentNode(node);
        engine = engine || this.engines[0].uuid;

        var params = { name: 'untitled', engine_uuid: engine, folder_uuid: node.id };

        FEMhub.RPC.Notebook.create(params, function(result) {
            if (result.ok === true) {
                var notebook = this.openNotebook({
                    uuid: result.uuid,
                });

                if (Ext.isDefined(handler)) {
                    handler.call(scope || this, notebook);
                }

                this.getNotebooks();
            } else {
                FEMhub.log("Failed to add new notebook");
            }
        }, this);
    },

    openNotebook: function(conf) {
        var desktop = FEMhub.lab.getDesktop();

        var notebooks = desktop.getGroup().getBy(function(wnd) {
            return Ext.isDefined(wnd.getUUID) && wnd.getUUID() == conf.uuid;
        }, this);

        if (notebooks.length) {
            var notebook = notebooks[0];
        } else {
            var notebook = desktop.createWindow(FEMhub.Notebook, { conf: conf });
        }

        notebook.show();

        if (notebooks.length) {
            notebook.header.highlight("ee7700", {
                attr: 'color', duration: 2,
            });
        }

        return notebook;
    },

    importNotebook: function() {
        Ext.MessageBox.prompt(
            'Import Notebook',
            'Please enter plain text:',
            function(button, text) {
                if (button === 'ok') {
                    this.newNotebook(this.engines[0].uuid, function(notebook) {
                        notebook.importCells(text);
                    });
                }
            }, this, true);
    },
});

Ext.reg('x-femhub-bookshelf', FEMhub.Bookshelf);

FEMhub.Modules.Bookshelf = Ext.extend(FEMhub.Module, {
    launcher: {
        text: 'Bookshelf',
        icon: 'femhub-bookshelf-launcher-icon',
    },
    winCls: FEMhub.Bookshelf,
});

