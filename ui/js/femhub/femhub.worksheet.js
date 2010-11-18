
FEMhub.Worksheet = Ext.extend(FEMhub.Window, {
    imports: [],

    constructor: function(config) {
        config = config || {};

        if (!Ext.isDefined(config.conf.name)) {
            config.conf.name = 'untitled';
        }

        this.menubar = this.initMenubar();
        this.toolbar = this.initToolbar();
        this.statusbar = this.initStatusbar();

        this.cells = new FEMhub.CellPanel({
            managerConfig: config.conf,
            listeners: {
                cellmanagerready: function(panel, manager) {
                    manager.loadCells();
                },
                scope: this,
            },
        });

        var manager = this.getCellManager();

        function start(manager, text, evt) {
            var id = this.statusbar.showBusy({text: text});

            manager.on(evt, function(manager, ok, ret) {
                try {
                    this.statusbar.clearBusy(id);
                } catch (err) {};
            }, this, {single: true});
        }

        manager.on({
            loadstart: start.partial(this, ["Loading worksheet", 'loadend'], 1),
            savestart: start.partial(this, ["Saving worksheet", 'saveend'], 1),
            initstart: start.partial(this, ["Initializing engine", 'initend'], 1),
            killstart: start.partial(this, ["Terminating engine", 'killend'], 1),
            statstart: start.partial(this, ["Gathering statistics", 'statend'], 1),
            completestart: start.partial(this, ["Completing", 'completeend'], 1),
            evaluatestart: start.partial(this, ["Evaluating", 'evaluateend'], 1),
            interruptstart: start.partial(this, ["Interrupting", 'interruptend'], 1),
            scope: this,
        });

        Ext.applyIf(config, {
            title: config.conf.name,
            iconCls: 'femhub-worksheet-icon',
            layout: 'fit',
            tbar: this.menubar,
            bbar: this.statusbar,
            items: {
                layout: 'fit',
                border: false,
                tbar: this.toolbar,
                items: this.cells,
            },
        });

        FEMhub.Worksheet.superclass.constructor.call(this, config);
    },

    getCellManager: function() {
        return this.cells.getCellManager();
    },

    getUUID: function() {
        return this.getCellManager().getUUID();
    },

    initStatusbar: function() {
        return new FEMhub.Statusbar({
            busyText: '',
            defaultText: '',
        });
    },

    initMenubar: function() {
        return new FEMhub.Menubar({
            items: [{
                text: 'Worksheet',
                menu: [{
                    text: 'Save',
                    handler: function() {
                        this.getCellManager().saveCells();
                    },
                    scope: this,
                }, {
                    text: 'Close',
                    handler: function() {
                        this.close();
                    },
                    scope: this,
                }],
            }, {
                text: 'Cell',
                menu: [{
                    text: 'Remove all output',
                    handler: function() {
                        this.getCellManager().removeOutputCells();
                    },
                    scope: this,
                }, '-', {
                    text: 'Insert before',
                    menu: [{
                        text: 'Input cell',
                        handler: function() {
                            this.execCellAction('insertInputCellBefore', true);
                        },
                        scope: this,
                    }, {
                        text: 'Text cell',
                        handler: function() {
                            this.execCellAction('insertTextCellBefore', true);
                        },
                        scope: this,
                    }],
                }, {
                    text: 'Insert after',
                    menu: [{
                        text: 'Input cell',
                        handler: function() {
                            this.execCellAction('insertInputCellAfter', true);
                        },
                        scope: this,
                    }, {
                        text: 'Text cell',
                        handler: function() {
                            this.execCellAction('insertTextCellAfter', true);
                        },
                        scope: this,
                    }],
                }, '-', {
                    text: 'Merge above',
                    handler: function() {
                        this.execCellAction('mergeCellAbove', true);
                    },
                    scope: this,
                }, {
                    text: 'Merge below',
                    handler: function() {
                        this.execCellAction('mergeCellBelow', true);
                    },
                    scope: this,
                }, '-', {
                    text: 'Remove',
                    handler: function() {
                        this.execCellAction('removeCell', true);
                    },
                    scope: this,
                }, {
                    text: 'Clear',
                    handler: function() {
                        this.execCellAction('clearCell', true);
                    },
                    scope: this,
                }, {
                    text: 'Wipe',
                    handler: function() {
                        this.execCellAction('wipeCell', true);
                    },
                    scope: this,
                }, '-', {
                    text: 'Evaluate',
                    handler: function() {
                        this.execCellAction('inplaceEvaluateCell', true);
                    },
                    scope: this,
                }, {
                    text: 'Interrupt',
                    handler: function() {
                        this.execCellAction('interruptCell', true);
                    },
                    scope: this,
                }],
            }, {
                text: 'Engine',
                menu: [{
                    text: 'Interrupt',
                    handler: function() {
                        this.getCellManager().interruptEngine();
                    },
                    scope: this,
                }, {
                    text: 'Restart',
                    handler: function() {
                        var manager = this.getCellManager();

                        manager.killEngine({
                            force: true,
                            handler: function() {
                                manager.initEngine();
                            },
                            scope: this,
                        });
                    },
                    scope: this,
                }],
            }, {
                text: 'View',
                menu: [{
                    text: 'Toolbar',
                    checked: true,
                    checkHandler: function(item, checked) {
                        this.toolbar.setVisible(checked);
                        this.doLayout();
                    },
                    scope: this,
                }, {
                    text: 'Status',
                    checked: true,
                    checkHandler: function(item, checked) {
                        this.statusbar.setVisible(checked);
                        this.doLayout();
                    },
                    scope: this,
                }],
            }, {
                text: 'Help',
                menu: [{
                    text: 'Key bindings',
                    handler: function() {
                        FEMhub.Bindings.showHelp(this);
                    },
                    scope: this,
                }],
            }],
        });
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
                    this.getCellManager().increaseFontSize();
                },
                scope: this,
            }, {
                cls: 'x-btn-icon',
                iconCls: 'femhub-decrease-font-size-icon',
                tooltip: "Decrease cells' font size.",
                tabIndex: -1,
                handler: function() {
                    this.getCellManager().decreaseFontSize();
                },
                scope: this,
            }, '-', {
                cls: 'x-btn-text-icon',
                text: 'Refresh',
                iconCls: 'femhub-refresh-icon',
                tooltip: 'Refresh the user interface.',
                tabIndex: -1,
                handler: function() {
                    this.getCellManager().justifyCells();
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
                    this.getCellManager().saveCells();
                },
                scope: this,
            }, {
                cls: 'x-btn-text',
                text: 'Save & Close',
                tooltip: 'Save changes and close this window.',
                tabIndex: -1,
                handler: function() {
                    this.getCellManager().saveCells(this.close, this);
                },
                scope: this,
            }, '-', {
                cls: 'x-btn-text-icon',
                text: 'Interrupt',
                iconCls: 'femhub-remove-icon',
                tooltip: 'Interrupt currently evaluating cell.',
                tabIndex: -1,
                handler: function() {
                    this.getCellManager().interruptEngine();
                },
                scope: this,
            }],
        });
    },

    setTitle: function(title, iconCls) {
        this.name = title;

        if (title) {
            title = 'Worksheet - ' + FEMhub.htmlEncode(title);
        } else {
            title = 'Worksheet';
        }

        FEMhub.Worksheet.superclass.setTitle.call(this, title, iconCls);
    },

    close: function() {
        var manager = this.getCellManager();

        function doClose() {
            manager.killEngine({
                handler: function() {
                    FEMhub.Worksheet.superclass.close.call(this);
                },
                scope: this,
            });
        }

        if (manager.isSaved()) {
            doClose.call(this);
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
                            doClose.call(this);
                            break;
                        case 'cancel':
                            break;
                        default:
                            break;
                    }
                },
                icon: Ext.MessageBox.QUESTION,
                scope: this,
            });
        }
    },

    importCells: function(source) {
        var cells = this.getCellManager();

        var TEXT = 0;
        var INPUT = 1;
        var OUTPUT = 2;

        var lines = source.split('\n');
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
            default:
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
                            var manager = this.getCellManager();
                            manager.evaluateCode(cell.content);
                        }, this);
                    }
                }

                if (++index == this.imports.length && evalCells) {
                    this.getCellManager().evaluateCells();
                }
            }, this);
        }, this);
    },

    evaluateCells: function() {
        if (this.imports.length) {
            this.evaluateImports(true);
        } else {
            this.getCellManager().evaluateCells();
        }
    },

    getBindings: function() {
        return FEMhub.Bindings.Worksheet;
    },

    execCellAction: function(action, active) {
        var manager = this.getCellManager(), cell;

        if (active) {
            cell = manager.getActiveCell();
        } else {
            cell = manager.getFocusedCell();
        }

        if (cell !== null) {
            if (action in this.actions) {
                this.actions[action].call(this, cell);
            } else if (action in cell) {
                cell[action]();
            }
        }
    },

    execAction: function(action, params, key, evt) {
        var method = 'action' + FEMhub.util.capitalizeFirst(action);

        if (Ext.isDefined(this[method])) {
            this[method].call(this, this.getCellManager(), params, evt);
        } else {
            this.execCellAction(action, params.active);
        }
    },

    actionActivateCell: function(manager, params, evt) {
        var cell = manager.getActiveCell();

        if (cell === null) {
            cell = manager.getFirstCell();

            if (cell === null) {
                return;
            }
        }

        cell.focusCell();
    },

    actionQuitCell: function(manager, params, evt) {
        var cell = manager.getFocusedCell();

        if (cell !== null && cell.blurCell) {
            cell.blurCell();
            window.focus();
        }
    },

    actionActivateNextCell: function(manager, params, evt) {
        var cell = manager.getActiveCell();

        if (cell !== null) {
            manager.activateNextCell(cell);
        }
    },

    actionActivatePrevCell: function(manager, params, evt) {
        var cell = manager.getActiveCell();

        if (cell !== null) {
            manager.activatePrevCell(cell);
        }
    },

    actionHandlePrev: function(manager, params, evt) {
        var cell = manager.getFocusedCell();

        if (cell !== null && cell.handlePrev) {
            cell.handlePrev(evt);
        }
    },

    actionHandleNext: function(manager, params, evt) {
        var cell = manager.getFocusedCell();

        if (cell !== null && cell.handleNext) {
            cell.handleNext(evt);
        }
    },

    actions: {
        forwardEvaluateCell: function(cell) {
            cell.evaluateCell({keepfocus: false});
        },
        inplaceEvaluateCell: function(cell) {
            cell.evaluateCell({keepfocus: true});
        },
    },
});

