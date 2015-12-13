
FEMhub = {
    version: '0.0.1-git',
    urls: ['/client/', '/async/'],
    cors: false,
    verbose: true,

    log: function(msg) {
        if (console !== undefined) {
            console.log(msg);

            if (_console !== undefined) {
                _console.log(msg);
            }
        }
    },
};

