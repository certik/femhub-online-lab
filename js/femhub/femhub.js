
Ext.BLANK_IMAGE_URL = "/static/external/ext/images/default/s.gif";

Ext.WindowMgr.zseed = 10000;

FEMhub = {
    version: [0, 0, 1],
    json: "/femhub/json/",
    icons: "/static/img/femhub/icons/",
    logs: [],
};

FEMhub.log = function(text) {
    FEMhub.logs.push([text, new Date()]);
}

FEMhub.clearLogs = function() {
    FEMhub.logs = [];
}

FEMhub.unique = function() {
    return (new Date()).getTime() + Math.random().toString().substr(2, 8);
}

FEMhub.hasArg = function(args, arg) {
    return Ext.isDefined(args) && Ext.isDefined(args[arg]);
}

FEMhub.raiseNotImplementedError = function() {
    Ext.MessageBox.show({
        title: 'Not implemented',
        msg: "This function hasn't been implemented yet. Sorry.",
        buttons: Ext.MessageBox.OK,
        icon: Ext.MessageBox.INFO,
    });
}

FEMhub.getDesktop = function() {
    return FEMhub.lab.getDesktop();
}

