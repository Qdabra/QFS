var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.SwapDomWithDocument = (function (qd) {
    'use strict';
    var constants = Qd.FormsViewer.qRules.Constants,
        optionalParameters = [{
            name: constants.paramUpgradeDocument,
            description: 'It attempts to apply the template’s built in upgrade to the incoming document'
        },
        {
            name: constants.paramVersion,
            description: 'Allows querying a previous version of a form stored in DBXL'
        }],
        requiredParameters = [{
            name: constants.paramGetDocument,
            description: 'DBXL GetDocument data connection name'
        },
        {
            name: constants.paramDocId,
            description: 'Document ID to replace the DOM with'
        }],
        invalidDocIdFormat = 'Invalid document id: {0}',
        domSwapFailed = 'Error swapping DOM: The indicated document did not match the schema of the current InfoPath form template.';

    function createXPathEngine() {
        var xPathEngine = new XPathEngine(),
            nsr = new FVNamespaceResolver();

        nsr.addNamespace("QDW", "http://qdabra.com/webservices/");
        nsr.addNamespace("dfs", "http://schemas.microsoft.com/office/infopath/2003/dataFormSolution");

        xPathEngine.nsr = nsr;

        return xPathEngine;
    }

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

    function buildErrorList(xPathEngine, resultNode) {
        var errorNodes = selectNodeListFromXPathEngine(xPathEngine, resultNode, 'QDW:Errors/QDW:ErrorInfo');

        if (!errorNodes || errorNodes.length === 0) {
            return 'No specific errors were returned.';
        }

        var errors = '';
        errorNodes.forEach(function (errorNode) {
            var code = selectNodeFromXPathEngine(xPathEngine, errorNode, 'QDW:Code'),
                error = selectNodeFromXPathEngine(xPathEngine, errorNode, 'QDW:Description');

            errors += String.format('{0}: {1}\r\n', qd.util.getNodeValue(code), qd.util.getNodeValue(error));
        });

        return errors;
    }

    function SwapDomWithDocument(params) {
        var cf = params.commonFunction;

        function getDocument(xPathEngine, getDocumentConnectionName, docid, getDocumentWrapper, version) {

            getDocumentWrapper.docId(docid);

            //If version is included, we will assume a GetDocumentVersion data connection
            if (version) {
                getDocumentWrapper.version(version);
            }

            return getDocumentWrapper.executeAsync()
                .then(function () {
                    var resultNode = cf.checkValidNode(getDocumentWrapper.resultNode(), 'Unable to locate GetDocumentResult node');
                    var successNode = cf.checkValidNode(getDocumentWrapper.successNode(), 'Unable to locate Success node');

                    if (qd.util.getNodeValue(successNode) !== 'true') {
                        // TODO: fix buildErrorList
                        throw new Error(buildErrorList(xPathEngine, resultNode));
                    }
                });
        }

        function createDocument(rootNode) {
            var doc = $.parseXML("<n />");

            doc.removeChild(doc.documentElement);
            doc.appendChild(rootNode.cloneNode(true));

            return doc;
        }

        /**
         * Upgrades the provided node using the template's upgrade settings, if they are specified
         * @param newDoc - The XML element representing the root element of the document to upgrade
         * @returns the root element of the upgraded document, or newDoc if no upgrade settings are specified
         */
        function tryToUpgradeAsync(newDoc) {
            // Case 40517 Implement Upgrade
            return Q()
                .then(function () {
                    var info = params.template.getUpgradeSettings();

                    if (info && info.type === 'transform') {
                        var inputDoc = createDocument(newDoc);

                        return cf.getTransformNew(info.transform)
                            .then(function (transform) {
                                var transformed = transform.transform(inputDoc, { functions: cf.xpathFunctions() }),
                                    docEl = transformed && transformed.documentElement;

                                if (!docEl) {
                                    throw new Error("Unable to locate root element of upgraded document.");
                                }

                                return docEl;
                            });
                    }

                    return newDoc;
                })
                .catch(function (e) {
                    throw new Error("An error occurred trying to upgrade the document: " + e.message, e);
                });
        }

        function replaceDom(xPathEngine, getDocumentWrapper, upgradeDocument) {
            cf.checkValidNode(getDocumentWrapper.contentNode(), 'Unable to find Content element');
            var newDoc = cf.checkValidNode(getDocumentWrapper.documentRoot(), 'Unable to locate contents of document to swap');

            return Q()
                .then(function () {
                    return upgradeDocument
                        ? tryToUpgradeAsync(newDoc)
                        : newDoc;
                })
                .then(function (docToInsert) {
                    var mainDataSource = params.dataSources.getDataSource(''),
                        mainDom = cf.getDataSource(null),
                        root = cf.getValidNode(mainDom, '/*', 'Unable to locate main document root'),
                        rootNode = root.getNode();

                    // Replace main DOM with obtained document.
                    return cf.setIsSwappingDom(true)
                        .then(function () {
                            root.childNodes().forEach(function (childNode) {
                                childNode.deleteSelf();
                            });

                            Array.prototype.forEach.call(docToInsert.childNodes, function (childNode) {
                                rootNode.appendChild(childNode.cloneNode(true));
                            });

                            var attributeNodes = selectNodeListFromXPathEngine(xPathEngine, docToInsert, '@*');

                            return qd.util.runPromiseSequence(attributeNodes,
                                function (lastResult, attrib) {
                                    var matchingAttribute = root.selectSingle(String.format('@{0}', attrib.localName));

                                    if (matchingAttribute) {
                                        matchingAttribute.setValueAsync(attrib.value());
                                    }
                                    //TODO: Add attribute if they are missing?
                                });
                        })
                        .then(function () {
                            //assign ids.
                            mainDataSource.assignIds(rootNode);
                        })
                        .finally(function () {
                            return cf.setIsSwappingDom(false);
                        })
                        .catch(function (e) {
                            console.error('Error swapping DOM', e);
                            throw new Error(domSwapFailed);
                        });

                });
        }

        function setFormPi(docIdInt, getDocumentWrapper) {
            var mainDataSource = cf.getDataSource(null);

            cf.setDocumentIdToDbxlPi(mainDataSource.getNode(), docIdInt, '',
                getDocumentWrapper.name(),
                getDocumentWrapper.author(),
                getDocumentWrapper.description());
        }

        function executeAsync() {
            var getDocumentConnection = cf.getParamValue(constants.paramGetDocument),
                docid = cf.getParamValue(constants.paramDocId),
                version = cf.getParamValue(constants.paramVersion),
                upgrade = cf.getBoolParamValue(constants.paramUpgradeDocument),
                docIdInt = parseInt(docid);

            if (Number.isNaN(docIdInt)) {
                throw new Error(String.format(invalidDocIdFormat, docid));
            }

            var xPathEngine = createXPathEngine();

            var getDocumentDs = cf.getDataSource(getDocumentConnection),
                getDocumentConn = cf.getDataConnection(getDocumentConnection),
                getDocumentWrapper = Qd.FormsViewer.qRules.getDocumentWrapper(getDocumentDs, getDocumentConn);

            return getDocument(xPathEngine, getDocumentConnection, docid, getDocumentWrapper, version)
                .then(function () {
                    return replaceDom(xPathEngine, getDocumentWrapper, upgrade);
                })
                .then(function () {
                    setFormPi(docIdInt, getDocumentWrapper);
                })
                .then(function () {
                    return {
                        Success: true
                    };
                });
        }

        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters
        }
    }

    return SwapDomWithDocument;
})(Qd);