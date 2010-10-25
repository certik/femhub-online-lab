
FEMhub.WorksheetChooser = Ext.extend(FEMhub.Window, {

    constructor: function(config) {
        config = config || {};

        this.addEvents(['worksheetschosen']);

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
            title: 'Choose worksheets',
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
                    this.chooseWorksheets();
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

        FEMhub.WorksheetChooser.superclass.constructor.call(this, config);
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
                checkchange: function(node, checked) {
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
        function recFillTree(folders, worksheets, node) {
            Ext.each(folders, function(folder) {
                var subNode = node.appendChild(
                    new Ext.tree.TreeNode({
                        id: folder.uuid,
                        text: folder.name,
                        cls: 'femhub-folder',
                    })
                );

                recFillTree.call(this, folder.folders, folder.worksheets, subNode);
            }, this);

            Ext.each(worksheets, function(worksheet) {
                if (!this.exclude || worksheet.uuid != this.uuid) {
                    var cls, checked = this.checked.indexOf(worksheet.uuid) != -1;

                    if (checked) {
                        cls = 'femhub-worksheet femhub-chosen';
                    } else {
                        cls = 'femhub-worksheet';
                    }

                    var nbNode = new Ext.tree.TreeNode({
                        leaf: true,
                        checked: checked,
                        id: worksheet.uuid,
                        text: worksheet.name,
                        cls: cls,
                    });

                    node.appendChild(nbNode);
                }
            }, this);
        }

        var root = this.tree.getRootNode();

        FEMhub.RPC.Folder.getFolders({worksheets: true}, function(result) {
            if (result.ok === true) {
                recFillTree.call(this, result.folders, result.worksheets, root);
                root.expand(true);
            }
        }, this);
    },

    chooseWorksheets: function() {
        var nodes = this.tree.getChecked();
        var worksheets = [];

        for (var i = 0; i < nodes.length; i++) {
            worksheets.push({
                uuid: nodes[i].id,
                text: nodes[i].text,
            });
        }

        if (this.fireEvent('worksheetschosen', worksheets) !== false) {
            this.close();
        }
    },
});

