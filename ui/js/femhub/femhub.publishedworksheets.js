
FEMhub.PublishedWorksheets = Ext.extend(FEMhub.Window, {
    grid: null,

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

        FEMhub.PublishedWorksheets.superclass.constructor.call(this, config);
    },

    initGrid: function() {
        return new Ext.grid.GridPanel({
            ds: new Ext.data.GroupingStore({
                reader: new Ext.data.ArrayReader({}, [
                    { name: 'user' },
                    { name: 'uuid' },
                    { name: 'title' },
                    { name: 'engine' },
                    { name: 'created' },
                    { name: 'published' },
                ]),
                sortInfo: {
                    field: 'title',
                    direction: 'ASC',
                },
                groupField: 'user',
            }),
            cm: new Ext.grid.ColumnModel({
                columns: [
                    {header: "User", width: 100, sortable: true, dataIndex: 'user', hidden: true},
                    {header: "Title", width: 200, sortable: true, dataIndex: 'title'},
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
                    'user', 'uuid', 'title', 'engine', 'created', 'published'
                ]);

                Ext.each(result.users, function(user) {
                    Ext.each(user.worksheets, function(worksheet) {
                        store.add(new record({
                            user: user.username,
                            uuid: worksheet.uuid,
                            title: worksheet.name,
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

