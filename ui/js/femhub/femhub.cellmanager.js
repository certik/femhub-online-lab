
FEMhub.CellManager = Ext.extend(Ext.util.Observable, {
    isInitialized: false,
    statusSaved: true,
    evalIndex: 1,
    activeCell: null,

    types: {
        text: 'TextCell',
        rst: 'RSTCell',
        input: 'InputCell',
        output: 'OutputCell',
        image: 'ImageCell',
        error: 'ErrorCell',
        raw: 'RAWCell',
    },

    constructor: function(config) {
        config = config || {};

        if (Ext.isDefined(config.root)) {
            if (config.root !== null) {
                config.root = Ext.get(config.root);
            }
        } else {
            config.root = Ext.getBody();
        }

        Ext.apply(this, config, {
            softEvalTimeout: null,
            hardEvalTimeout: null,
            showInputControls: true,
            moveForwardOnRemove: false,
            mergeOnBackspace: true,
            newCellOnEval: false,
            loadOutputCells: true,
            cycleCells: true,
            startEmpty: true,
            autoJustify: true,
            wrapOutputText: true,
            tabWidth: 4,
            fontSize: 100,
        });

        this.addEvents([
            'loadstart', 'loadend',
            'savestart', 'saveend',
            'initstart', 'initend',
            'killstart', 'killend',
            'statstart', 'statend',
            'completestart', 'completeend',
            'evaluatestart', 'evaluateend',
            'interruptstart', 'interruptend',
        ]);

        this.listeners = config.listeners;

        FEMhub.CellManager.superclass.constructor.call(this, config);
    },

    getUUID: function() {
        return this.uuid;
    },

    getRoot: function() {
        return this.root;
    },

    setRoot: function(root) {
        if (Ext.isDefined(root)) {
            this.root = Ext.get(root);
        } else {
            this.root = Ext.getBody();
        }
    },

    newCell: function(config) {
        config = config || {};

        var ctype;

        if (!Ext.isDefined(config.type)) {
            ctype = this.types.input;
        } else {
            ctype = this.types[config.type];
        }

        var cell = new FEMhub[ctype](Ext.apply({
            owner: this,
            initFontSize: this.fontSize,
        }, config.setup));

        this.statusSaved = false;

        if (config.render !== false) {
            var id;

            if (Ext.isDefined(config.position)) {
                id = config.position;
            } else if (Ext.isDefined(config.before)) {
                id = config.before.id;
            } else if (Ext.isDefined(config.after)) {
                var next = config.after.getNextCell();

                if (next === null) {
                    id = undefined;
                } else {
                    id = next.id;
                }
            } else {
                id = undefined;
            }

            cell.render(this.root, id);

            // TODO: fix visibility issue
        }

        return cell;
    },

    setEvalIndex: function(evalIndex) {
        if (!this.autoJustify) {
            this.evalIndex = evalIndex;
        } else {
            var prev = "" + this.evalIndex;
            var curr = "" + evalIndex;

            this.evalIndex = evalIndex;

            if (prev.length != curr.length) {
                this.justifyCells();
            }
        }
    },

    typeToCls: function(type, dot) {
        var cls;

        if (!Ext.isDefined(type)) {
            cls = 'femhub-cell';
        } else {
            cls = 'femhub-cell-' + type;
        }

        if (dot === false) {
            return cls;
        } else {
            return '.' + cls;
        }
    },

    getFirstCell: function(type) {
        return Ext.getCmp(Ext.DomQuery.selectNode(this.typeToCls(type) + ":first", this.root.dom).id);
    },

    getLastCell: function(type) {
        return Ext.getCmp(Ext.DomQuery.selectNode(this.typeToCls(type) + ":last", this.root.dom).id);
    },

    getNextCell: function(cell, type) {
        var id;

        if (Ext.isObject(cell)) {
            id = cell.id;
        } else {
            id = cell;
        }

        var query = "div[id=" + id + "] ~ " + this.typeToCls(type) + ":first";
        var elt = Ext.DomQuery.selectNode(query, this.root.dom);

        if (Ext.isDefined(elt)) {
            return Ext.getCmp(elt.id);
        } else {
            return null;
        }
    },

    getPrevCell: function(cell, type) {
        var id;

        if (Ext.isObject(cell)) {
            id = cell.id;
        } else {
            id = cell;
        }

        var cls = this.typeToCls(type, false);

        while (1) {
            var query = ".femhub-cell:next(div[id=" + id + "])";
            var elt = Ext.DomQuery.selectNode(query, this.root.dom);

            if (Ext.isDefined(elt)) {
                if (Ext.get(elt).hasClass(cls)) {
                    return Ext.getCmp(elt.id);
                } else {
                    id = elt.id;
                }
            } else {
                return null;
            }
        }
    },

    getRawCells: function(type) {
        return Ext.DomQuery.select(this.typeToCls(type), this.root.dom);
    },

    getCells: function(type) {
        var cells = this.getRawCells(type);

        for (var i = 0; i < cells.length; i++) {
            cells[i] = Ext.getCmp(cells[i].id);
        }

        return cells;
    },

    iterCells: function(type, handler, scope) {
        var cells = this.getCells(type);

        for (var i = 0; i < cells.length; i++) {
            handler.call(scope || this, cells[i], i, cells);
        }
    },

    each: function(handler, scope) {
        return this.iterCells(undefined, handler, scope);
    },

    justifyCells: function() {
        var len = ('In [' + this.evalIndex + ']: ').length;

        var cells = Ext.DomQuery.select(".femhub-cell-io", this.root.dom);

        Ext.each(cells, function(elt) {
            var cell = Ext.getCmp(elt.id);

            var label = cell.getLabel();
            var labelLen = label.length;

            for (var i = 0; i < len - labelLen; i++) {
                label += ' ';
            }

            cell.setLabel(label);
            cell.autosize();
        }, this);
    },

    evaluateCells: function() {
        function evaluateCell(cell) {
            cell.evaluateCell({
                keepfocus: true,
                handler: function(ok) {
                    if (ok === true) {
                        var next = this.getNextCell(cell, 'input');

                        if (next !== null) {
                            evaluateCell.call(this, next);
                        }
                    }
                },
                scope: this,
            });
        }

        var first = this.getFirstCell();
        evaluateCell.call(this, first);
    },

    initEngine: function() {
        FEMhub.RPC.Engine.init({uuid: this.uuid}, {
            okay: function(result) {
                this.isInitialized = true;
            },
            fail: function(reason, result) {
                this.showEngineError(reason);
            },
            scope: this,
            status: {
                start: function() {
                    return this.fireEvent('initstart', this);
                },
                end: function(ok, ret) {
                    this.fireEvent('initend', this, ok, ret);
                },
            },
        });
    },

    killEngine: function() {
        FEMhub.RPC.Engine.kill({uuid: this.uuid}, {
            okay: function(result) {
                this.isInitialized = false;
            },
            fail: function(reason, result) {
                this.showEngineError(reason);
            },
            scope: this,
            status: {
                start: function() {
                    return this.fireEvent('killstart', this);
                },
                end: function(ok, ret) {
                    this.fireEvent('killend', this, ok, ret);
                },
            },
        });
    },

    interruptEngine: function(cellid) {
        FEMhub.RPC.Engine.interrupt({uuid: this.uuid, cellid: cellid}, {
            fail: function(reason, result) {
                this.showEngineError(reason);
            },
            scope: this,
            status: {
                start: function() {
                    return this.fireEvent('interruptstart', this);
                },
                end: function(ok, ret) {
                    this.fireEvent('interruptend', this, ok, ret);
                },
            },
        });
    },

    showEngineError: function(error) {
        var msg;

        switch (error) {
        case 'no-services-available':
            msg = "No suitable services are currently available.";
            break;
        case 'service-disconnected':
            msg = "Service disconnected or not assigned yet.";
            break;
        case 'engine-starting':
            msg = "Engine wasn't initialized yet.";
            break;
        case 'engine-timeout':
            msg = "Engine was starting too long.";
            break;
        case 'engine-not-running':
            msg = "Engine failed to initilize.";
            break;
        case 'engine-running':
            msg = "Engine is already running.";
            break;
        default:
            msg = Ext.util.Format.htmlEncode(error);
        }

        FEMhub.msg.error("Engine error", msg);
    },

    loadCells: function() {
        FEMhub.RPC.Worksheet.load({uuid: this.uuid}, {
            okay: function(result) {
                if (result.cells.length === 0) {
                    if (this.startEmpty !== false) {
                        this.newCell({
                            type: 'input',
                            setup: {
                                start: true,
                            },
                        });
                    }
                } else {
                    Ext.each(result.cells, function(data) {
                        var cell = this.newCell({
                            type: data.type,
                            setup: {
                                id: data.uuid,
                                saved: true,
                            },
                        });

                        cell.setText(data.content);
                    }, this);

                    this.statusSaved = true;
                }
            },
            fail: function(reason, result) {
                // TODO
            },
            scope: this,
            status: {
                start: function() {
                    return this.fireEvent('loadstart', this);
                },
                end: function(ok, ret) {
                    this.fireEvent('loadend', this, ok, ret);
                },
            },
        });
    },

    saveCells: function(handler, scope) {
        var cells = [], data = [];

        this.each(function(cell) {
            cells.push(cell);

            data.push({
                uuid: cell.id,
                content: cell.getText(),
                type: cell.ctype,
            });
        }, this);

        var params = {uuid: this.uuid, cells: data};

        FEMhub.RPC.Worksheet.save(params, {
            okay: function(result) {
                Ext.each(cells, function(cell) {
                    cell.saved = true;
                });

                this.statusSaved = true;

                if (Ext.isDefined(handler)) {
                    handler.call(scope || this);
                }
            },
            fail: function(reason, result) {
                // TODO
            },
            scope: this,
            status: {
                start: function() {
                    return this.fireEvent('savestart', this);
                },
                end: function(ok, ret) {
                    this.fireEvent('saveend', this, ok, ret);
                },
            },
        });
    },

    isSaved: function() {
        var cells = this.getRawCells();

        for (var i = 0; i < cells.length; i++) {
            if (!Ext.getCmp(cells[i].id).saved) {
                return false;
            }
        }

        return this.statusSaved;
    },

    evaluateCode: function(obj) {
        if (Ext.isString(obj)) {
            var source = obj;

            FEMhub.RPC.Engine.evaluate({
                uuid: this.uuid,
                source: source,
            });
        } else {
            FEMhub.RPC.Engine.evaluate({
                uuid: this.uuid,
                source: obj.source,
                cellid: obj.cellid,
            }, {
                okay: obj.okay,
                fail: obj.fail,
                scope: obj.scope,
                status: {
                    start: function() {
                        return this.fireEvent('evaluatestart', this);
                    },
                    end: function(ok, ret) {
                        this.fireEvent('evaluateend', this, ok, ret);
                    },
                    scope: this,
                },
            });
        }
    },

    completeCode: function(obj) {
        FEMhub.RPC.Engine.complete({
            uuid: this.uuid,
            source: obj.source,
        }, {
            okay: obj.okay,
            fail: obj.fail,
            scope: obj.scope,
            status: {
                start: function() {
                    return this.fireEvent('completestart', this);
                },
                end: function(ok, ret) {
                    this.fireEvent('completeend', this, ok, ret);
                },
                scope: this,
            },
        });
    },

    destroy: function() {
        this.killEngine();

        this.each(function(cell) {
            cell.destroy();
        });
    },

    increaseFontSize: function() {
        if (this.fontSize >= 300) {
            this.fontSize = 300;
        } else {
            this.fontSize += 20;
        }

        this.each(function(cell) {
            cell.setFontSize(this.fontSize);
        }, this);

        this.justifyCells();
    },

    decreaseFontSize: function() {
        if (this.fontSize <= 40) {
            this.fontSize = 40;
        } else {
            this.fontSize -= 20;
        }

        this.each(function(cell) {
            cell.setFontSize(this.fontSize);
        }, this);

        this.justifyCells();
    },

    getFocusedCell: function() {
        var cell = this.activeCell;

        if (cell !== null && cell.hasFocus()) {
            return this.activeCell;
        } else {
            return null;
        }
    },

    getActiveCell: function() {
        return this.activeCell;
    },

    activateNextCell: function(cell, ctype) {
        var next = this.getNextCell(cell, ctype);

        if (next === null) {
            if (this.cycleCells) {
                next = this.getFirstCell(ctype);
            } else {
                return null;
            }
        }

        cell.blurCell();
        next.focusCell();

        return next;
    },

    activatePrevCell: function(cell, ctype) {
        var prev = this.getPrevCell(cell, ctype);

        if (prev === null) {
            if (this.cycleCells) {
                prev = this.getLastCell(ctype);
            } else {
                return null;
            }
        }

        cell.blurCell();
        prev.focusCell();

        return prev;
    },

    setModified: function() {
        this.statusSaved = false;
        this.fireEvent('modified', this);
    },

    setSaved: function() {
        this.statusSaved = true;
        this.fireEvent('saved', this);
    },

    removeOutputCells: function() {
        this.setModified();

        this.each(function(cell) {
            if (cell instanceof FEMhub.OutputCell) {
                cell.destroy();
            }
        });
    },
});

