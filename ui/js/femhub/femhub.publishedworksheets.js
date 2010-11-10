
FEMhub.PublishedWorksheets = Ext.extend(FEMhub.Window, {
    grid: null,

    defaultButtons: {
        view: {
            text: 'View',
            handler: function(row) {
                var worksheet = this.getWorksheet();

                if (worksheet === null) {
                    FEMhub.msg.warning(this, "Select a worksheet first and then click 'View'.");
                } else {
                    this.showWorksheetViewer({
                        uuid: worksheet.uuid,
                        name: worksheet.name,
                        user: worksheet.user,
                    });
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

    defaultMenuItems: {
        view: {
            text: 'View',
            handler: function(record) {
                this.showWorksheetViewer({
                    uuid: record.data.uuid,
                    name: record.data.name,
                    user: record.data.user,
                });
            },
        },
    },

    constructor: function(config) {
        config = config || {};

        this.grid = this.initGrid();

        this.statusbar = new FEMhub.Statusbar({
            defaultText: '',
            busyText: '',
        });

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
            buttons: ['view', 'close'],
            menuItems: ['view'],
            bbar: this.statusbar,
        }, config);

        if (!Ext.isDefined(config.x) && !Ext.isDefined(config.y)) {
            Ext.apply(config, FEMhub.util.getWindowXY({
                width: config.width,
                height: config.height,
            }));
        }

        this.configureButtons(config);
        this.configureMenuItems(config);

        FEMhub.PublishedWorksheets.superclass.constructor.call(this, config);
    },

    configureButtons: function(config) {
        Ext.each(config.buttons, function(button, i, buttons) {
            if (Ext.isString(button)) {
                var config = this.defaultButtons[button];

                if (Ext.isDefined(config)) {
                    buttons[i] = Ext.applyIf({scope: this}, config);
                }
            }
        }, this);
    },

    configureMenuItems: function(config) {
        Ext.each(config.menuItems, function(item, i, menuItems) {
            if (Ext.isString(item)) {
                var config = this.defaultMenuItems[item];

                if (Ext.isDefined(config)) {
                    menuItems[i] = Ext.applyIf({scope: this}, config);
                }
            }
        }, this);
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
            listeners: {
                rowdblclick: function(grid, row, evt) {
                    evt.stopEvent();

                    var record = grid.getStore().getAt(row);

                    this.showWorksheetViewer({
                        uuid: record.data.uuid,
                        name: record.data.name,
                        user: record.data.user,
                    });
                },
                rowcontextmenu: function(grid, row, evt) {
                    evt.stopEvent();

                    var record = grid.getStore().getAt(row);
                    var menu = new Ext.menu.Menu();

                    Ext.each(this.menuItems, function(item) {
                        var handler = item.handler.createDelegate(this, [record], 0);
                        menu.addMenuItem(Ext.applyIf({handler: handler}, item));
                    }, this);

                    menu.showAt(evt.getXY());
                },
                scope: this,
            },
        });
    },

    fillGrid: function() {
        var store = this.grid.getStore();
        store.removeAll();

        FEMhub.RPC.Core.getPublishedWorksheets({}, {
            okay: function(result) {
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
            status: {
                start: function() {
                    return this.statusbar.showBusy("Loading worksheet ...");
                },
                end: function(ok, id) {
                    this.statusbar.clearBusy(id);
                },
            },
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

    showWorksheetViewer: function(config) {
        var viewer = new FEMhub.WorksheetViewer({
            setup: Ext.apply({
                showInputControls: false,
            }, config),
        });

        viewer.show();
    },

    onShow: function() {
        this.fillGrid();
    },
});

Ext.reg('x-femhub-publishedworksheets', FEMhub.PublishedWorksheets);

