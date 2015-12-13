
FEMhub.text = {
    isAlpha: function(chr) {
        return (chr >= 'a' && chr <= 'z') || (chr >= 'A' && chr <= 'Z');
    },

    isDigit: function(chr) {
        return chr >= '0' && chr <= '9';
    },

    isAlnum: function(chr) {
        return isAlpha(chr) || isDigit(chr);
    },

    isLiteral: function(chr) {
        return isAlnum(chr) || (chr === '_');
    },

    isName: function(chr) {
        return isLiteral(chr) || (chr === '.');
    },

    isNewline: function(chr) {
        return chr === '\n';
    },

    getStart: function(text, index, cond, slice) {
        var start = index;

        while (start > 0) {
            var chr = text[start-1];

            if (cond(chr)) {
                start--;
            } else {
                break;
            }
        }

        if (slice === true) {
            return {start: start, text: text.slice(start, index)};
        } else {
            return start;
        }
    },

    getEnd: function(text, index, cond, slice) {
        var end = index;

        while (end < text.length) {
            var chr = text[end];

            if (cond(chr)) {
                end++;
            } else {
                break;
            }
        }

        if (slice === true) {
            return {end: end, text: text.slice(index, end)};
        } else {
            return end;
        }
    },

    getNameStart: function(text, index, slice) {
        return FEMhub.text.getStart(text, index, function(chr) {
            return FEMhub.text.isName(chr);
        }, slice);
    },

    getNameEnd: function(text, index, slice) {
        return FEMhub.text.getEnd(text, index, function(chr) {
            return FEMhub.text.isName(chr);
        }, slice);
    },

    getLineStart: function(text, index, slice) {
        return FEMhub.text.getStart(text, index, function(chr) {
            return !FEMhub.text.isNewline(chr);
        }, slice);
    },

    getLineEnd: function(text, index, slice) {
        return FEMhub.text.getEnd(text, index, function(chr) {
            return !FEMhub.text.isNewline(chr);
        }, slice);
    },

    getNumberOfLinesBefore: function(text, index) {
        var count = 0;

        for (var i = 0; i < index; i++) {
            if (FEMhub.text.isNewline(text[i])) {
                count++;
            }
        }

        return count;
    },

    getNumberOfLinesAfter: function(text, index) {
        var count = 0;

        for (var i = index; i < text.length; i++) {
            if (FEMhub.text.isNewline(text[i])) {
                count++;
            }
        }

        return count;
    },

    isFilledWithBefore: function(text, index, fill) {
        while (index > 0) {
            var chr = text[index-1];

            if (FEMhub.text.isNewline(chr)) {
                return true;
            } else {
                if (chr === fill) {
                    index--;
                } else {
                    return false;
                }
            }
        }

        return true;
    },

    findBefore: function(text, index, pattern) {
        var i;

        while (--index >= 0) {
            var chr = text[index];

            for (i in pattern) {
                if (chr === pattern[i]) {
                    return index;
                }
            }
        }

        return null;
    },

    findAfter: function(text, index, pattern) {
        var i;

        while (++index < text.length) {
            var chr = text[index];

            for (i in pattern) {
                if (chr === pattern[i]) {
                    return index;
                }
            }
        }

        return null;
    },
};

