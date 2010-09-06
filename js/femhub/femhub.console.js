
FEMhub.Console = Ext.extend(Ext.Window, {
    constructor: function(config) {
        config = config || {};

        this.initConsoleGrid();
        this.fillConsoleGrid();

        Ext.apply(config, {
            title: 'Console',
            iconCls: 'femhub-console-icon',
            layout: 'fit',
            items: this.consoleGrid,
        });

        FEMhub.Console.superclass.constructor.call(this, config);
    },

    initConsoleGrid: function() {
        this.consoleGrid = new Ext.grid.GridPanel({
            border: false,
            autoExpandColumn: 1,
            ds: new Ext.data.Store({
                reader: new Ext.data.ArrayReader({}, [
                    { name: 'text' },
                    { name: 'when', type: 'date' },
                ]),
            }),
            cm: new Ext.grid.ColumnModel([
                new Ext.grid.RowNumberer(),
                { header: "Message", sortable: false, dataIndex: 'text'},
                { header: "Date", width: 200, sortable: true, dataIndex: 'when'},
            ]),
        });

        var contextMenu = new Ext.menu.Menu({
            items: [{
                cls: 'x-btn-text',
                text: 'Refresh',
                handler: function() {
                    this.clearConsoleGrid();
                    this.fillConsoleGrid();
                },
                scope: this,
            }, {
                cls: 'x-btn-text',
                text: 'Clear',
                handler: function() {
                    this.clearConsoleGrid();
                    FEMhub.clearLogs();
                },
                scope: this,
            }],
        });

        this.consoleGrid.on('contextmenu', function(evt) {
            contextMenu.showAt(evt.getXY());
            evt.stopEvent();
        });
    },

    fillConsoleGrid: function() {
        var rec = Ext.data.Record.create(['text', 'when']);
        var store = this.consoleGrid.getStore();
        var index = 0;

        Ext.each(FEMhub.logs, function(log) {
            store.add(new rec({text: log[0], when: log[1]}, index++));
        });
    },

    clearConsoleGrid: function() {
        this.consoleGrid.getStore().removeAll();
    },
});

FEMhub.Modules.Console = Ext.extend(FEMhub.Module, {
    launcher: {
        text: 'Console',
        icon: 'femhub-console-launcher-icon',
    },
    winCls: FEMhub.Console,
});

