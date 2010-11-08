
FEMhub.PublishedWorksheets = Ext.extend(FEMhub.Window, {
    grid: null,

    constructor: function(config, logged_in) {
        config = config || {};

        this.addEvents(['worksheetforked']);

        this.initGrid();
        this.fillGrid();

        var buttons = new Array();
        if (logged_in) {
            buttons.push({
                text: 'Fork',
                handler: function() {
                    var model = this.grid.getSelectionModel();

                    if (!model.hasSelection()) {
                        FEMhub.msg.warning(this, "Select a worksheet first and then click 'Fork'.");
                    } else {
                        var record = model.getSelected();
                        this.fireEvent('worksheetforked', record.data.uuid);
                        this.close();
                    }
                },
                scope: this,
            });
        }
        buttons.push({
                text: 'Cancel',
                handler: function() {
                    this.close();
                },
                scope: this,
            });

        Ext.apply(config, {
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
            buttons: buttons,
        });

        FEMhub.PublishedWorksheets.superclass.constructor.call(this, config);
    },

    initGrid: function() {
        this.grid = new Ext.grid.GridPanel({
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
        FEMhub.RPC.Core.getPublishedWorksheets({},
                function(result) {
            if (result.ok === true) {
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
            }
        }, this);
    },
});

Ext.reg('x-femhub-publishedworksheets', FEMhub.PublishedWorksheets);

