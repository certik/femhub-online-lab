
FEMhub.Browser = Ext.extend(FEMhub.Window, {
    toolbar: null,
    foldersTree: null,
    worksheetsGrid: null,

    engines: null,

    constructor: function(config) {
        config = config || {};

        this.initEngines();

        this.toolbar = this.initToolbar();
        this.statusbar = this.initStatusbar();

        this.initFoldersTree();
        this.initWorksheetsGrid();

        Ext.apply(config, {
            title: 'Browser',
            iconCls: 'femhub-browser-icon',
            layout: 'border',
            tbar: this.toolbar,
            bbar: this.statusbar,
            items: [this.foldersTree, this.worksheetsGrid],
        });

        FEMhub.Browser.superclass.constructor.call(this, config);
    },

    initStatusbar: function() {
        return new FEMhub.Statusbar({
            busyText: '',
            defaultText: '',
        });
    },

    initToolbar: function() {
        return new Ext.Toolbar({
            enableOverflow: true,
            items: [{
                xtype: 'button',
                cls: 'x-btn-text-icon',
                text: 'New Worksheet',
                iconCls: 'femhub-add-worksheet-icon',
                handler: function() {
                    this.newWorksheet();
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
                xtype: 'tbsplit',
                cls: 'x-btn-text-icon',
                text: 'Import Worksheet',
                iconCls: 'femhub-import-worksheet-icon',
                menu: [{
                    text: 'Import RST',
                    handler: function() {
                        this.importFromRST();
                    },
                    scope: this,
                }, {
                    text: 'Import SAGE',
                    handler: function() {
                        // XXX: this is old interface, fix this
                        this.importWorksheet();
                    },
                    scope: this,
                }],
                handler: function() {
                    this.importFromRST();
                },
                scope: this,
            }, {
                xtype: 'button',
                cls: 'x-btn-text-icon',
                text: 'Fork Worksheet',
                iconCls: 'femhub-fork-icon',
                handler: function() {
                    this.forkWorksheet();
                },
                scope: this,
            }, '-', {
                xtype: 'button',
                cls: 'x-btn-text-icon',
                text: 'Refresh',
                iconCls: 'femhub-refresh-icon',
                handler: function() {
                    this.getWorksheets();
                },
                scope: this,
            }, {
                xtype: 'button',
                cls: 'x-btn-text-icon',
                text: 'Rename',
                iconCls: 'femhub-rename-icon',
                handler: function() {
                    var model = this.worksheetsGrid.getSelectionModel();

                    if (model.getCount()) {
                        var record = model.getSelected();
                        this.renameWorksheet(record);
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
                    var model = this.worksheetsGrid.getSelectionModel();

                    if (model.getCount()) {
                        var record = model.getSelected();
                        this.deleteWorksheet(record);
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

                if (engines.length === 0) {
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

                                FEMhub.RPC.Worksheet.move({
                                    uuid: uuids,
                                    target_uuid: evt.target.id,
                                }, function(result) {
                                    if (result.ok === true) {
                                        var store = this.worksheetsGrid.getStore();

                                        for (var j = 0; j < uuids.length; j++) {
                                            store.remove(store.getById(uuids[j]));
                                        }
                                    } else {
                                        FEMhub.log("Couldn't move worksheets");
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
                var text;

                if (!engine.description.length) {
                    text = engine.name;
                } else {
                    text = String.format("{0} ({1})", engine.name, engine.description);
                }

                engines.push({
                    uuid: engine.uuid,
                    text: text,
                    handler: function(item) {
                        this.addWorksheetAt(node, item.uuid);
                    },
                    scope: this,
                });
            }, this);

            var context = new Ext.menu.Menu({
                items: [{
                    text: 'New worksheet',
                    iconCls: 'femhub-add-worksheet-icon',
                    handler: function() {
                        this.addWorksheetAt(node);
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
            this.getWorksheets(node);
        }, this);

        this.fillFoldersTree();
    },

    initWorksheetsGrid: function() {
        this.grid = this.worksheetsGrid = new Ext.grid.GridPanel({
            ds: new Ext.data.Store({
                reader: new Ext.data.ArrayReader({
                    idIndex: 0,
                }, [
                    {name: 'uuid'},
                    {name: 'name'},
                    {name: 'created'},
                    {name: 'modified'},
                    {name: 'published'},
                    {name: 'description'},
                    {name: 'engine'},
                    {name: 'origin'},
                ]),
            }),
            cm: new Ext.grid.ColumnModel([
                new Ext.grid.RowNumberer(),
                { header: "Title", width: 200, sortable: true, dataIndex: 'name',
                    renderer: function(value, metadata, record, rowIndex, colIndex, store) {
                        var cls = 'femhub-rec-name ', text;

                        if (record.data.published !== null) {
                            cls += 'femhub-record-published-icon';
                            text = '';
                        } else {
                            cls += 'femhub-record-unpublished-icon';
                            text = "This worksheet wasn't published yet. Click &quot;Publish&quot; " +
                                   "to make it available to other users.";
                        }

                        var html = '<div class="' + cls + '" title="' + text + '"><a>' + value + '</a></div>';

                        var origin = record.data.origin;

                        if (origin !== null) {
                            var url = '/worksheets/' + origin.uuid + '/';
                            var path = origin.user + '/.../' + origin.name;
                            var title = [origin.user].concat(origin.path, [origin.name]).join('/');

                            html += '<div class="femhub-rec-fork">Forked from <a href="' + url + '" target="_blank" title="' + title + '">' + path + '</a></div>';
                        }

                        return html;
                    },
                },
                { header: "Engine", width: 70, sortable: true, dataIndex: 'engine',
                    renderer: function(value, metadata, record, rowIndex, colIndex, store) {
                        return '<div title="' + value.uuid + '">' + value.name + '</div>';
                    },
                },
                { header: "Created", width: 100, sortable: true, dataIndex: 'created',
                    renderer: function(value, metadata, record, rowIndex, colIndex, store) {
                        var date = FEMhub.util.ago(Date.parseDate(value, 'Y-m-d H:i:s'));
                        return '<div title="' + value + '">' + date + '</div>';
                    },
                },
            ]),
            sm: new Ext.grid.RowSelectionModel({ singleSelect: true }),
            viewConfig: {
                forceFit: true,
            },
            region: 'center',
            enableDragDrop: true,
            ddGroup: 'folders',
        });

        this.worksheetsGrid.on('rowdblclick', function(grid, row, evt) {
            var record = grid.getStore().getAt(row);

            this.openWorksheet({
                uuid: record.data.uuid,
                name: record.data.name,
            });
        }, this);

        this.worksheetsGrid.on('rowcontextmenu', function(grid, row, evt) {
            var record = grid.getStore().getAt(row);

            var context = new Ext.menu.Menu({
                items: [{
                    text: 'Open',
                    iconCls: 'femhub-edit-worksheet-icon',
                    menu: [{
                        text: 'Open without output cells',
                        handler: function() {
                            this.openWorksheet({
                                uuid: record.data.uuid,
                                name: record.data.name,
                                loadOutputCells: false,
                            });
                        },
                        scope: this,
                    }],
                    handler: function() {
                        this.openWorksheet({
                            uuid: record.data.uuid,
                            name: record.data.name,
                        });
                    },
                    scope: this,
                }, {
                    text: 'Export',
                    iconCls: 'femhub-export-worksheet-icon',
                    // TODO: add sub-menu and other targets
                    handler: function() {
                        this.exportAsRST(record.data.uuid);
                    },
                    scope: this,
                }, '-', {
                    text: 'Rename',
                    iconCls: 'femhub-rename-icon',
                    handler: function() {
                        this.renameWorksheet(record);
                    },
                    scope: this,
                }, {
                    text: 'Delete',
                    iconCls: 'femhub-remove-icon',
                    handler: function() {
                        this.deleteWorksheet(record);
                    },
                    scope: this,
                }, '-', {
                    text: 'Sync',
                    iconCls: 'femhub-sync-worksheet-icon',
                    handler: function() {
                        this.syncWorksheet(record);
                    },
                    scope: this,
                }],
            });

            context.showAt(evt.getXY());
            evt.stopEvent();
        }, this);
    },

    isMyFolders: function(node) {
        return node.getDepth() == 1;
    },

    getMyFolders: function() {
        return this.foldersTree.getRootNode().firstChild;
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

        function getFolders() {
            FEMhub.RPC.Folder.getFolders({}, function(result) {
                if (result.ok === true) {
                    recFillTree.call(this, result.folders, root);
                    this.getMyFolders().select();
                    this.getWorksheets();
                    root.expand(true);
                }
            }, this);
        }

        // XXX: this is an obsolete hack (remove this)

        FEMhub.RPC.Folder.getRoot({}, {
            handler: function(result) {
                if (result.ok === true) {
                    getFolders.call(this);
                }
            },
            scope: this,
            status: this,
        });
    },

    addFolder: function(node) {
        node = this.getCurrentNode(node);

        Ext.MessageBox.prompt('Add folder', 'Enter folder name:', function(button, name) {
            if (button === 'ok') {
                if (FEMhub.util.isValidName(name) === false) {
                    Ext.MessageBox.show({
                        title: 'Add folder',
                        msg: "Invalid folder name.",
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR,
                    });
                } else {
                    FEMhub.RPC.Folder.create({uuid: node.id, name: name}, function(result) {
                        if (result.ok === true) {
                            node.appendChild(new Ext.tree.TreeNode({
                                id: result.uuid,
                                text: name,
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
        node = this.getCurrentNode(node);

        if (this.isMyFolders(node)) {
            Ext.MessageBox.show({
                title: 'Rename folder',
                msg: "Can't rename root node. Sorry. ",
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.ERROR,
            });
        } else {
            Ext.MessageBox.prompt('Rename folder', 'Enter new folder name:', function(button, name) {
                if (button === 'ok') {
                    if (FEMhub.util.isValidName(name) === false) {
                        Ext.MessageBox.show({
                            title: 'Rename folder',
                            msg: "Invalid folder name.",
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.ERROR,
                        });
                    } else {
                        FEMhub.RPC.Folder.rename({uuid: node.id, name: name}, function(result) {
                            if (result.ok === true) {
                                node.setText(name);
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
        node = this.getCurrentNode(node);

        if (this.isMyFolders(node)) {
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

    renameWorksheet: function(record) {
        Ext.MessageBox.prompt('Rename worksheet', 'Enter new worksheet name:', function(button, name) {
            if (button === 'ok') {
                if (FEMhub.util.isValidName(name) === false) {
                    Ext.MessageBox.show({
                        title: 'Rename worksheet',
                        msg: "'" + name + "' is not a valid worksheet name.",
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR,
                    });
                } else {
                    FEMhub.RPC.Worksheet.rename({uuid: record.data.uuid, name: name}, function(result) {
                        if (result.ok === true) {
                            record.set('name', name);
                            record.commit();
                        } else {
                            FEMhub.log("Can't rename worksheet");
                        }
                    });
                }
            }
        }, this, false, record.get('name'));
    },

    deleteWorksheet: function(record) {
        Ext.MessageBox.show({
            title: 'Delete worksheet',
            msg: 'Do you really want to delete selected worksheet and all its contents?',
            buttons: Ext.MessageBox.YESNO,
            icon: Ext.MessageBox.QUESTION,
            fn: function(button) {
                if (button === 'yes') {
                    FEMhub.RPC.Worksheet.remove({uuid: record.data.uuid}, function(result) {
                        if (result.ok === true) {
                            this.worksheetsGrid.getStore().remove(record);
                        } else {
                            FEMhub.log("Can't delete worksheet");
                        }
                    }, this);
                }
            },
            scope: this,
        });
    },

    syncWorksheet: function(record, force) {
        FEMhub.RPC.Worksheet.sync({uuid: record.data.uuid, force: force}, {
            okay: function(result) {
                FEMhub.msg.info(this, "Worksheet was synchronized successfully.");
            },
            fail: {
                title: this,
                errors: {
                    'does-not-exist': "Worksheet doesn't exist.",
                    'does-not-have-origin': "Worksheet wasn't forked.",
                },
                handler: function(reason) {
                    if (reason === 'worksheet-was-modified') {
                        Ext.MessageBox.show({
                            title: "Worksheet synchronization",
                            msg: "Worksheet was modified after it was forked. Do you want to continue?",
                            buttons: Ext.MessageBox.YESNO,
                            icon: Ext.MessageBox.QUESTION,
                            fn: function(button) {
                                if (button === 'yes') {
                                    this.syncWorksheet(record, true);
                                }
                            },
                            scope: this,
                        });
                    } else {
                        FEMhub.msg.error(this, msg);
                    }
                },
            },
            scope: this,
            status: this,
        });
    },

    getCurrentNode: function(node) {
        if (Ext.isDefined(node) && node !== null) {
            return node;
        } else {
            var model = this.foldersTree.getSelectionModel();
            return model.getSelectedNode() || this.getMyFolders();
        }
    },

    getWorksheets: function(node) {
        node = this.getCurrentNode(node);

        FEMhub.RPC.Folder.getWorksheets({uuid: node.id}, {
            okay: function(result) {
                var store = this.grid.getStore();
                var record = store.recordType;

                store.removeAll();

                Ext.each(result.worksheets, function(worksheet) {
                    store.add(new record({
                        uuid: worksheet.uuid,
                        name: worksheet.name,
                        created: worksheet.created,
                        modified: worksheet.modified,
                        published: worksheet.published,
                        description: worksheet.description,
                        engine: worksheet.engine,
                        origin: worksheet.origin,
                    }));
                }, this);
            },
            fail: function(reason) {
                FEMhub.log("Failed to get worksheets");
            },
            scope: this,
            status: this,
        });
    },

    addWorksheetAt: function(node, engine, handler, scope) {
        return this.newWorksheet(engine, handler, scope, node);
    },

    newWorksheet: function(engine, handler, scope, node) {
        engine = engine || this.engines[0].uuid;
        node = this.getCurrentNode(node);

        var params = { name: 'untitled', engine_uuid: engine, folder_uuid: node.id };

        FEMhub.RPC.Worksheet.create(params, function(result) {
            if (result.ok === true) {
                var worksheet = this.openWorksheet({
                    uuid: result.uuid,
                });

                if (Ext.isDefined(handler)) {
                    handler.call(scope || this, worksheet);
                }

                this.getWorksheets();
            } else {
                FEMhub.log("Failed to add new worksheet");
            }
        }, this);
    },

    openWorksheet: function(conf) {
        var desktop = FEMhub.lab.getDesktop();

        var worksheets = desktop.getGroup().getBy(function(wnd) {
            return Ext.isDefined(wnd.getUUID) && wnd.getUUID() == conf.uuid;
        }, this);

        var worksheet;

        if (worksheets.length) {
            worksheet = worksheets[0];
        } else {
            worksheet = desktop.createWindow(FEMhub.Worksheet, { conf: conf });
        }

        worksheet.show();

        if (worksheets.length) {
            worksheet.header.highlight("ee7700", {
                attr: 'color', duration: 2,
            });
        }

        return worksheet;
    },

    importWorksheet: function() {
        Ext.MessageBox.prompt(
            'Import Worksheet',
            'Please enter plain text:',
            function(button, text) {
                if (button === 'ok') {
                    this.newWorksheet(this.engines[0].uuid, function(worksheet) {
                        worksheet.importCells(text);
                    });
                }
            }, this, true);
    },

    importFromRST: function() {
        Ext.MessageBox.prompt(
            'Import Worksheet from RST',
            'Please enter source code:',
            function(button, text) {
                if (button === 'ok') {
                    FEMhub.RPC.Docutils.importRST({
                        name: 'untitled (RST import)',
                        rst: text,
                        engine_uuid: this.engines[0].uuid,
                        folder_uuid: this.getCurrentNode().id,
                    }, function(result) {
                        if (result.ok === true) {
                            Ext.MessageBox.show({
                                title: 'Import Successful',
                                msg: result.count + " cells were imported from RST source code",
                                buttons: Ext.MessageBox.OK,
                                icon: Ext.MessageBox.INFO,
                            });

                            // XXX: fix browser's grid reload
                        }
                    });
                }
            }, this, true);
    },

    exportAsRST: function(uuid) {
        FEMhub.RPC.Docutils.exportRST({uuid: uuid}, function(result) {
            if (result.ok === true) {
                var viewer = new FEMhub.TextViewer({text: result.rst});
                viewer.show();
            }
        }, this);
    },

    forkWorksheet: function() {
        var published = new FEMhub.PublishedWorksheets({
            buttons: [{
                text: 'Fork',
                handler: function() {
                    var worksheet = published.getWorksheet();

                    if (worksheet === null) {
                        FEMhub.msg.warning(published, "Select a worksheet first and then click 'Fork'.");
                    } else {
                        var node = this.getCurrentNode();

                        var params = {
                            origin_uuid: worksheet.uuid,
                            folder_uuid: node.id,
                        };

                        FEMhub.RPC.Worksheet.fork(params, {
                            okay: function(result) {
                                FEMhub.msg.info(this, "'" + result.name + "' was forked sucessfully.");
                                this.getWorksheets();
                                published.close();
                            },
                            fail: {
                                'origin-does-not-exist': "Origin worksheet doesn't exist.",
                                'folder-does-not-exist': "Destination folder doesn't exist.",
                                'origin-is-not-published': "Origin worksheet isn't published.",
                            },
                            scope: this,
                        });
                    }
                },
                scope: this,
            }, 'view', '-', 'close'],
        });

        published.show();
    },
});

Ext.reg('x-femhub-browser', FEMhub.Browser);

FEMhub.Modules.Browser = Ext.extend(FEMhub.Module, {
    launcher: {
        text: 'Browser',
        icon: 'femhub-browser-launcher-icon',
    },
    winCls: FEMhub.Browser,
});

