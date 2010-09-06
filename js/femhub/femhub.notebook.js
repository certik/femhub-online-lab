
FEMhub.Notebook = Ext.extend(Ext.Window, {
    imports: [],

    constructor: function(config) {
        if (!Ext.isDefined(config.name)) {
            config.name = 'untitled';
        }

        var tbar = this.initToolbar();

        this.cells = new FEMhub.Cells({
            nbid: config.guid,
            name: config.name,
        });

        Ext.applyIf(config, {
            title: config.name,
            iconCls: 'femhub-notebook-icon',
            layout: 'fit',
            tbar: tbar,
            items: this.cells,
        });

        FEMhub.Notebook.superclass.constructor.call(this, config);
    },

    getCellsManager: function() {
        return this.cells.getCellsManager();
    },

    initToolbar: function() {
        return new Ext.Toolbar({
            enableOverflow: true,
            items: [{
                cls: 'x-btn-text-icon',
                text: 'Share',
                iconCls: 'femhub-share-notebook-icon',
                handler: function() {
                    FEMhub.raiseNotImplementedError();
                },
                scope: this,
            }, '-', {
                cls: 'x-btn-text-icon',
                text: 'Evaluate All',
                iconCls: 'femhub-eval-all-notebook-icon',
                handler: function() {
                    this.evaluateCells();
                },
                scope: this,
            }, {
                xtype: 'tbsplit',
                cls: 'x-btn-text-icon',
                text: 'Imports',
                iconCls: 'femhub-plugin-icon',
                menu: [{
                    text: 'Select',
                    iconCls: 'femhub-plugin-edit-icon',
                    handler: function() {
                        this.selectImports();
                    },
                    scope: this,
                }, {
                    text: 'Reload',
                    iconCls: 'femhub-refresh-icon',
                    handler: function() {
                        this.evaluateImports();
                    },
                    scope: this,
                }],
                handler: function() {
                    this.selectImports();
                },
                scope: this,
            }, '-', {
                cls: 'x-btn-text-icon',
                text: 'Refresh',
                iconCls: 'femhub-refresh-icon',
                handler: function() {
                    this.getCellsManager().justifyCells();
                },
                scope: this,
            }, {
                cls: 'x-btn-text-icon',
                text: 'Rename',
                iconCls: 'femhub-rename-icon',
                handler: function() {
                    this.renameNotebook();
                },
                scope: this,
            }, {
                cls: 'x-btn-text-icon',
                text: 'Save',
                iconCls: 'femhub-save-notebook-icon',
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
                cls: 'x-btn-text-icon',
                text: 'Kill',
                iconCls: 'femhub-remove-icon',
                handler: function() {
                    this.getCellsManager().killBackend();
                },
                scope: this,
            }],
        });
    },

    setTitle: function(title, iconCls) {
        this.name = title;

        if (title) {
            title = 'Notebook - ' + title;
        } else {
            title = 'Notebook';
        }

        FEMhub.Notebook.superclass.setTitle.call(this, title, iconCls);
    },

    close: function() {
        var manager = this.getCellsManager();

        if (manager.isSavedToBackend()) {
            manager.killEngine();
            FEMhub.Notebook.superclass.close.call(this);
        } else {
            Ext.MessageBox.show({
                title: 'Save changes?',
                msg: 'There are unsaved cells in your notebook. Would you like to save your changes?',
                buttons: Ext.Msg.YESNOCANCEL,
                fn: function(button) {
                    switch (button) {
                        case 'yes':
                            manager.saveToBackend();
                        case 'no':
                            manager.killEngine();
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

    renameNotebook: function() {
        Ext.MessageBox.prompt('Rename notebook', 'Enter new notebook name:', function(button, title) {
            if (button === 'ok') {
                if (FEMhub.isValidName(title) === false) {
                    Ext.MessageBox.show({
                        title: 'Rename notebook',
                        msg: "'" + title + "' is not a valid notebook name.",
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR,
                    });
                } else {
                    var guid = this.getCellsManager().nbid;

                    FEMhub.RPC.Notebooks.renameNotebook({guid: guid, title: title}, function(result) {
                        if (result.ok === true) {
                            this.setTitle(title);

                            FEMhub.getDesktop().getManager().each(function(wnd) {
                                if (wnd.getXType() === 'x-femhub-bookshelf') {
                                    wnd.getNotebooks();
                                }
                            });
                        } else {
                            FEMhub.log("Can't rename notebook");
                        }
                    }, this);
                }
            }
        }, this, false, this.name);
    },

    selectImports: function() {
        var checked = [];

        Ext.each(this.imports, function(notebook) {
            checked.push(notebook.guid);
        });

        var chooser = new FEMhub.NotebookChooser({
            guid: this.getCellsManager().nbid,
            exclude: true,
            checked: checked,
            listeners: {
                notebookschosen: {
                    fn: function(notebooks) {
                        this.imports = notebooks;
                    },
                    scope: this,
                },
            },
            title: 'Choose imports',
            iconCls: 'femhub-plugin-icon',
            chooseText: 'Import',
        });

        chooser.show();
    },

    evaluateImports: function(evalCells) {
        var index = 0;

        Ext.each(this.imports, function(notebook) {
            FEMhub.RPC.Notebooks.getCells({
                guid: notebook.guid,
                type: 'input',
            }, function(result) {
                if (result.ok === true) {
                    if (Ext.isDefined(result.cells)) {
                        Ext.each(result.cells, function(cell) {
                            var manager = this.getCellsManager();
                            manager.evaluateCode(cell.content);
                        }, this);
                    }
                } else {
                    /* pass */
                }

                if (++index == this.imports.length && evalCells) {
                    this.getCellsManager().evaluateCells();
                }
            }, this);
        }, this);
    },

    evaluateCells: function() {
        if (this.imports.length) {
            this.evaluateImports(true);
        } else {
            this.getCellsManager().evaluateCells();
        }
    },
});

Ext.reg('x-femhub-notebook', FEMhub.Notebook);

