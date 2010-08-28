
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

    recFillTree: function(node) {
        FEMhub.RPC.Folders.getFolders({guid: node.id}, function(folders) {
            Ext.each(folders, function(folder) {
                var subNode = new Ext.tree.TreeNode({
                    id: folder.guid,
                    text: folder.title,
                    cls: 'femhub-folder',
                });

                node.appendChild(subNode);
                this.recFillTree(subNode);
            }, this);

            FEMhub.RPC.Notebooks.getNotebooks({guid: node.id}, function(result) {
                Ext.each(result.notebooks, function(notebook) {
                    if (!this.exclude || notebook.guid != this.guid) {
                        var checked = this.checked.indexOf(notebook.guid) != -1;

                        if (checked) {
                            var cls = 'femhub-notebook femhub-chosen';
                        } else {
                            var cls = 'femhub-notebook';
                        }

                        var nbNode = new Ext.tree.TreeNode({
                            leaf: true,
                            checked: checked,
                            id: notebook.guid,
                            text: notebook.title,
                            cls: cls,
                        });

                        node.appendChild(nbNode);
                    }
                }, this);
            }, this);

            node.expand();
        }, this);
    },

    fillTree: function() {
        FEMhub.RPC.Folders.getRoot({}, function(folder) {
            this.root = new Ext.tree.TreeNode({
                id: folder.guid,
                text: folder.title,
                cls: 'femhub-folder',
            });

            var root = this.tree.getRootNode();
            root.appendChild(this.root);

            var model = this.tree.getSelectionModel();
            model.select(this.root);

            this.recFillTree(this.root);
        }, this);
    },

    chooseNotebooks: function() {
        var nodes = this.tree.getChecked();
        var notebooks = [];

        for (var i = 0; i < nodes.length; i++) {
            notebooks.push({
                guid: nodes[i].id,
                text: nodes[i].text,
            });
        }

        if (this.fireEvent('notebookschosen', notebooks) !== false) {
            this.close();
        }
    },
});

