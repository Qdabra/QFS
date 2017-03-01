var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.GetXml = (function (qd) {
    "use strict";

    var constants = qd.FormsViewer.qRules.Constants,
        optionalParameters = [
    {
        name: constants.paramDsName,
        description: 'Data Source Name'
    },
    {
        name: constants.paramXPath,
        description: 'XPath to field to get'
    },
    {
        name: constants.paramInner,
        description: '(boolean, defaults to false) Get Inner XML of Node'
    },
    {
        name: constants.paramOuter,
        description: '(boolean, defaults to true) Get Outer XML of Node'
    }],
    errorFailedToSelectSource = 'Failed to select source field.',
    errorFailedToDetermineValue = 'Failed to determine value';

    function GetXml(params) {

        //function setDestinationNode(dsNameDest, xPathDest, error) {
        //    return Q().
        //    then(function () {
        //        if (!xPathDest && dsNameDest) {
        //            throw new Error('An XPath must be provided for the destination node.');
        //        }

        //        if (xPathDest) {
        //            var commonFunction = params.commonFunction,
        //                ds = commonFunction.getDataSource(dsNameDest),
        //                destNodes = commonFunction.getValidNodeSet(ds, xPathDest, error);

        //            return qd.util.runPromiseSequence(destNodes,
        //                function (lastResult, node) {
        //                    if (lastResult && lastResult.shouldStop) {
        //                        return lastResult;
        //                    }

        //                    return node.setValueAsync('');
        //                });
        //        }
        //    });
        //}

        function executeAsync() {
            var commonFunction = params.commonFunction,
                dsName = commonFunction.getParamValue(constants.paramDsName),
                xPath = commonFunction.getParamValue(constants.paramXPath, '/'),
                inner = commonFunction.getBoolParamValue(constants.paramInner),
                outer = commonFunction.getBoolParamValue(constants.paramOuter),
                dataSource = commonFunction.getDataSource(dsName),
                target = commonFunction.getValidNode(dataSource, xPath, errorFailedToSelectSource);

            return Q()
                .then(function () {

                    var constants = qd.FormsViewer.qRules.Constants,
                        resultDsName = commonFunction.getParamValue(constants.paramResultDs),
                        resultXPath = commonFunction.getParamValue(constants.paramResultPath);

                    if (!target) {
                        return Q({
                            Error: errorFailedToSelectSource
                        });
                    }

                    // Default is outer, and outer if both are true
                    var useOuter = outer || !inner,
                        value;

                    if (useOuter) {
                        value = FVUtil.xmlToString(target.getNode());
                    } else {
                        var childNodes = target.childNodes()
                            .map(function (node) {
                                return node ? node.getNode() : null;
                            }).filter(function (node) {
                                return node;
                            });

                        value = FVUtil.xmlToStringMulti(childNodes, '');
                    }

                    return {
                        Result: value,
                        Success: true
                    };
                })
                    .catch(function (e) {
                        return errorFailedToDetermineValue;
                    });
        }

        return {
            optionalParameters: optionalParameters,
            executeAsync: executeAsync
        };
    }

    return GetXml;
})(Qd);