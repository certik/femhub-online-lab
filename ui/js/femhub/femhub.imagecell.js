
FEMhub.ImageCell = Ext.extend(FEMhub.OutputCell, {
    ctype: 'image',
    imageData: null,

    initComponent: function() {
        FEMhub.ImageCell.superclass.initComponent.call(this);
    },

    getOutput: function() {
        return this.imageData;
    },

    setOutput: function(data) {
        this.el_image.dom.setAttribute('src', data);
        this.imageData = data;
    },

    onRender: function() {
        FEMhub.ImageCell.superclass.onRender.apply(this, arguments);

        this.el.addClass('femhub-cell-image');
        this.el_textarea.addClass('femhub-cell-image-textarea');

        this.el_image = this.el_textarea.createChild({
            tag: 'img',
            cls: 'femhub-cell-image-image',
        });
    },
});

