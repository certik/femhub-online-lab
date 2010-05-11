
FEMhub.Bookshelf = {}

FEMhub.Bookshelf.init = function() {
    var root = new Ext.tree.TreeNode({
        text: 'My Folders',
    });

    var folders = new Ext.tree.TreePanel({
        region: "west",
        width: 200,
        split: true,
        rootVisible: true,
        root: root,
    });

    var notebooks = new Ext.grid.GridPanel({
        border:false,
        ds: new Ext.data.Store({
            reader: new Ext.data.ArrayReader({}, [
                { name: 'title' },
                { name: 'engine' },
                { name: 'date', type: 'date' },
            ]),
            data: [],
        }),
        cm: new Ext.grid.ColumnModel([
            new Ext.grid.RowNumberer(),
            { header: "Title", width: 200, sortable: true, dataIndex: 'title'},
            { header: "Engine", width: 70, sortable: true, dataIndex: 'engine'},
            { header: "Date", width: 100, sortable: true, dataIndex: 'date'},
        ]),
        viewConfig: {
            forceFit: true,
        },
        region: "center",
    });

    var engines_menu = new Ext.menu.Menu();

    FEMhub.RPC.getEngines({}, function(engines) {
        Ext.each(engines, function(engine) {
            engines_menu.addMenuItem({
                engine: engine.id,
                text: engine.name,
                handler: function(item) {
                    FEMhub.Bookshelf.newNotebook(item.engine);
                },
            });
        });
    });

    var bookshelf = new Ext.Window({
        title: "FEMhub Bookshelf",
        layout: "border",
        width: 900,
        height: 700,
        maximizable: true,
        tbar: [
            {
                xtype: 'tbsplit',
                cls: 'x-btn-text-icon',
                icon: FEMhub.icons + 'page_go.png',
                text: 'New Notebook',
                handler: function() {
                    FEMhub.Bookshelf.newNotebook();
                },
                menu: engines_menu,
            },
        ],
        items: [folders, notebooks],
    });

    bookshelf.show();

    FEMhub.RPC.getFolders({}, function(folders) {
        Ext.each(folders, function(folder) {
            root.appendChild(new Ext.tree.TreeNode({
                id: folder.guid,
                text: folder.title,
            }));
        });

        root.expand();
    });
}

FEMhub.Notebook = Ext.extend(Ext.Window, {
    title: "FEMhub Notebook",
    maximizable: true,
    layout: 'fit',

    cells: null,

    constructor: function() {
        FEMhub.Notebook.superclass.constructor.apply(this, arguments);
    },

    initComponent: function() {
        this.tbar = new Ext.Toolbar({
            items: [
                {
                    icon: FEMhub.icons + 'page_go.png',
                    cls: 'x-btn-text-icon',
                    text: 'Share',
                }, '-', {
                    icon: FEMhub.icons + 'textfield_rename.png',
                    cls: 'x-btn-text-icon',
                    text: 'Rename',
                    handler: function() {

                    },
                    scope: this,
                }, {
                    icon: FEMhub.icons + 'page_save.png',
                    cls: 'x-btn-text-icon',
                    text: 'Save',
                    handler: function() {

                    },
                    scope: this,
                }, {
                    cls: 'x-btn-text',
                    text: 'Save & Close',
                    handler: function() {
                        /* pass */
                    },
                    scope: this,
                }, '-', {
                    icon: FEMhub.icons + 'cross.png',
                    cls: 'x-btn-text-icon',
                    text: 'Kill',
                    handler: function() {
                        this.cells.getCellsManager().killBackend();
                    },
                    scope: this,
                },
            ],
        });

        FEMhub.Notebook.superclass.initComponent.call(this);
    },

    onRender: function() {
        FEMhub.Notebook.superclass.onRender.apply(this, arguments);

        this.cells = new FEMhub.Cells({
            notebook: this.id,
        });

        this.add(this.cells);
    },
});

FEMhub.Bookshelf.newNotebook = function(engine) {
    FEMhub.RPC.newNotebook({ engine_id: engine }, function(data) {
        var notebook = new FEMhub.Notebook({
            id: data.id,
            width: 1000,
            height: 800,
        });

        notebook.show();
    });
}

