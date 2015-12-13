
FEMhub.ErrorCell = Ext.extend(FEMhub.OutputCell, {
    ctype: 'error',

    onRender: function() {
        FEMhub.ErrorCell.superclass.onRender.apply(this, arguments);

        this.el.addClass('femhub-cell-error');
    },
});

