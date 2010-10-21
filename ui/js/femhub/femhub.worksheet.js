
FEMhub.Worksheet = Ext.extend(Ext.Window, {
    imports: [],

    constructor: function(config) {
        config = config || {};

        if (!Ext.isDefined(config.conf.name)) {
            config.conf.name = 'untitled';
        }

        this.cells = new FEMhub.CellPanel({ conf: config.conf });

        Ext.applyIf(config, {
            title: config.conf.name,
            iconCls: 'femhub-worksheet-icon',
            layout: 'fit',
            tbar: this.initToolbar(),
            items: this.cells,
        });

        FEMhub.Worksheet.superclass.constructor.call(this, config);
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
                iconCls: 'femhub-share-worksheet-icon',
                tooltip: 'Share this worksheet with other users.',
                tabIndex: -1,
                handler: function() {
                    FEMhub.RPC.Worksheet.publish({uuid: this.getUUID()}, function(result) {
                        if (result.ok === true) {
                            FEMhub.msg.info(this, "Worksheet was published successfully.");
                        } else {
                            switch(result.reason) {
                            case 'choose-better-name':
                                FEMhub.msg.warning(this, "Choose a more distinguished name first.");
                                break;
                            case 'already-published':
                                FEMhub.msg.warning(this, "Worksheet was already published.");
                                break;
                            default:
                                FEMhub.msg.error(this, "Error when publishing worksheet.");
                            }
                        }
                    }, this);
                },
                scope: this,
            }, '-', {
                cls: 'x-btn-text-icon',
                text: 'Evaluate All',
                iconCls: 'femhub-eval-all-worksheet-icon',
                tooltip: 'Evaluate all cells in this worksheet.',
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
                tooltip: 'Import external cells to this worksheet.',
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
                tooltip: 'Choose new title for this worksheet.',
                tabIndex: -1,
                handler: function() {
                    this.renameWorksheet();
                },
                scope: this,
            }, {
                cls: 'x-btn-text-icon',
                text: 'Save',
                iconCls: 'femhub-save-worksheet-icon',
                tooltip: 'Save changes to this worksheet.',
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
            title = 'Worksheet - ' + title;
        } else {
            title = 'Worksheet';
        }

        FEMhub.Worksheet.superclass.setTitle.call(this, title, iconCls);
    },

    close: function() {
        var manager = this.getCellsManager();

        if (manager.isSaved()) {
            FEMhub.Worksheet.superclass.close.call(this);
        } else {
            Ext.MessageBox.show({
                title: 'Save changes?',
                msg: 'There are unsaved cells in your worksheet. Would you like to save your changes?',
                buttons: Ext.Msg.YESNOCANCEL,
                fn: function(button) {
                    switch (button) {
                        case 'yes':
                            manager.saveCells();
                        case 'no':
                            FEMhub.Worksheet.superclass.close.call(this);
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

    renameWorksheet: function() {
        Ext.MessageBox.prompt('Rename worksheet', 'Enter new worksheet name:', function(button, title) {
            if (button === 'ok') {
                if (FEMhub.util.isValidName(title) === false) {
                    Ext.MessageBox.show({
                        title: 'Rename worksheet',
                        msg: "'" + title + "' is not a valid worksheet name.",
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR,
                    });
                } else {
                    var uuid = this.getUUID();

                    FEMhub.RPC.Worksheet.rename({uuid: uuid, name: title}, function(result) {
                        if (result.ok === true) {
                            this.setTitle(title);

                            FEMhub.getDesktop().getManager().each(function(wnd) {
                                if (wnd.getXType() === 'x-femhub-browser') {
                                    wnd.getWorksheets();
                                }
                            });
                        } else {
                            FEMhub.log("Can't rename worksheet");
                        }
                    }, this);
                }
            }
        }, this, false, this.name);
    },

    selectImports: function() {
        var checked = [];

        Ext.each(this.imports, function(worksheet) {
            checked.push(worksheet.uuid);
        });

        var chooser = new FEMhub.WorksheetChooser({
            uuid: this.getUUID(),
            exclude: true,
            checked: checked,
            listeners: {
                worksheetschosen: {
                    fn: function(worksheets) {
                        this.imports = worksheets;
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

        Ext.each(this.imports, function(worksheet) {
            FEMhub.RPC.Worksheet.load({
                uuid: worksheet.uuid,
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

    execAction: function(action, key, evt) {
        var method = 'action' + FEMhub.util.capitalizeFirst(action);
        this[method].call(this, this.getCellsManager());
    },

    actionActivateCell: function(manager) {
        var cell = manager.getActiveCell();

        if (cell === null) {
            cell = manager.getFirstCell();

            if (cell === null) {
                return;
            }
        }

        cell.focusCell();
    },

    actionActivateNextCell: function(manager) {
        var cell = manager.getActiveCell();

        if (cell !== null) {
            manager.activateNextCell(cell);
        }
    },

    actionActivatePrevCell: function(manager) {
        var cell = manager.getActiveCell();

        if (cell !== null) {
            manager.activatePrevCell(cell);
        }
    },

    actionNextBracket: function(manager) {
        var cell = manager.getFocusedCell();

        if (cell !== null) {
            cell.nextBracket();
        }
    },

    actionPrevBracket: function(manager) {
        var cell = manager.getFocusedCell();

        if (cell !== null) {
            cell.prevBracket();
        }
    },

    actionWipeCell: function(manager) {
        var cell = manager.getFocusedCell();

        if (cell !== null) {
            cell.wipeCell();
        }
    },

    actionClearCell: function(manager) {
        var cell = manager.getFocusedCell();

        if (cell !== null) {
            cell.clearCell();
        }
    },

    actionRemoveCell: function(manager) {
        var cell = manager.getFocusedCell();

        if (cell !== null) {
            cell.removeCell();
        }
    },

    actionQuitCell: function(manager) {
        var cell = manager.getFocusedCell();

        if (cell !== null) {
            cell.blurCell();
            window.focus();
        }
    },

    actionCollapseCell: function(manager) {
        var cell = manager.getFocusedCell();

        if (cell !== null) {
            cell.collapseCell();
        }
    },

    actionExpandCell: function(manager) {
        var cell = manager.getFocusedCell();

        if (cell !== null) {
            cell.expandCell();
        }
    },

    actionSplitCellUpper: function(manager) {
        var cell = manager.getFocusedCell();

        if (cell !== null) {
            cell.splitCellUpper();
        }
    },

    actionSplitCellLower: function(manager) {
        var cell = manager.getFocusedCell();

        if (cell !== null) {
            cell.splitCellLower();
        }
    },

    actionMergeCellBefore: function(manager) {
        var cell = manager.getFocusedCell();

        if (cell !== null) {
            cell.mergeCellBefore();
        }
    },

    actionMergeCellAfter: function(manager) {
        var cell = manager.getFocusedCell();

        if (cell !== null) {
            cell.mergeCellAfter();
        }
    },

    actionForwardEvaluateCell: function(manager) {
        var cell = manager.getFocusedCell();

        if (cell !== null) {
            cell.evaluateCell({keepfocus: false});
        }
    },

    actionInplaceEvaluateCell: function(manager) {
        var cell = manager.getFocusedCell();

        if (cell !== null) {
            cell.evaluateCell({keepfocus: true});
        }
    },

    actionInterruptCell: function(manager) {
        var cell = manager.getFocusedCell();

        if (cell !== null) {
            cell.interruptCell();
        }
    },

    actionIntrospectCell: function(manager) {
        var cell = manager.getFocusedCell();

        if (cell !== null) {
            // XXX: cell.introspectCell();
            cell.autocomplete();
        }
    },
});

Ext.reg('x-femhub-worksheet', FEMhub.Worksheet);

FEMhub.Mappings.Worksheet = Ext.extend(FEMhub.Mapping, {
    xtype: 'x-femhub-worksheet',
    bindings: {
        'TAB       -shift -ctrl -alt': 'introspectCell',
        'T         -shift -ctrl +alt': 'introspectCell',
        'SPACE     -shift +ctrl -alt': 'introspectCell',
        'DOWN      -shift -ctrl -alt': 'activateNextCell',
        'J         -shift -ctrl +alt': 'activateNextCell',
        'UP        -shift -ctrl -alt': 'activatePrevCell',
        'K         -shift -ctrl +alt': 'activatePrevCell',
        'LEFT      -shift -ctrl +alt': 'collapseCell',
        'H         -shift -ctrl +alt': 'collapseCell',
        'RIGHT     -shift -ctrl +alt': 'expandCell',
        'L         -shift -ctrl +alt': 'expandCell',
        'ENTER     +shift -ctrl -alt': 'forwardEvaluateCell',
        'E         -shift -ctrl +alt': 'forwardEvaluateCell',
        'ENTER     -shift +ctrl -alt': 'inplaceEvaluateCell',
        'E         +shift -ctrl +alt': 'inplaceEvaluateCell',
        'I         -shift -ctrl +alt': 'interruptCell',
        '.         -shift -ctrl +alt': 'copyCell',
        'W         -shift -ctrl +alt': 'wipeCell',
        'C         -shift -ctrl +alt': 'clearCell',
        'R         -shift -ctrl +alt': 'removeCell',
        // XXX: 'S         +shift -ctrl +alt': 'splitCellUpper',
        // XXX: 'S         -shift -ctrl +alt': 'splitCellLower',
        'DOWN      +shift -ctrl +alt': 'mergeCellAfter',
        'J         +shift -ctrl +alt': 'mergeCellAfter',
        'UP        +shift -ctrl +alt': 'mergeCellBefore',
        'K         +shift -ctrl +alt': 'mergeCellBefore',
        'A         -shift -ctrl +alt': 'activateCell',
        'Q         -shift -ctrl +alt': 'quitCell',
        ']         -shift -ctrl +alt': 'nextBracket',
        '[         -shift -ctrl +alt': 'prevBracket',
    },
});

