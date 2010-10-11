
FEMhub.RAWCell = Ext.extend(FEMhub.OutputCell, {
    ctype: 'raw',

    getOutput: function() {
        return this.el_textarea.dom.innerHTML;
    },

    setOutput: function(output) {
        this.el_textarea.dom.innerHTML = output;
    },
});

