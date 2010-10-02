
FEMhub.NotebookChooser = Ext.extend(Ext.Window, {

    constructor: function(config) {
        config = config || {};

        this.addEvents(['notebookschosen']);

        if (Ext.isDefined(config.exclude)) {
            this.exclude = config.exclude;
        } else {
            this.exclude = false;
        }

        if (Ext.isDefined(config.checked)) {
            this.checked = config.checked;
        } else {
            this.checked = [];
        }

        this.initTree();

        Ext.applyIf(config, {
            title: 'Choose notebooks',
            width: 300,
            height: 400,
            layout: 'fit',
            minimizalble: false,
            maximizable: false,
            closable: true,
            resizable: true,
            items: this.tree,
            buttons: [{
                text: config.chooseText || 'Choose',
                handler: function() {
                    this.chooseNotebooks();
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

        FEMhub.NotebookChooser.superclass.constructor.call(this, config);
    },

    initTree: function() {
        this.tree = new Ext.tree.TreePanel({
            root: new Ext.tree.TreeNode(),
            rootVisible: false,
            containerScroll: true,
            autoScroll: true,
            useArrows: true,
            animate: true,
            border: false,
            listeners: {
                'checkchange': function(node, checked) {
                    if (checked) {
                        node.getUI().addClass('femhub-chosen');
                    } else {
                        node.getUI().removeClass('femhub-chosen');
                    }
                }
            },
        });

        this.fillTree();
    },

    fillTree: function() {
        function recFillTree(folders, notebooks, node) {
            Ext.each(folders, function(folder) {
                var subNode = node.appendChild(
                    new Ext.tree.TreeNode({
                        id: folder.uuid,
                        text: folder.name,
                        cls: 'femhub-folder',
                    })
                );

                recFillTree.call(this, folder.folders, folder.notebooks, subNode);
            }, this);

            Ext.each(notebooks, function(notebook) {
                if (!this.exclude || notebook.uuid != this.uuid) {
                    var checked = this.checked.indexOf(notebook.uuid) != -1;

                    if (checked) {
                        var cls = 'femhub-notebook femhub-chosen';
                    } else {
                        var cls = 'femhub-notebook';
                    }

                    var nbNode = new Ext.tree.TreeNode({
                        leaf: true,
                        checked: checked,
                        id: notebook.uuid,
                        text: notebook.name,
                        cls: cls,
                    });

                    node.appendChild(nbNode);
                }
            }, this);
        }

        var root = this.tree.getRootNode();

        FEMhub.RPC.Folder.getFolders({notebooks: true}, function(result) {
            if (result.ok === true) {
                recFillTree.call(this, result.folders, result.notebooks, root);
                root.expand(true);
            }
        }, this);
    },

    chooseNotebooks: function() {
        var nodes = this.tree.getChecked();
        var notebooks = [];

        for (var i = 0; i < nodes.length; i++) {
            notebooks.push({
                uuid: nodes[i].id,
                text: nodes[i].text,
            });
        }

        if (this.fireEvent('notebookschosen', notebooks) !== false) {
            this.close();
        }
    },
});

