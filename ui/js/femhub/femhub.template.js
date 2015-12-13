
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
        fail: {
            title: "Template rendering error",
            errors: {
                'template-not-found': "'" + name + "' template not found.",
                'template-render-error': "'" + name + "' failed to render.",
            },
        },
    });
};