Ext.reg('x-femhub-worksheet', FEMhub.Worksheet);

FEMhub.Mappings.Worksheet = Ext.extend(FEMhub.Mapping, {
    bindings: {
        handlePrev: {
            specs: [
                'UP        -shift -ctrl -alt nostop',
            ],
            text: 'Move cursor to the previous line or cell',
        },
        handleNext: {
            specs: [
                'DOWN      -shift -ctrl -alt nostop',
            ],
            text: 'Move cursor to the following line or cell',
        },
        introspectCell: {
            specs: [
                'TAB       -shift -ctrl -alt',
                'T         -shift -ctrl +alt',
                'SPACE     -shift +ctrl -alt',
            ],
            text: 'Introspect contents of the active cell',
        },
        activateNextCell: {
            specs: [
                'DOWN      -shift +ctrl -alt',
                'J         -shift -ctrl +alt',
            ],
            text: 'Move focus to the following cell',
        },
        activatePrevCell: {
            specs: [
                'UP        -shift +ctrl -alt',
                'K         -shift -ctrl +alt',
            ],
            text: 'Move focus to the preceeding cell',
        },
        collapseCell: {
            specs: [
                'LEFT      -shift -ctrl +alt',
                'H         -shift -ctrl +alt',
            ],
            text: 'Collapse the active cell',
        },
        expandCell: {
            specs: [
                'RIGHT     -shift -ctrl +alt',
                'L         -shift -ctrl +alt',
            ],
            text: 'Expand the active cell',
        },
        newline: {
            specs: [
                'ENTER     -shift -ctrl -alt',
            ],
            text: 'Intelligently insert a newline',
        },
        backspace: {
            specs: [
                'BACKSPACE -shift -ctrl -alt',
            ],
            text: 'Intelligently remove the previous character',
        },
        forwardEvaluateCell: {
            specs: [
                'ENTER     +shift -ctrl -alt',
                'E         -shift -ctrl +alt',
            ],
            text: 'Evaluate the active cell and move focus to the following cell',
        },
        inplaceEvaluateCell: {
            specs: [
                'ENTER     -shift +ctrl -alt',
                'E         +shift -ctrl +alt',
            ],
            text: 'Evaluate the active cell and keep focus in-place',
        },
        interruptCell: {
            specs: [
                'I         -shift -ctrl +alt',
            ],
            text: 'Interrupt evaluation of the active cell',
        },
        wipeCell: {
            specs: [
                'W         -shift -ctrl +alt',
            ],
            text: 'Remove contents of the active cell keeping its related cells',
        },
        clearCell: {
            specs: [
                'C         -shift -ctrl +alt',
            ],
            text: 'Remove contents of the active cells and its related cells',
        },
        removeCell: {
            specs: [
                'R         -shift -ctrl +alt',
            ],
            text: 'Remove the active cell and all cells related with it',
        },
        splitCellUpper: {
            specs: [
                'S         +shift -ctrl +alt',
            ],
            text: 'Split the active cell and locate cursor in the upper part',
        },
        splitCellLower: {
            specs: [
                'S         -shift -ctrl +alt',
            ],
            text: 'Split the active cell and locate cursor in the lower part',
        },
        mergeCellAbove: {
            specs: [
                'UP        +shift -ctrl +alt',
                'K         +shift -ctrl +alt',
            ],
            text: 'Merge the active cell with the preceeding cell',
        },
        mergeCellBelow: {
            specs: [
                'DOWN      +shift -ctrl +alt',
                'J         +shift -ctrl +alt',
            ],
            text: 'Merge the active cell with the following cell',
        },
        activateCell: {
            specs: [
                'A         -shift -ctrl +alt',
            ],
            text: 'Focus the last active cell',
        },
        quitCell: {
            specs: [
                'Q         -shift -ctrl +alt',
            ],
            text: 'Deactive the currently active cell',
        },
        nextBracket: {
            specs: [
                ']         -shift -ctrl +alt',
            ],
            text: 'Move cursor to the next bracket in source code',
        },
        prevBracket: {
            specs: [
                '[         -shift -ctrl +alt',
            ],
            text: 'Move cursor to the previous bracket in source code',
        },
        preprocessCell: {
            specs: [
                'P         -shift -ctrl +alt',
            ],
            text: 'Fix indentation and cleanup the active cell',
        },
        previousInput: {
            specs: [
                '.         -shift -ctrl +alt',
            ],
            text: 'Copy previous input to the active cell',
        },
        insertInputCellBefore: {
            specs: [
                'UP        -shift -ctrl +alt',
            ],
            text: 'Insert an input cell before the active cell',
        },
        insertInputCellAfter: {
            specs: [
                'DOWN      -shift -ctrl +alt',
            ],
            text: 'Insert an input cell after the active cell',
        },
        insertTextCellBefore: {
            specs: [
                'UP        +shift +ctrl +alt',
            ],
            text: 'Insert a text cell before the active cell',
        },
        insertTextCellAfter: {
            specs: [
                'DOWN      +shift +ctrl +alt',
            ],
            text: 'Insert a text cell after the active cell',
        },
    },
});

