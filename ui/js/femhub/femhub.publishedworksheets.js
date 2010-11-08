
FEMhub.PublishedWorksheets = Ext.extend(FEMhub.Window, {
    grid: null,

    defaultButtons: {
        view: {
            text: 'View',
            handler: function() {
                var worksheet = this.getWorksheet();

                if (worksheet === null) {
                    FEMhub.msg.warning(this, "Select a worksheet first and then click 'View'.");
                } else {
                    var viewer = new FEMhub.WorksheetViewer({
                        setup: {
                            uuid: worksheet.uuid,
                            name: worksheet.name,
                            user: worksheet.user,
                        },
                    });
                    viewer.show();
                }
            },
        },
        close: {
            text: 'Close',
            handler: function() {
                this.close();
            },
        },
    },

    constructor: function(config) {
        config = config || {};

        this.grid = this.initGrid();
        this.fillGrid();

        config = Ext.apply({
            title: "Published worksheets",
            iconCls: 'femhub-published-icon',
            minimizalble: false,
            maximizable: false,
            closable: true,
            resizable: true,
            width: 500,
            height: 400,
            layout: 'fit',
            items: this.grid,
        }, config);

        if (!Ext.isDefined(config.x) && !Ext.isDefined(config.y)) {
            Ext.apply(config, FEMhub.util.getWindowXY({
                width: config.width,
                height: config.height,
            }));
        }

        config.buttons = this.initButtons(config.buttons);

        FEMhub.PublishedWorksheets.superclass.constructor.call(this, config);
    },

    initButtons: function(buttons) {
        var result = [];

        if (!Ext.isDefined(buttons)) {
            buttons = ['view', 'close'];
        }

        Ext.each(buttons, function(button) {
            if (Ext.isString(button)) {
                var config = this.defaultButtons[button];

                if (Ext.isDefined(config)) {
                    button = Ext.applyIf({scope: this}, config);
                }
            }

            result.push(button);
        }, this);

        return result;
    },

    initGrid: function() {
        return new Ext.grid.GridPanel({
            ds: new Ext.data.GroupingStore({
                reader: new Ext.data.ArrayReader({}, [
                    { name: 'user' },
                    { name: 'uuid' },
                    { name: 'name' },
                    { name: 'engine' },
                    { name: 'created' },
                    { name: 'published' },
                ]),
                sortInfo: {
                    field: 'name',
                    direction: 'ASC',
                },
                groupField: 'user',
            }),
            cm: new Ext.grid.ColumnModel({
                columns: [
                    {header: "User", width: 100, sortable: true, dataIndex: 'user', hidden: true},
                    {header: "Title", width: 200, sortable: true, dataIndex: 'name'},
                    {header: "Engine", width: 70, sortable: true, dataIndex: 'engine'},
                    {header: "Published", width: 100, sortable: true, dataIndex: 'published'},
                ],
                defaults: {
                    menuDisabled: true,
                },
            }),
            sm: new Ext.grid.RowSelectionModel({singleSelect: true}),
            view: new Ext.grid.GroupingView({
                groupTextTpl: '{text} ({[values.rs.length]} {[values.rs.length > 1 ? "worksheets" : "worksheet"]})',
                forceFit:true,
            }),
            border: false,
        });
    },

    fillGrid: function() {
        FEMhub.RPC.Core.getPublishedWorksheets({}, {
            okay: function(result) {
                var store = this.grid.getStore();
                store.removeAll();

                var record = Ext.data.Record.create([
                    'user', 'uuid', 'name', 'engine', 'created', 'published'
                ]);

                Ext.each(result.users, function(user) {
                    Ext.each(user.worksheets, function(worksheet) {
                        store.add(new record({
                            user: user.username,
                            uuid: worksheet.uuid,
                            name: worksheet.name,
                            engine: worksheet.engine.name,
                            created: worksheet.created,
                            published: worksheet.published,
                        }, worksheet.uuid));
                    }, this);
                }, this);
            },
            scope: this,
        });
    },

    getWorksheet: function() {
        var model = this.grid.getSelectionModel();

        if (!model.hasSelection()) {
            return null;
        } else {
            return model.getSelected().data;
        }
    },
});

Ext.reg('x-femhub-publishedworksheets', FEMhub.PublishedWorksheets);

