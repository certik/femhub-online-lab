
FEMhub.TextCell = Ext.extend(FEMhub.Cell, {
    ctype: 'text',
    content: null,
    contentEmpty: "Click here (with right mouse button) to edit contents",

    initComponent: function() {
        FEMhub.TextCell.superclass.initComponent.call(this);
    },

    setupTextCellObserver: function() {
        /* pass */
    },

    setupTextCellEvents: function() {
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

    onRender: function() {
        FEMhub.TextCell.superclass.onRender.apply(this, arguments);

        this.el.addClass('femhub-cell-text');

        this.el_content = this.el.createChild({
            tag: 'div',
            cls: 'femhub-cell-text-area',
            html: this.content || this.contentEmpty,
        });

        this.setupTextCellObserver();
        this.setupTextCellEvents();
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

