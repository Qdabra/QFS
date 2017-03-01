var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.Transform = (function (qd, qdNew) {
    'use strict';

    var constants = Qd.FormsViewer.qRules.Constants,
        transformXsltFile = 'xsltfile',
        transformToString = 'tostring',
        transformExcludeRoot = 'excluderoot',
        transformResultFilename = 'resultfilename',
        transformPlacement = 'placement',
        transformUseDocument = 'usedocument',
        transformSetResult = 'setresult',
        placementAppend = 'append',
        placementPrepend = 'prepend',
        placementReplace = 'replace',
        errorFailedToSelectSource = 'Failed to select the source node.',
        errorFailedToSelectDestination = 'Failed to select the destination node.',
        errorSourceConflict = "/" + constants.paramSourceDs + " and /" + constants.paramSourceFile + " cannot both be specified.",
        errorToStringOnRoot = "The tostring argument cannot be 'true' when the destination node is a root node.",
        errorNotToStringNonElement = "The tostring argument must be 'true' when the destination node is a non-element.",
        errorOmitXmlDeclaration = "The XSL omit-xml-declaration option must be set unless the tostring or excluderoot option is specified as true.",
        errorSetResult = "An error occurred setting the result of the transform.",
        transformErrorFailedToSelectTransform = "Failed to open specified xslt file",
        errorLoadXsl = "An error occurred loading the XSL transform.",
        errorFailedFileLoad = "Error: Failed to load the specified file.",
        placementObj = {
            append: 'append',
            prepend: 'prepend',
            replace: 'replace'
        },
        optionalParameters = [
            {
                name: constants.paramSourceDs,
                description: 'Source data source'
            },
            {
                name: constants.paramSourcePath,
                description: 'Source node path'
            },
            {
                name: constants.paramSourceFile,
                description: 'Source template file'
            },
            {
                name: constants.paramDestDs,
                description: 'Destination data source'
            },
            {
                name: constants.paramDestPath,
                description: 'Destination node path'
            },
            {
                name: transformToString,
                description: '(boolean, false by default) Store result as string value'
            },
            {
                name: transformExcludeRoot,
                description: 'Omit root of transform result when transferring to destination'
            },
            {
                name: transformResultFilename,
                description: 'The filename to use for the resulting file when using the base64 format'
            },
            {
                name: transformPlacement,
                description: 'Location to place the transform result in the destination node. Possible values are: replace, prepend, append (default is replace)'
            },
            {
                name: transformUseDocument,
                description: '(boolean, false by default) Allow using the document() function in the XSLT.'
            },
            {
                name: transformSetResult,
                description: '(boolean, false by default) Set the transform result to the qRules Result field.'
            },
            {
                name: constants.paramFormat,
                description: 'Method for storing the result (xml, string, base64)'
            }
        ],
        requiredParameters = [
            {
                name: transformXsltFile,
                description: 'Resource file name of XSL transform'
            }
        ];

    function selectNodeListFromXPathEngine(xPathEngine, node, xPath) {
        var nodeList = xPathEngine.evaluateXPath(xPath, {
            context: node
        }).toArray();

        return nodeList;
    }

    function selectNodeFromXPathEngine(xPathEngine, node, xPath, errorMessage) {
        var nodeList = selectNodeListFromXPathEngine(xPathEngine, node, xPath);

        var node = nodeList && nodeList.length > 0
            ? nodeList[0]
            : null;

        if (!node) {
            throw new Error(errorMessage);
        }

        return node;
    }

    function getPlacement(placement) {
        switch (placement.toLowerCase()) {

            case placementAppend:
                return placementObj.append;

            case placementPrepend:
                return placementObj.prepend;

            case placementReplace:
                return placementObj.replace;

            default:
                throw new Error(String.format('Invalid placement value: {0}. Allowed values are: {1}, {2}, {3}',
                    placement, placementObj.append, placementObj.prepend, placementObj.replace));
        }
    }

    function determineToString(format, toString) {
        var isStringFormat = format && (format === 'string' || format === 'base64');

        return isStringFormat || toString;
    }

    function determineFormat(format, toString) {
        return format
            ? format
            : (toString ? 'string' : 'xml');
    }

    function validateTransformSettings(parameters) {
        var destinationNodeType = parameters.destNode.getNode().nodeType,
            destinationIsRoot = destinationNodeType === 0;

        if (parameters.produceStringResult && destinationIsRoot) {
            // The root node (not to be confused with the Document Element)
            // cannot have its value set to a string
            throw new Error(errorToStringOnRoot);
        }

        var isElement = destinationNodeType === 1 || destinationIsRoot;
        if (!(parameters.produceStringResult || isElement)) {
            // Only elements or the root node can have nodes inserted beneath them
            throw new Error(errorNotToStringNonElement);
        }

        if (parameters.format === 'base64' && !parameters.resultFileName) {
            throw new Error(transformResultFilename + " cannot be blank if format is base64");
        }
    }

    function getResultNodes(xPathEngine, value, excludeRoot) {
        try {
            var doc = value;

            var path = (excludeRoot ? '/*' : '') + '/node()';

            return selectNodeListFromXPathEngine(xPathEngine, doc, path);
        } catch (e) {
            console.error(e);
            throw new Error('An error occurred trying to process the result as XML.');
        }
    }

    function appendNodes(destNode, newNodes) {
        return destNode.appendChildrenAsync(newNodes);
    }

    function prependNodeContent(xPathEngine, destNode, newNodes) {
        var firstChild = destNode.selectSingle('node()');

        if (!firstChild) {
            return appendNodes(destNode, newNodes);
        }

        return newNodes.reduce(function (prev, next) {
            return prev.then(function () {
                return firstChild.insertBeforeAsync(next);
            });
        }, Q());
    }

    function replaceNodeContent(destNode, newNodes) {
        return destNode.setContentAsync(newNodes);
    }

    function addNodeContent(xPathEngine, commonFunction, destNode, placement, newNodes) {
        if (!destNode) {
            throw new Error('Could not locate the destination node');
        }

        switch (placement) {
            case placementObj.append:
                return appendNodes(destNode, newNodes);

            case placementObj.prepend:
                return prependNodeContent(xPathEngine, destNode, newNodes);

            default:
                return replaceNodeContent(destNode, newNodes);
        }
    }

    function getNewValue(oldValue, placement, newValue) {
        switch (placement) {
            case placementObj.prepend:
                return newValue + oldValue;

            case placementObj.append:
                return oldValue + newValue;

            default:
                return newValue;
        }
    }

    function setTransformResultAsync(xPathEngine, commonFunction, parameters, value) {
        var destNode = parameters.destNode;

        switch (parameters.format) {
            case 'xml':
                return addNodeContent(
                    xPathEngine,
                    commonFunction,
                    destNode,
                    parameters.placement,
                    getResultNodes(xPathEngine, value, parameters.excludeRoot)
                );

            case 'string':
                return destNode.setValueAsync(getNewValue(destNode.value(), parameters.placement, value));

            default:
            case 'base64':
                throw new Error(String.format('Invalid format value: {0}', parameters.format));
        }
    }

    function trySetResult(xPathEngine, commonFunction, parameters, result) {
        try {
            return setTransformResultAsync(xPathEngine, commonFunction, parameters, result);
        } catch (e) {
            console.error("Error setting transform result");
            throw new Error(errorSetResult);
        }
    }

    function Transform(params) {

        function loadXmlTemplateFile(sourceFile) {
            return params.template.getTemplateFileAsync(sourceFile)
                .then(function myfunction(stringXml) {
                    return $.parseXML(stringXml);
                })
                .catch(function (e) {
                    throw new Error(String.format('{0} Error: {1}', errorFailedFileLoad, e.message));
                });
        }

        function getTransformSourceDs(sourceDsName, sourceFile) {
            if (sourceFile) {
                if (sourceDsName) {
                    throw new Error(errorSourceConflict);
                }

                return loadXmlTemplateFile(sourceFile);
            }

            return Q(params.commonFunction.getDataSource(sourceDsName).getNode());
        }

        function performTransform(commonFunction, parameters) {
            var format = parameters.format,
                toString = parameters.produceStringResult;

            // /format takes precedence over /tostring
            parameters.produceStringResult = determineToString(format, toString);
            parameters.format = determineFormat(format, toString);

            validateTransformSettings(parameters);

            var resultNode = parameters.transform.transform(parameters.sourceNode, { functions: commonFunction.xpathFunctions() });

            return parameters.produceStringResult
                ? qdNew.xmlUtility.xmlToString(resultNode)
                : resultNode;
        }

        function transformResultToString(transformResult, excludeRoot) {
            if (typeof transformResult === "string") {
                return transformResult;
            }

            if (!excludeRoot) {
                return qdNew.xmlUtility.xmlToString(transformResult);
            }

            return qdNew.xmlUtility
                .getChildNodes(transformResult)
                .map(function (node) {
                    return qdNew.xmlUtility.xmlToString(node);
                })
                .join('');
        }

        function executeAsync() {
            var commonFunction = params.commonFunction,
                xsltFileName = commonFunction.getParamValue(transformXsltFile),
                sourceDsName = commonFunction.getParamValue(constants.paramSourceDs),
                sourcePath = commonFunction.getParamValue(constants.paramSourcePath, '/'),
                sourceFile = commonFunction.getParamValue(constants.paramSourceFile),
                destDsName = commonFunction.getParamValue(constants.paramDestDs),
                destPath = commonFunction.getParamValue(constants.paramDestPath, '/'),
                format = commonFunction.getParamValue(constants.paramFormat),
                resultFileName = commonFunction.getParamValue(transformResultFilename),
                toString = commonFunction.getBoolParamValue(transformToString),
                excludeRoot = commonFunction.getBoolParamValue(transformExcludeRoot),
                placement = commonFunction.getParamValue(transformPlacement, placementReplace),
                useDocument = commonFunction.getBoolParamValue(transformUseDocument),
                setResult = commonFunction.getBoolParamValue(transformSetResult),
                xPathEngine = params.template.getXPathEngine();

            return Q.all([
                    getTransformSourceDs(sourceDsName, sourceFile),
                    commonFunction.getTransformNew(xsltFileName)
            ])
                .then(function (inputs) {
                    var sourceNode = selectNodeFromXPathEngine(xPathEngine, inputs[0], sourcePath, errorFailedToSelectSource);
                    var destDataSource = commonFunction.getDataSource(destDsName);
                    var destNode = destDataSource.selectSingle(destPath);

                    if (!destNode) {
                        throw new Error(errorFailedToSelectDestination);
                    }

                    var parameters = {
                        transform: inputs[1],
                        sourceNode: sourceNode,
                        destNode: destNode,
                        produceStringResult: toString,
                        excludeRoot: excludeRoot,
                        format: format,
                        resultFileName: resultFileName,
                        placement: getPlacement(placement),
                        useDocument: useDocument
                    };

                    var result = performTransform(commonFunction, parameters);
                    var resultToReturn = setResult
                        ? transformResultToString(result, excludeRoot)
                        : '';

                    return trySetResult(xPathEngine, commonFunction, parameters, result)
                        .then(function () {
                            return {
                                success: true,
                                result: resultToReturn
                            };
                        })
                        .catch(function (e) {
                            return {
                                success: false,
                                error: e.message,
                                result: resultToReturn
                            }
                        });
                });
        }

        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters
        };
    }

    return Transform;
})(Qd, qd);