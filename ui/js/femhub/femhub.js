
FEMhub = {
    version: [0, 0, 1],
    urls: ['/client/', '/async/'],
    cors: false,
    verbose: true,

    log: function(msg) {
        if (console !== undefined) {
            console.log(msg);
        }
    },
};

