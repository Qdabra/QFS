var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.SetValue = (function (qd) {
    'use strict';

    var constants = qd.FormsViewer.qRules.Constants,
        optionalParameters = [{
            name: constants.paramDsName,
            description: 'Data Source Name'
        },
        {
            name: constants.paramValue,
            description: 'New value for the field'
        },
        {
            name: constants.paramBlank,
            description: 'Sets the field to blank (yes). Overrides /value'
        },
        {
            name: constants.paramNil,
            description: 'Nils the field (yes). Use on non-string data types, overrides /value'
        }],
        requiredParameters = [{
            name: constants.paramXPath,
            description: 'XPath to field to set'
        }],
        setValueErrorNoValueSpecified = "A value should be specified when not setting blank or nil.",
        setValueErrorFailedToSetValue = "Failed to set value of target field.";

    function SetValue(params) {

        function executeAsync() {
            var commonFunction = params.commonFunction,
                dsname = commonFunction.getParamValue(constants.paramDsName),
                xpath = commonFunction.getParamValue(constants.paramXPath),
                value = commonFunction.getParamValue(constants.paramValue),
                blank = commonFunction.getBoolParamValue(constants.paramBlank),
                nil = commonFunction.getBoolParamValue(constants.paramNil);

            if (!value && !blank && !nil) {
                throw new Error(setValueErrorNoValueSpecified);
            }

            if (blank) {
                // Specifying /blank=yes overrides any user value.
                value = '';
            }

            var targets = commonFunction.getValidNodeSet(commonFunction.getDataSource(dsname), xpath);

            return qd.util.runPromiseSequence(targets,
                function (lastResult, target) {
                    if (lastResult && lastResult.shouldStop) {
                        return lastResult;
                    }
                    else {
                        if (nil) {
                            return commonFunction.setNil(target);
                        }

                        return target.setValueAsync(value);
                    }
                })
                .then(function () {
                    return {
                        Success: true
                    };
                })
                .catch(function () {
                    throw new Error(setValueErrorFailedToSetValue);
                });
        }

        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters
        };
    }

    return SetValue;
})(Qd);