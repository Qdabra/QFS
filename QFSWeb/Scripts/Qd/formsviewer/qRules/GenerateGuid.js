var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.GenerateGuid = (function (qd) {
    "use strict";

    var optionalParameters = [{
        name: "format",
        description: 'Format for the generated GUID. Default is D.'
    }],
    generateGuidErrorFormat = "GenerateGuid Format must be one of the following: N, D, B or P";

    function GenerateGuid(params) {

        function executeAsync() {
            var commonFunction = params.commonFunction,
                qfsAccess = params.qfsAccess,
                format = commonFunction.getParamValue("format", "D").toUpperCase();

            if (format !== "N" && format !== "D" && format !== "B" && format !== "P") {
                throw new Error(generateGuidErrorFormat);
            }

            return qfsAccess.newGuidAsync(format)
                .then(function (data) {
                    return {
                        Error: '',
                        Result: data,
                        Success: true
                    };
                });
        }

        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters
        }
    }

    return GenerateGuid;
})(Qd);