
FEMhub.Bookshelf = {}

FEMhub.Bookshelf.init = function() {
    var notebooks = new Ext.grid.GridPanel({
        border:false,
        ds: new Ext.data.Store({
            reader: new Ext.data.ArrayReader({}, [
                { name: 'title' },
                { name: 'engine' },
                { name: 'date', type: 'date' },
            ]),
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

    notebooks.on('cellclick', function(grid, row, col) {
        var record = grid.getStore().getAt(row);
        FEMhub.Bookshelf.openNotebook(record.id, record.data.title);
    }, this);

    var root = new Ext.tree.TreeNode({
        id: 'root-' + FEMhub.unique(),
        text: 'My Folders',
    });

    var folders = new Ext.tree.TreePanel({
        region: "west",
        width: 200,
        split: true,
        rootVisible: true,
        root: root,
    });

    folders.on('click', function(node) {
        if (/^root-/.test(node.id)) {
            var id = 'root';
        } else {
            var id = node.id;
        }

        Ext.Ajax.request({
            url: '/bookshelf/load?location=' + id + '&order=title&sort=asc',
            method: "GET",
            success: function(result, request) {
                var result = Ext.decode(result.responseText);
                notebooks.getStore().removeAll();

                Ext.each(result, function(notebook) {
                    var rec = Ext.data.Record.create(['title', 'engine', 'date']);

                    notebooks.getStore().add(new rec({
                        title: notebook[1],
                        engine: notebook[2],
                        date: notebook[3],
                    }, notebook[0]));
                }, this);
            },
            failure: Ext.emptyFn,
            scope: this,
        });
    }, this);

    var engines_menu = new Ext.menu.Menu();
    var default_engine = null;

    FEMhub.RPC.getEngines({}, function(engines) {
        default_engine = engines[0].id;

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
        width: 700,
        height: 500,
        maximizable: true,
        onEsc: Ext.emptyFn,
        tbar: [
            {
                xtype: 'tbsplit',
                cls: 'x-btn-text-icon',
                icon: FEMhub.icons + 'page_go.png',
                text: 'New Notebook',
                handler: function() {
                    FEMhub.Bookshelf.newNotebook(default_engine);
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
        FEMhub.Bookshelf.openNotebook(data.id);
    });
}

FEMhub.Bookshelf.openNotebook = function(id, title) {
    var baseTitle = "FEMhub Notebook";

    if (Ext.isDefined(title)) {
        baseTitle += ' - ' + title;
    }

    var notebook = new FEMhub.Notebook({
        id: id,
        title: baseTitle,
        width: 600,
        height: 400,
    });

    notebook.show();
}

