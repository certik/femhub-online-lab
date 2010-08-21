
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
                }, '-', {
                    cls: 'x-btn-text-icon',
                    text: 'Rename',
                    iconCls: 'femhub-rename-icon',
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

