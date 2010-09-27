
FEMhub.CellManager = function(config) {
    config = config || {};

    if (Ext.isDefined(config.root)) {
        config.root = Ext.get(config.root);
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
}

Ext.extend(FEMhub.CellManager, Ext.util.Observable, {
    isInitialized: false,
    statusSaved: true,
    evalIndex: 1,

    types: {
        'input': 'InputCell',
        'output': 'OutputCell',
        'text': 'OutputCell',
        'error': 'ErrorCell',
        'image': 'ImageCell',
        'content': 'ContentCell',
    },

    getGUID: function() {
        return this.guid;
    },

    newCell: function(config) {
        config = config || {};

        if (!Ext.isDefined(config.type)) {
            var ctype = this.types.input;
        } else {
            var ctype = this.types[config.type];
        }

        var cell = new FEMhub[ctype](Ext.apply({
            owner: this,
            initFontSize: this.fontSize,
        }, config.setup));

        this.statusSaved = false;

        if (config.render !== false) {
            if (Ext.isDefined(config.position)) {
                var id = config.position;
            } else if (Ext.isDefined(config.before)) {
                var id = config.before.id;
            } else if (Ext.isDefined(config.after)) {
                var next = config.after.getNextCell();

                if (next === null) {
                    var id = undefined;
                } else {
                    var id = next.id;
                }
            } else {
                var id = undefined;
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
        if (!Ext.isDefined(type)) {
            var cls = 'femhub-cell';
        } else {
            var cls = 'femhub-cell-' + type;
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

    getNextCell: function(id, type) {
        var query = "div[id=" + id + "] ~ " + this.typeToCls(type) + ":first";
        var elt = Ext.DomQuery.selectNode(query, this.root.dom);

        if (Ext.isDefined(elt)) {
            return Ext.getCmp(elt.id);
        } else {
            return null;
        }
    },

    getPrevCell: function(id, type) {
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
            handler.call(scope || this, cells[i]);
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
        this.iterCells('input', function(cell) {
            cell.evaluateCell({ keepfocus: true });
        }, this);
    },

    getDataURL: function() {
        return '/notebook/' + this.guid + '/';
    },

    initBackend: function() {
        if (!this.isInitialized) {
            FEMhub.RPC.Engine.init({ uuid: this.guid }, function() {
                this.isInitialized = true;
            }, this);
        }

        Ext.Ajax.request({
            url: this.getDataURL() + 'nbobject',
            method: "GET",
            success: function(result, request) {
                var result = Ext.decode(result.responseText);

                if (result.orderlist == 'orderlist') {
                    if (this.startEmpty !== false) {
                        this.newCell({
                            type: 'input',
                            setup: {
                                start: true,
                            },
                        });
                    }
                } else {
                    Ext.each(Ext.decode(result.orderlist), function(id) {
                        var data = result.cells[id];

                        if (data.cellstyle == 'outputtext') {
                            if (this.loadOutputCells) {
                                data.cellstyle = 'output';
                            } else {
                                return;
                            }
                        }

                        if (data.cellstyle == 'outputimage') {
                            if (this.loadOutputCells) {
                                data.cellstyle = 'image';
                            } else {
                                return;
                            }
                        }

                        if (data.cellstyle == 'text') {
                            data.cellstyle = 'content';
                        }

                        var cell = this.newCell({
                            type: data.cellstyle,
                            setup: {
                                id: id,
                                saved: true,
                            },
                        });

                        cell.setText(data.content);
                    }, this);

                    this.statusSaved = true;
                }
            },
            failure: Ext.emptyFn,
            scope: this,
        });
    },

    interruptEngine: function() {
        FEMhub.RPC.Engine.interrupt({ uuid: this.guid });
    },

    killEngine: function() {
        if (this.isInitialized) {
            FEMhub.RPC.Engine.kill({ uuid: this.guid }, function() {
                this.isInitialized = false;
            }, this);
        };
    },

    destroy: function() {
        this.killEngine();

        this.each(function(cell) {
            cell.destroy();
        });
    },

    isSavedToBackend: function() {
        var cells = this.getRawCells();

        for (var i = 0; i < cells.length; i++) {
            if (!Ext.getCmp(cells[i].id).saved) {
                return false;
            }
        }

        return this.statusSaved;
    },

    saveToBackend: function(args) {
        var cells = this.getRawCells();

        var orderlist = [];
        var cellsdata = {};
        var savedlist = [];

        for (var i = 0; i < cells.length; i++) {
            var cell = Ext.getCmp(cells[i].id);

            orderlist.push(cell.id);

            if (!cell.saved) {
                var cellstyle;

                switch (cell.ctype) {
                    case 'input':
                        cellstyle = 'input';
                        break;
                    case 'output':
                    case 'error':
                    case 'text':
                        cellstyle = 'outputtext';
                        break;
                    case 'image':
                        cellstyle = 'outputimage';
                        break;
                    case 'content':
                        cellstyle = 'text'
                        break;
                }

                var content = cell.getText();

                var props = Ext.encode({
                    cellstyle: cellstyle,
                    cellevel: 0,
                    open: true,
                });

                cellsdata[cell.id] = {
                    cellstyle: cellstyle,
                    content: content,
                    props: props,
                };

                savedlist.push(cell);
            }
        }

        var params = {
            guid: this.guid,
            cellsdata: cellsdata,
            orderlist: Ext.encode(orderlist),
        }

        FEMhub.RPC.Notebooks.saveNotebook(params, function(result) {
            if (result.ok === true) {
                Ext.each(savedlist, function(cell) {
                    cell.saved = true;
                });

                this.statusSaved = true;

                if (FEMhub.util.hasArg(args, 'postsave')) {
                    args.postsave.call(args.scope);
                }
            } else {
                FEMhub.log("Failed to save cells for: " + this.guid);
            }
        }, this);
    },

    evaluateCode: function(source) {
        FEMhub.RPC.Engine.evaluate({
            uuid: this.guid,
            source: source,
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
});

