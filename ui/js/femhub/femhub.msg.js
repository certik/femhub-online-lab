
FEMhub.msg = {};

FEMhub.msg.NotImplementedError = function() {
    Ext.MessageBox.show({
        title: 'Not implemented',
        msg: "This function hasn't been implemented yet. Sorry.",
        buttons: Ext.MessageBox.OK,
        icon: Ext.MessageBox.INFO,
    });
}

FEMhub.msg.show = function(obj, msg, icon, buttons) {
    if (Ext.isObject(obj)) {
        var title = obj.title;
    } else {
        var title = obj;
    }

    buttons = buttons || Ext.MessageBox.OK;

    Ext.MessageBox.show({
        title: title,
        msg: msg,
        icon: icon,
        buttons: buttons,
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

