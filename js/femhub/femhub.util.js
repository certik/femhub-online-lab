
FEMhub.util = {};

FEMhub.util.isValidName = function(name) {
    var len = name.trim().length;
    return len > 0 && len < 100;
}

