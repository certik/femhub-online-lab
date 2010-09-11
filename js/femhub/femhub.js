
FEMhub = {
    version: [0, 0, 1],
    json: "/femhub/json/",
    icons: "/static/img/femhub/icons/",
};

FEMhub.unique = function() {
    return (new Date()).getTime() + Math.random().toString().substr(2, 8);
}

FEMhub.hasArg = function(args, arg) {
    return Ext.isDefined(args) && Ext.isDefined(args[arg]);
}

FEMhub.getDesktop = function() {
    return FEMhub.lab.getDesktop();
}

