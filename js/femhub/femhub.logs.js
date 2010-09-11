
FEMhub.logs = {
    collection: [],
};

FEMhub.logs.log = function(text) {
    FEMhub.logs.collection.push([text, new Date()]);
}

FEMhub.logs.each = function(handler, scope) {
    Ext.each(FEMhub.logs.collection, handler, scope);
}

FEMhub.logs.clear = function() {
    FEMhub.logs.collection = [];
}

FEMhub.log = FEMhub.logs.log;

