var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.GetValue = (function (qRules) {
    "use strict";

    var cnt = qRules.Constants,
        optionalParameters = [
        {
            name: cnt.paramDsName,
            description: "Data Source Name"
        },
        {
            name: cnt.paramXPath,
            description: "XPath to field to get value"
        },
        {
            name: cnt.paramXPathNode,
            description: "Relative XPath to node with XPath to evaluate - can only be used if /eval is true and reldest is included"
        },
        {
            name: cnt.paramEval,
            description: "(boolean) evaluate the xpath as an expression rather than retrieving a node value"
        },
        {
            name: cnt.paramXPathSrc,
            description: "XPath used with eval to indicate node to evaluate. Required if /eval is true and /reldest is included"
        },
        {
            name: cnt.paramContextNode,
            description: "Context node for evaluation - can only be used if /eval is true and reldest is included"
        },
        {
            name: cnt.paramRelDest,
            description: "XPath relative to the value of the /xpath parameter. When specified, qRules will place results of this command in the field indicated by " + cnt.paramRelDest
        },
        {
            name: cnt.paramAppend,
            description: "true|false. If true, the result of the string replacement is appended to the current value of the field indicated by the /reldest parameter rather than replacing it. Defaults to false"
        },
        {
            name: cnt.paramDefault,
            description: "Default value to return to the results node if no value is returned"
        }],
        requiredParameters = [],
        getValueErrorBlankXPath = "No /xpath or /xpathsrc provided for field selection.",
        getValueSingleParamError = "/{0} cannot be used without including /{1}.",
        getValueErrorBlankXPathSrc = "If /eval is true and a /reldest is provided, /xpathsrc is required.",
        getValueErrorFailedToSelectNode = "Failed to select field.",
        errorFailedToSelectSource = "Failed to select the source node.",
        errorFailedToSelectDestination = "Failed to select the destination node.";


    function GetValue(params) {

        var cf = params.commonFunctions;

        function validateGetValueParams(dsName, xPath, xPathNode, xPathSrc, defaultValue, evalValue, contextNodeValue, relDest, append) {
            if (!xPath && !xPathSrc) {
                throw new Error(getValueErrorBlankXPath + " " + cf.getUsageTextForCommand(optionalParameters, requiredParameters, "GetValue"));
            }

            if (!relDest) {
                if (!!xPathNode) {
                    throw new Error(String.format(getValueSingleParamError, cnt.paramXPathNode, cnt.paramRelDest));
                }
                if (!!contextNodeValue) {
                    throw new Error(String.format(getValueSingleParamError, cnt.paramContextNode, cnt.paramRelDest));
                }
                if (append) {
                    throw new Error(String.format(getValueSingleParamError, cnt.paramAppend, cnt.paramRelDest));
                }
            }
            else {
                if (!xPathSrc && !!evalValue) {
                    throw new Error(getValueErrorBlankXPathSrc + " " + cf.getUsageTextForCommand(optionalParameters, requiredParameters, "GetValue"));
                }
            }
        }

        function getNodeValue(node) {
            return !node ? "" : node.value();
        }

        function getEvaluatedValue(xPath, node) {
            var expression = String.format("string({0})", xPath);

            try {
                return node.evaluateString(expression);
            } catch (e) {
                throw new Error(String.format("An error occurred evaluating the xpath '{0}'", xPath), e.message);
            }
        }

        function getSingleValue(dsName, xPath, xPathSrc, defaultValue, evalValue) {
            var ds = cf.getDataSource(dsName),
                valueString = "",
                node;

            if (evalValue) {
                node = !!xPathSrc
                    ? cf.getValidNode(ds, xPathSrc, getValueErrorFailedToSelectNode)
                    : null;

                valueString = getEvaluatedValue(xPath, !node ? ds : node);
            }
            else {
                node = cf.getValidNode(ds, xPath, getValueErrorFailedToSelectNode);
                valueString = getNodeValue(node);
            }
            return Q(valueString);
        }

        function getMultiValue(dsName, xPathContextNode, xPathSrc, xPath, xPathNode, defaultValue, evalValue, relDest, append) {
            var ds = cf.getDataSource(dsName),
                sourceNodes = cf.getValidNodeSet(ds, (evalValue ? xPathSrc : xPath), errorFailedToSelectSource),
                contextNode = null,
                getCount = 0;

            //get context node if contextnode param
            if (xPathContextNode) {
                contextNode = cf.getValidNode(ds, xPathContextNode, getValueErrorFailedToSelectNode);
            }

            return qd.util.runPromiseSequence(sourceNodes,
                function (lastResult, node) {
                    var valueString = "";

                    if (evalValue) {
                        //if there is a context node, use that, otherwise use the current node

                        //if there is an xpathnode, it should be the relative path to the node that holds the xpath to evaluate.
                        //if not, use xpath (i.e., like the single version, eval == true indicates that instead of signifying a node, 
                        //the xpath param will have the xpath to evaluate

                        var evalXPath = !xPathNode
                            ? xPath
                            : cf.getValidNode(node, xPathNode, getValueErrorFailedToSelectNode).value();

                        valueString = getEvaluatedValue(evalXPath, (!contextNode ? node : contextNode));
                    }
                    else {
                        valueString = getNodeValue(node);
                    }

                    if (!valueString) {
                        valueString = defaultValue;
                    }

                    var dest = cf.getValidNode(node, relDest, errorFailedToSelectDestination);

                    if (append) {
                        valueString = dest.value() + valueString;
                    }

                    return dest.setValueAsync(valueString)
                        .then(function () {
                            getCount++;
                        });
                })
                .then(function () {
                    return getCount;
                });

        }

        function executeAsync() {
            var dsName = cf.getParamValue(cnt.paramDsName),
            xPath = cf.getParamValue(cnt.paramXPath),
            xPathNode = cf.getParamValue(cnt.paramXPathNode),
            xPathSrc = cf.getParamValue(cnt.paramXPathSrc),
            defaultValue = cf.getParamValue(cnt.paramDefault, ""),
            evalValue = cf.getBoolParamValue(cnt.paramEval),
            contextNodeValue = cf.getParamValue(cnt.paramContextNode),
            relDest = cf.getParamValue(cnt.paramRelDest),
            append = cf.getBoolParamValue(cnt.paramAppend),
            isSingleValue = !relDest;


            //TODO:Set Result
            validateGetValueParams(dsName, xPath, xPathNode, xPathSrc, defaultValue, evalValue, contextNodeValue, relDest, append);

            return Q()
                .then(function () {
                    if (isSingleValue) {
                        return getSingleValue(dsName, xPath, xPathSrc, defaultValue, evalValue);
                    }
                    else {
                        return getMultiValue(dsName, contextNodeValue, xPathSrc, xPath, xPathNode, defaultValue, evalValue, relDest, append);
                    }
                })
                .then(function (result) {
                    if (isSingleValue && !result) {
                        result = defaultValue;
                    }

                    return {
                        result: result,
                        success: true
                    };
                });
        }

        return {
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters,
            executeAsync: executeAsync
        };
    }

    return GetValue;

})(Qd.FormsViewer.qRules);