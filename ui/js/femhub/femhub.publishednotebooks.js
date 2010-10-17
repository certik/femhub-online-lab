
FEMhub.PublishedNotebooks = Ext.extend(Ext.Window, {
    grid: null,

    constructor: function(config) {
        config = config || {};

        this.addEvents(['notebookforked']);

        this.initGrid();
        this.fillGrid();

        Ext.apply(config, {
            title: "Published notebooks",
            iconCls: 'femhub-published-icon',
            minimizalble: false,
            maximizable: false,
            closable: true,
            resizable: true,
            width: 500,
            height: 400,
            layout: 'fit',
            items: this.grid,
            buttons: [{
                text: 'Fork',
                handler: function() {
                    var model = this.grid.getSelectionModel();

                    if (!model.hasSelection()) {
                        FEMhub.msg.warning(this, "Select a notebook first and then click 'Fork'.");
                    } else {
                        var record = model.getSelected();
                        this.fireEvent('notebookforked', record.data.uuid);
                        this.close();
                    }
                },
                scope: this,
            }, {
                text: 'Cancel',
                handler: function() {
                    this.close();
                },
                scope: this,
            }],
        });

        FEMhub.PublishedNotebooks.superclass.constructor.call(this, config);
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
                groupTextTpl: '{text} ({[values.rs.length]} {[values.rs.length > 1 ? "notebooks" : "notebook"]})',
                forceFit:true,
            }),
            border: false,
        });
    },

    fillGrid: function() {
        FEMhub.RPC.Core.getUsers({notebooks: true}, function(result) {
            if (result.ok === true) {
                var store = this.grid.getStore();
                store.removeAll();

                var record = Ext.data.Record.create([
                    'user', 'uuid', 'title', 'engine', 'created', 'published'
                ]);

                Ext.each(result.users, function(user) {
                    Ext.each(user.notebooks, function(notebook) {
                        store.add(new record({
                            user: user.username,
                            uuid: notebook.uuid,
                            title: notebook.name,
                            engine: notebook.engine.name,
                            created: notebook.created,
                            published: notebook.published,
                        }, notebook.uuid));
                    }, this);
                }, this);
            }
        }, this);
    },
});

Ext.reg('x-femhub-publishednotebooks', FEMhub.PublishedNotebooks);

