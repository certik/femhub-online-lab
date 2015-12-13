
FEMhub.RSTCell = Ext.extend(FEMhub.TextCell, {
    ctype: 'rst',

    initComponent: function() {
        FEMhub.RSTCell.superclass.initComponent.call(this);
    },

    setupRSTCellObserver: function() {
        /* pass */
    },

    setupRSTCellEvents: function() {
        /* pass */
    },

    onRender: function() {
        FEMhub.RSTCell.superclass.onRender.apply(this, arguments);

        this.el.addClass('femhub-cell-rst');

        this.setupRSTCellObserver();
        this.setupRSTCellEvents();
    },

    setContent: function(content) {
        this.content = content || null;

        if (content) {
            FEMhub.RPC.Docutils.render({rst: content}, function(result) {
                if (result.ok === true) {
                    this.el_content.dom.innerHTML = result.html;
                } else {
                    this.el_content.dom.innerHTML = this.contentEmpty;
                }
            }, this);
        } else {
            this.el_content.dom.innerHTML = this.contentEmpty;
        }
    },

    editCell: function() {
        // TODO: override
    },
});

