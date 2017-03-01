var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.GetInputParameter = (function (qd) {
    'use strict';

    var requiredParameters = [{
        name: 'key',
        description: 'Name of Parameter for Desired Value'
    }],
    getInputParameterErrorFailedToGetKey = "The requested key {0} was not specified in the input parameters";

    function GetInputParameter(params) {
        function executeAsync() {
            var commonFunction = params.commonFunction,
                key = commonFunction.getParamValue('key'),
                value = FVUtil.getParameterByName(key);

            return Q()
                .then(function () {
                    if (!value) {
                        return {
                            Error: String.format(getInputParameterErrorFailedToGetKey, key)
                        };
                    }

                    return {
                        Success: true,
                        Result: value
                    };
                });
        }

        return {
            executeAsync: executeAsync,
            requiredParameters: requiredParameters
        }
    }

    return GetInputParameter;
})(Qd);