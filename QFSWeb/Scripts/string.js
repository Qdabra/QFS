(function () {
    String.format = function (targetString) {
        // The string containing the format items (e.g. "{0}")
        // will and always has to be the first argument.
        if (!arguments || arguments.length === 1) {
            return targetString;
        }

        for (var i = 1; i < arguments.length; i++) {
            // "gm" = RegEx options for Global search (more than one instance)
            // and for Multiline search
            var regEx = new RegExp("\\{" + (i - 1) + "\\}", "gm");
            targetString = targetString.replace(regEx, arguments[i]);
        }

        return targetString;
    }
})();