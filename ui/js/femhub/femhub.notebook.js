
FEMhub.Notebook = Ext.extend(Ext.Window, {
    imports: [],

    constructor: function(config) {
        config = config || {};

        if (!Ext.isDefined(config.conf.name)) {
            config.conf.name = 'untitled';
        }

        this.cells = new FEMhub.CellPanel({ conf: config.conf });

        Ext.applyIf(config, {
            title: config.conf.name,
            iconCls: 'femhub-notebook-icon',
            layout: 'fit',
            tbar: this.initToolbar(),
            items: this.cells,
        });

        FEMhub.Notebook.superclass.constructor.call(this, config);
    },

    getCellsManager: function() {
        return this.cells.getCellsManager();
    },

    getUUID: function() {
        return this.getCellsManager().getUUID();
    },

    initToolbar: function() {
        return new Ext.Toolbar({
            enableOverflow: true,
            items: [{
                cls: 'x-btn-text-icon',
                text: 'Publish',
                iconCls: 'femhub-share-notebook-icon',
                tooltip: 'Share this notebook with other users.',
                tabIndex: -1,
                handler: function() {
                    FEMhub.RPC.Notebook.publish({uuid: this.getUUID()}, function(result) {
                        if (result.ok === true) {
                            FEMhub.msg.info("Notebook", "Notebook was published successfully.");
                        } else {
                            switch(result.reason) {
                            case 'choose-better-name':
                                FEMhub.msg.warning("Notebook", "Choose a more distinguished name first.");
                                break;
                            case 'already-published':
                                FEMhub.msg.warning("Notebook", "Notebook was already published.");
                                break;
                            default:
                                FEMhub.msg.error("Notebook", "Error when publishing notebook.");
                            }
                        }
                    });
                },
                scope: this,
            }, '-', {
                cls: 'x-btn-text-icon',
                text: 'Evaluate All',
                iconCls: 'femhub-eval-all-notebook-icon',
                tooltip: 'Evaluate all cells in this notebook.',
                tabIndex: -1,
                handler: function() {
                    this.evaluateCells();
                },
                scope: this,
            }, {
                xtype: 'tbsplit',
                cls: 'x-btn-text-icon',
                text: 'Imports',
                iconCls: 'femhub-plugin-icon',
                tooltip: 'Import external cells to this notebook.',
                tabIndex: -1,
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
                cls: 'x-btn-icon',
                iconCls: 'femhub-increase-font-size-icon',
                tooltip: "Increase cells' font size.",
                tabIndex: -1,
                handler: function() {
                    this.getCellsManager().increaseFontSize();
                },
                scope: this,
            }, {
                cls: 'x-btn-icon',
                iconCls: 'femhub-decrease-font-size-icon',
                tooltip: "Decrease cells' font size.",
                tabIndex: -1,
                handler: function() {
                    this.getCellsManager().decreaseFontSize();
                },
                scope: this,
            }, '-', {
                cls: 'x-btn-text-icon',
                text: 'Refresh',
                iconCls: 'femhub-refresh-icon',
                tooltip: 'Refresh the user interface.',
                tabIndex: -1,
                handler: function() {
                    this.getCellsManager().justifyCells();
                },
                scope: this,
            }, {
                cls: 'x-btn-text-icon',
                text: 'Rename',
                iconCls: 'femhub-rename-icon',
                tooltip: 'Choose new title for this notebook.',
                tabIndex: -1,
                handler: function() {
                    this.renameNotebook();
                },
                scope: this,
            }, {
                cls: 'x-btn-text-icon',
                text: 'Save',
                iconCls: 'femhub-save-notebook-icon',
                tooltip: 'Save changes to this notebook.',
                tabIndex: -1,
                handler: function() {
                    this.getCellsManager().saveCells();
                },
                scope: this,
            }, {
                cls: 'x-btn-text',
                text: 'Save & Close',
                tooltip: 'Save changes and close this window.',
                tabIndex: -1,
                handler: function() {
                    this.getCellsManager().saveCells(this.close, this);
                },
                scope: this,
            }, '-', {
                cls: 'x-btn-text-icon',
                text: 'Interrupt',
                iconCls: 'femhub-remove-icon',
                tooltip: 'Interrupt currently evaluating cell.',
                tabIndex: -1,
                handler: function() {
                    this.getCellsManager().interruptEngine();
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

        if (manager.isSaved()) {
            FEMhub.Notebook.superclass.close.call(this);
        } else {
            Ext.MessageBox.show({
                title: 'Save changes?',
                msg: 'There are unsaved cells in your notebook. Would you like to save your changes?',
                buttons: Ext.Msg.YESNOCANCEL,
                fn: function(button) {
                    switch (button) {
                        case 'yes':
                            manager.saveCells();
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

    renameNotebook: function() {
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
                    var uuid = this.getUUID();

                    FEMhub.RPC.Notebook.rename({uuid: uuid, name: title}, function(result) {
                        if (result.ok === true) {
                            this.setTitle(title);

                            FEMhub.getDesktop().getManager().each(function(wnd) {
                                if (wnd.getXType() === 'x-femhub-browser') {
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
            checked.push(notebook.uuid);
        });

        var chooser = new FEMhub.NotebookChooser({
            uuid: this.getUUID(),
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
            FEMhub.RPC.Notebook.load({
                uuid: notebook.uuid,
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

