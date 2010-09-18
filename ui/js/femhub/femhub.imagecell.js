
FEMhub.ImageCell = Ext.extend(FEMhub.OutputCell, {
    ctype: 'image',
    imageURL: null,

    initComponent: function() {
        FEMhub.ImageCell.superclass.initComponent.call(this);
    },

    getOutput: function() {
        return this.imageURL;
    },

    setOutput: function(url) {
        this.el_image.dom.setAttribute('src', '/data/' + url);
        this.imageURL = url;
    },

    onRender: function(container, position) {
        FEMhub.ImageCell.superclass.onRender.apply(this, arguments);

        this.el.addClass('femhub-cell-image');
        this.el_textarea.addClass('femhub-cell-image-textarea');

        this.el_image = this.el_textarea.createChild({
            tag: 'img',
            cls: 'femhub-cell-image-image',
        });
    },
});

