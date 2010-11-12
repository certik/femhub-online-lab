
FEMhub.msg = {};

FEMhub.msg.NotImplementedError = function() {
    Ext.MessageBox.show({
        title: 'Not implemented',
        msg: "This function hasn't been implemented yet. Sorry.",
        buttons: Ext.MessageBox.OK,
        icon: Ext.MessageBox.INFO,
    });
};

FEMhub.msg.show = function(obj, msg, handler, scope, buttons, icon) {
    var title;

    if (Ext.isObject(obj)) {
        title = obj.title;
    } else {
        title = obj;
    }

    msg = Ext.util.Format.htmlEncode(msg);
    buttons = buttons || Ext.MessageBox.OK;

    Ext.MessageBox.show({
        title: title,
        msg: msg,
        icon: icon,
        buttons: buttons,
        fn: handler,
        scope: scope,
    });
};

FEMhub.msg.info = function(title, msg, handler, scope, buttons) {
    FEMhub.msg.show(title, msg, handler, scope, buttons, Ext.MessageBox.INFO);
};

FEMhub.msg.warning = function(title, msg, handler, scope, buttons) {
    FEMhub.msg.show(title, msg, handler, scope, buttons, Ext.MessageBox.WARNING);
};

FEMhub.msg.error = function(title, msg, handler, scope, buttons) {
    FEMhub.msg.show(title, msg, handler, scope, buttons, Ext.MessageBox.ERROR);
};

FEMhub.msg.critical = function(msg, handler, scope) {
    FEMhub.msg.error("Critical Error", msg, handler, scope);
};

