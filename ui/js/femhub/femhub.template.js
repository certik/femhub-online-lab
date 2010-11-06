
FEMhub.Template = {};

FEMhub.Template.render = function(name, context, handler, scope) {
    if (!Ext.isObject(context)) {
        scope = handler;
        handler = context;
        context = undefined;
    }

    FEMhub.RPC.Template.render({name: name, context: context}, {
        okay: function(result) {
            if (Ext.isDefined(handler)) {
                handler.call(scope || window, result.rendered);
            }
        },
        fail: function(reason) {
            var msg;

            switch (reason) {
            case 'template-not-found':
                msg = "'" + name + "' template not found.";
                break;
            case 'template-render-error':
                msg = "'" + name + "' failed to render.";
                break;
            default:
                msg = Ext.util.Format.htmlEncode(reason);
            }

            FEMhub.msg.error("Template rendering error", msg);
        },
    });
};

