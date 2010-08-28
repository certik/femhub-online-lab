
FEMhub.Notebook = Ext.extend(Ext.Window, {
    iconCls: 'femhub-notebook-icon',
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
                }, '-', {
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
                },
            ],
        });

        FEMhub.Notebook.superclass.initComponent.call(this);
    },

    onRender: function() {
        FEMhub.Notebook.superclass.onRender.apply(this, arguments);

        this.cells = new FEMhub.Cells({
            nbid: this.nbid,
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
                            this.bookshelf.getNotebooks();
                        } else {
                            FEMhub.log("Can't rename notebook");
                        }
                    }, this);
                }
            }
        }, this, false, this.name);
    },

    evaluateCells: function() {
        this.getCellsManager().evaluateCells();
    },
});

