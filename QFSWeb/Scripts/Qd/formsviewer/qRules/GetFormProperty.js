var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.GetFormProperty = (function (qd) {
    'use strict';

    var constants = qd.FormsViewer.qRules.Constants,
        requiredParameters = [
            {
                name: constants.paramKey,
                description: 'Name of the property to retrieve'
            }];

    function getValue(key) {
        switch (key) {
            case 'UserAgent':
                if (!window.navigator || !window.navigator.userAgent) {
                    throw new Error('The User Agent is not currently available');
                }

                return window.navigator.userAgent;

            default:
                throw new Error(String.format('GetFormProperty: The specified key is invalid: {0}', key));
        }
    }

    function GetFormProperty(params) {

        function executeAsync() {
            var cf = params.commonFunction,
                key = cf.getParamValue(constants.paramKey),
                value = getValue(key);

            return Q({
                Result: value,
                Success: true
            });
        }

        return {
            executeAsync: executeAsync,
            requiredParameters: requiredParameters
        };
    }

    return GetFormProperty;
})(Qd);