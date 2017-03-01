var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.SetCase = (function (qd) {
    'use strict';

    var constants = qd.FormsViewer.qRules.Constants,
        optionalParameters = [
        {
            name: constants.paramDsNameSrc,
            description: 'Data Source Name for source'
        },
        {
            name: 'case',
            description: 'Upper|Lower|Title (default is Upper)'
        }],
        requiredParameters = [{
            name: constants.paramXPathSrc,
            description: 'XPath for source field'
        }],
        errorFailedToSelectSource = 'Failed to select the source node.';

    function SetCase(params) {

        function executeAsync() {
            var commonFunction = params.commonFunction,
                    dsNameSrc = commonFunction.getParamValue(constants.paramDsNameSrc),
                    xPathSrc = commonFunction.getParamValue(constants.paramXPathSrc),
                    caseToSet = commonFunction.getParamValue('case', 'Upper'),
                    dataSource = commonFunction.getDataSource(dsNameSrc),
                    sourceNode = commonFunction.getValidNode(dataSource, xPathSrc, errorFailedToSelectSource);

            try {
                var nodeValue = sourceNode.value(),
                    newString = '';

                switch (caseToSet) {
                    case "Upper":
                        newString = nodeValue.toLocaleUpperCase();
                        break;

                    case "Lower":
                        newString = nodeValue.toLocaleLowerCase();
                        break;

                    case "Title":
                        var errorObj = new Error('Title case is not supported in this version of qRules');
                        errorObj.name = constants.qRulesExceptionName;
                        throw errorObj;
                        break;

                    default:
                        var errorObj = new Error(commonFunction.getUsageTextForCommand(optionalParameters, requiredParameters, 'SetCase'));//TODO: Check message C# message includes resultdestds, resultxpath.
                        errorObj.name = constants.qRulesExceptionName;
                        throw errorObj;

                }

                return Q({
                    Result: newString,
                    Success: true
                });
            } catch (e) {
                if (e.name === constants.qRulesExceptionName) {
                    throw e;
                }

                throw new Error(String.format('Failed to set to {0} case.', caseToSet));
            }
        }

        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters
        };
    }

    return SetCase;
})(Qd);