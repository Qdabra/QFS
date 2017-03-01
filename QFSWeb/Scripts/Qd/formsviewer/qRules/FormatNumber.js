var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.FormatNumber = (function (qd) {
    var formatNumberError = "Unable to format number.";

    function FormatNumber(params) {
        var constants = qd.FormsViewer.qRules.Constants,
            requiredParameters = [
                {
                    name: constants.paramValue,
                    description: 'The number value to apply the format to'
                },
                {
                    name: constants.paramFormat,
                    description: 'The standard or custom format for the returned string'
                }
            ],
            optionalParameters = [
                {
                    name: constants.paramCulture,
                    description: 'The desired culture provider for the returned string'
                }
            ];

        function getSettings(cf) {
            return {
                numberToFormat: cf.getDoubleParamValue(constants.paramValue, null, false),
                format: cf.getParamValue(constants.paramFormat),
                culture: cf.getParamValue(constants.paramCulture)
            };
        }

        function executeAsync() {
            var cf = params.commonFunction,
                qfs = params.qfsAccess,
                settings = getSettings(cf);

            return qfs.formatNumber(settings)
                .then(function (data) {
                    if (!data) {
                        throw new Error(formatNumberError);
                    }

                    if (!data.Success) {
                        throw new Error(data.Error || formatNumberError);
                    }

                    return {
                        Success: data.Success,
                        Result: data.Data
                    };
                });
        }

        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters
        };
    }

    return FormatNumber;

})(Qd);