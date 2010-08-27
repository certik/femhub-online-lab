
FEMhub.CellManager = function(config) {
    config = config || {};

    if (Ext.isDefined(config.root)) {
        config.root = Ext.get(config.root);
    }

    return Ext.apply({
        nbid: null,      // config.nbid
        name: null,      // config.name

        evalIndex: 0,
        statusSaved: true,

        softEvalTimeout: null,
        hardEvalTimeout: null,
        showInputControls: true,
        moveForwardOnRemove: false,
        mergeOnBackspace: true,
        newCellOnEval: false,
        autoLoadOutputCells: true,
        cycleCells: true,
        startEmpty: true,
        autoJustify: true,
        wrapOutputText: true,
        tabWidth: 4,

        types: {
            'input': 'InputCell',
            'output': 'OutputCell',
            'image': 'ImageCell',
            'content': 'ContentCell',
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

        nextEvalIndex: function() {
            if (!this.autoJustify) {
                return ++this.evalIndex;
            } else {
                var prev = "" + this.evalIndex;
                this.evalIndex++;
                var curr = "" + this.evalIndex;

                if (prev.length != curr.length) {
                    this.justifyCells();
                }

                return this.evalIndex;
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

        justifyCells: function() {
            var len = ('In [' + this.evalIndex + ']: ').length;

            var cells = Ext.DomQuery.select(".femhub-cell-io", this.root.dom);

            Ext.each(cells, function(elt) {
                var cell = Ext.getCmp(elt.id);
                var label = cell.getLabel();

                for (var i = 0; i < len - label.length; i++) {
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
            return '/notebook/' + this.nbid + '/';
        },

        getAsyncURL: function() {
            return '/asyncnotebook/' + this.nbid + '/';
        },

        initBackend: function() {
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
                                if (this.autoLoadOutputCells) {
                                    data.cellstyle = 'output';
                                } else {
                                    return;
                                }
                            }

                            if (data.cellstyle == 'outputimage') {
                                if (this.autoLoadOutputCells) {
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

                    this.getFirstCell().focusCell();
                },
                failure: Ext.emptyFn,
                scope: this,
            });

            Ext.Ajax.request({
                url: this.getAsyncURL(),
                method: "POST",
                jsonData: Ext.encode({
                    method: 'start',
                }),
                success: Ext.emptyFn,
                failure: Ext.emptyFn,
                scope: this,
            });
        },

        killBackend: function() {
            Ext.Ajax.request({
                url: this.getAsyncURL(),
                method: "POST",
                jsonData: Ext.encode({
                    method: 'interrupt',
                }),
                success: Ext.emptyFn,
                failure: Ext.emptyFn,
                scope: this,
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
                guid: this.nbid,
                cellsdata: cellsdata,
                orderlist: Ext.encode(orderlist),
            }

            FEMhub.RPC.Notebooks.saveNotebook(params, function(result) {
                if (result.ok === true) {
                    Ext.each(savedlist, function(cell) {
                        cell.saved = true;
                    });

                    this.statusSaved = true;

                    if (FEMhub.hasArg(args, 'postsave')) {
                        args.postsave.call(args.scope);
                    }
                } else {
                    FEMhub.log("Failed to save cells for: " + this.nbid);
                }
            }, this);
        },
    }, config, {
        root: Ext.getBody(),
    });
}

