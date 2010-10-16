
FEMhub.msg = {};

FEMhub.msg.NotImplementedError = function() {
    Ext.MessageBox.show({
        title: 'Not implemented',
        msg: "This function hasn't been implemented yet. Sorry.",
        buttons: Ext.MessageBox.OK,
        icon: Ext.MessageBox.INFO,
    });
}

FEMhub.msg.show = function(title, msg, icon) {
    Ext.MessageBox.show({
        title: title,
        msg: msg,
        buttons: Ext.MessageBox.OK,
        icon: icon,
    });
}

FEMhub.msg.info = function(title, msg) {
    FEMhub.msg.show(title, msg, Ext.MessageBox.INFO);
}

FEMhub.msg.warning = function(title, msg) {
    FEMhub.msg.show(title, msg, Ext.MessageBox.WARNING);
}

FEMhub.msg.error = function(title, msg) {
    FEMhub.msg.show(title, msg, Ext.MessageBox.ERROR);
}

