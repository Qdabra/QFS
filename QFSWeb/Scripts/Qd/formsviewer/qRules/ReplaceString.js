var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.ReplaceString = (function (qd) {
    "use strict";

    var cnt = qd.FormsViewer.qRules.Constants,
        optionalParameters = [{
            name: cnt.paramDsNameSrc,
            description: "Data Source Name for source"
        },
        {
            name: cnt.paramString1,
            description: "Value to be replaced - either /string1 or /pattern must be provided"
        },
        {
            name: cnt.paramString2,
            description: "Value to replace with. If not supplied, blank char is used for replacement."
        },
        {
            name: cnt.paramPattern,
            description: "Regular expression pattern"
        },
        {
            name: cnt.paramRelDest,
            description: "XPath relative to the value of the /xpathsrc parameter. When specified, qRules will place results of this command in the field indicated by " + cnt.paramRelDest + "."
        },
        {
            name: cnt.paramAppend,
            description: "boolean value - when true, the result of the string replacement is appended to the current value of the field indicated by the /reldest parameter rather than replacing it."
        },
        {
            name: cnt.paramResultDs,
            description: "Data Source Name for result destination."
        },
        {
            name: cnt.paramResultPath,
            description: "XPath for result destination field - if no destination is provided, result is returned to Result node only."
        }],
        requiredParameters = [{
            name: cnt.paramXPathSrc,
            description: "XPath for source field"
        }],
        replaceStringErrorMissingParameter = "Either /string1 or /pattern must be provided.",
        errorFailedToSelectSource = "Failed to select the source node.",
        replaceStringError = "Failed to replace string.",
        errorFailedToSelectDestination = "Failed to select the destination node.";

    function doReplace(value, string1, string2, pattern) {
        var regExp = !pattern
            ? new RegExp(string1, 'g')
            : new RegExp(pattern, 'g'),
            replaceString = string2 != null && string2 != undefined
            ? string2
            : '';

        return value.replace(regExp, replaceString);
    }

    function ReplaceString(params) {
        var cf = params.commonFunction;

        function doSingleReplace(dsNameSrc, xpathSrc, string1, string2, pattern) {
            var sourceNode = cf.getValidNode(cf.getDataSource(dsNameSrc), xpathSrc, errorFailedToSelectSource);

            try {
                var newString = doReplace(sourceNode.value(), string1, string2, pattern);

                return {
                    Success: true,
                    Result: newString
                };
            } catch (e) {
                return {
                    Error: replaceStringError
                };
            }
        }

        function doMultiReplace(dsNameSrc, xpathSrc, string1, string2, pattern, relDest, append) {
            var sourceNodes = cf.getValidNodeSet(cf.getDataSource(dsNameSrc), xpathSrc, errorFailedToSelectSource),
                replaceCount = 0;

            return qd.util.runPromiseSequence(sourceNodes, function (lastResult, node) {
                if (lastResult && lastResult.shouldStop) {
                    return lastResult;
                } else {
                    var newString = doReplace(node.value(), string1, string2, pattern),
                        dest = cf.getValidNode(node, relDest, errorFailedToSelectDestination);

                    if (append && JSON.parse(append)) {
                        newString = dest.value() + newString;
                    }

                    return dest.setValueAsync(newString)
                        .then(function () {
                            replaceCount++;
                        });
                }
            })
            .then(function () {
                return {
                    Success: true,
                    Result: replaceCount
                };
            })
            .catch(function () {
                return {
                    Error: replaceStringError
                };
            });
        }

        function executeAsync() {
            var dsNameSrc = cf.getParamValue("dsnamesrc"),
                xpathSrc = cf.getParamValue("xpathsrc"),
                string1 = cf.getParamValue("string1"),
                string2 = cf.getParamValue("string2"),
                pattern = cf.getParamValue("pattern"),
                relDest = cf.getParamValue("reldest"),
                append = cf.getBoolParamValue("append");

            if (!string1 && !pattern) {
                return {
                    Error: replaceStringErrorMissingParameter
                };
            }

            if (!relDest) {
                return doSingleReplace(dsNameSrc, xpathSrc, string1, string2, pattern);
            }
            else {
                return doMultiReplace(dsNameSrc, xpathSrc, string1, string2, pattern, relDest, append);
            }
        }

        return {
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters,
            executeAsync: executeAsync
        };
    }

    return ReplaceString;
})(Qd);