
FEMhub.ContentCell = Ext.extend(FEMhub.Cell, {
    ctype: 'content',
    content: null,
    contentEmpty: "Click here to edit contents",

    initComponent: function() {
        FEMhub.ContentCell.superclass.initComponent.call(this);
    },

    setupContentCellObserver: function() {
        /* pass */
    },

    setupContentCellEvents: function() {
        this.el.on('contextmenu', function(evt) {
            var context = this.createContextMenu([{
                text: 'Edit',
                iconCls: 'femhub-edit-icon',
                handler: function() {
                    this.editCell();
                },
                scope: this,
            }]);

            context.showAt(evt.getXY());
            evt.stopEvent();
        }, this);
    },

    setupContentCellKeyMap: function() {
        /* pass */
    },

    onRender: function(container, position) {
        FEMhub.ContentCell.superclass.onRender.apply(this, arguments);

        this.el.addClass('femhub-cell-content');

        this.el_content = this.el.createChild({
            tag: 'div',
            cls: 'femhub-cell-content-area',
            html: this.content || this.contentEmpty,
        });

        this.setupContentCellObserver();
        this.setupContentCellEvents();
        this.setupContentCellKeyMap();
    },

    setContent: function(content) {
        this.content = content || null;

        if (!content) {
            content = this.contentEmpty;
        }

        this.el_content.dom.innerHTML = content;
    },

    getContent: function() {
        return this.content || "";
    },

    setText: function(content) {
        return this.setContent(content);
    },

    getText: function() {
        return this.getContent();
    },

    editCell: function() {
        var desktop = FEMhub.lab.getDesktop();

        var editor = desktop.createWindow(FEMhub.CellEditor, {
            content: this.getContent(),
            listeners: {
                savecell: {
                    fn: function(content) {
                        this.setContent(content);
                        this.setUnsaved();
                    },
                    scope: this,
                },
            },
        });

        editor.show();
    },
});

