var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.DelimitedList = (function (qd) {
    "use strict";

    var cnt = qd.FormsViewer.qRules.Constants,
        optionalParameters = [{
            name: cnt.paramDsName,
            description: "Data Source Name"
        },
        {
            name: cnt.paramSeparator,
            description: "List separator"
        },
        {
            name: cnt.paramSpace,
            description: "Before|After|Both"
        }],
        requiredParameters = [{
            name: cnt.paramXPath,
            description: "XPath for field with values"
        }];


    function DelimitedList(params) {
        var cf = params.commonFunction;

        function executeAsync() {
            var dsName = cf.getParamValue(cnt.paramDsName),
                xpath = cf.getParamValue(cnt.paramXPath),
                separator = cf.getParamValue(cnt.paramSeparator, ";"),
                space = cf.getParamValue(cnt.paramSpace),
                errorUsageText = cf.getUsageTextForCommand(optionalParameters, requiredParameters, 'DelimitedList');

            if (!separator) {
                return {
                    Error: errorUsageText
                };
            }

            if (space) {
                switch (space.toLowerCase()) {

                    case "before":
                        separator = " " + separator;
                        break;

                    case "after":
                        separator = separator + " ";
                        break;

                    case "both":
                        separator = " " + separator + " ";
                        break;

                    default:
                        return {
                            Error: errorUsageText
                        };

                }
            }

            var nodes = cf.getValidNodeSet(cf.getDataSource(dsName), xpath);

            try {
                var concatList = nodes.map(function (node) {
                    return node.value();
                });

                return {
                    Result: concatList.join(separator),
                    Success: true
                };
            } catch (e) {
                return {
                    Error: errorUsageText
                };
            }
        }

        return {
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters,
            executeAsync: executeAsync
        };
    }

    return DelimitedList;

})(Qd);