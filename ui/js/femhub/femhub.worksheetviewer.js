
FEMhub.WorksheetViewer = Ext.extend(FEMhub.Window, {
    cellPanel: null,

    constructor: function(config) {
        config = config || {};

        this.cellPanel = new FEMhub.CellPanel({
            managerConfig: config.setup,
            listeners: {
                cellmanagerready: function(panel, manager) {
                    manager.loadCells();
                },
                scope: this,
            },
        });

        var uuid = config.setup.uuid;
        var name = config.setup.name;
        var user = config.setup.user;

        config = Ext.apply({
            title: 'Preview of "' + name + '" by ' + user,
            iconCls: 'femhub-worksheet-icon',
            minimizalble: false,
            maximizable: false,
            closable: true,
            resizable: true,
            width: 700,
            height: 600,
            layout: 'fit',
            items: {
                title: '<a href="/worksheets/' + uuid + '/" target="_blank">Public URL</a>',
                layout: 'fit',
                items: this.cellPanel,
            },
            buttons: [{
                text: 'Close',
                handler: function() {
                    this.close();
                },
                scope: this,
            }],
        }, config);

        if (!Ext.isDefined(config.x) && !Ext.isDefined(config.y)) {
            Ext.apply(config, FEMhub.util.getWindowXY({
                width: config.width,
                height: config.height,
            }));
        }

        FEMhub.WorksheetViewer.superclass.constructor.call(this, config);
    },

    getCellManager: function() {
        return this.cellPanel.getCellManager();
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

    execAction: function(action, params, key, evt) {
        var method = 'action' + FEMhub.util.capitalizeFirst(action);
        this[method].call(this, this.getCellManager());
    },

    getBindings: function() {
        return FEMhub.Bindings.WorksheetViewer;
    },
});

Ext.reg('x-femhub-worksheetviewer', FEMhub.WorksheetViewer);

FEMhub.Mappings.WorksheetViewer = Ext.extend(FEMhub.Mapping, {
    bindings: {
        activateNextCell: {
            specs: [
                'J         -shift -ctrl +alt',
            ],
            text: 'Move focus to the following cell',
        },
        activatePrevCell: {
            specs: [
                'K         -shift -ctrl +alt',
            ],
            text: 'Move focus to the preceeding cell',
        },
    },
});

