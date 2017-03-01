var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.SubmitToDbxl = (function (qd) {
    'use strict';

    var optionalParameters = [{
        name: 'doctype',
        description: 'Allows you to explicitly specify the doc type to submit to. This is necessary when the template is going to be accessed from somewhere other than DBXL (like SharePoint) or when you’re submitting a data source other than the main data source.'
    },
    {
        name: 'docid',
        description: 'DocID of the document you are submitting. If not provided, DBXL automatically assigns one.'
    },
    {
        name: 'key',
        description: 'If submitting via the SubmitDocumentWithKey web method, the key parameter must be provided.'
    },
    {
        name: 'user',
        description: 'If submitting via the SubmitDocumentAsUser web method, the user parameter must be provided.'
    },
    {
        name: 'name',
        description: 'Form name'
    },
    {
        name: 'author',
        description: 'Form author'
    },
    {
        name: 'desc',
        description: 'Form description'
    },
    {
        name: 'dsname',
        description: 'Allows you to submit a datasource other than the main data source to DBXL. This can be used when you have child doc types and have added their XML as a 2ds'
    },
    {
        name: 'timeout',
        description: 'Allows you to enter the timeout in secs. This can be used if you have large documents to submit to DBXL'
    },
    {
        name: 'xpath',
        description: 'XPath to XML-tree node(s) to submit, if you are submitting only a portion of the xml'
    },
    {
        name: 'doctypexpath',
        description: 'Relative XPath to submit doc type value; overrides /doctype param'
    },
    {
        name: 'docidxpath',
        description: 'Relative XPath to submit DocID value'
    },
    {
        name: 'keyxpath',
        description: 'Relative XPath to submit key value'
    },
    {
        name: 'namexpath',
        description: 'Relative XPath to Name value; overrides /name param'
    },
    {
        name: 'authorxpath',
        description: 'Relative XPath to Author value; overrides /author param'
    },
    {
        name: 'descxpath',
        description: 'Relative XPath to Description value; overrides /desc param'
    },
    {
        name: 'resultdocidxpath',
        description: 'Relative XPath to store DocID value returned from successful submit'
    },
    {
        name: 'resultrefidxpath',
        description: 'Relative XPath to store RefID value returned from successful submit'
    }],
    requiredParameters = [{
        name: 'submit',
        description: 'Name of the query (receive) data connection to DBXL'
    }],
    submittodbxlErrorIncorrectSubmitAdapterSubmitdocumentWithKey = "The submit adapter must use the SubmitDocumentWithKey web method when using submit keys.",
    submittodbxlErrorIncorrectSubmitAdapterSubmitdocumentAsUser = "The submit adapter must use the SubmitDocumentAsUser web method when submitting as a specific user.",
    submittodbxlErrorIncorrectSubmitAdapterSubmitdocument = "The submit adapter must use the SubmitDocument web method when not using submit keys or submitting as another user.",
    submittodbxlErrorFailedToSelectNodeDoctype = "Failed to select the DocType node.",
    submittodbxlErrorFailedToSelectNodeDocid = "Failed to select the DocID node.",
    submittodbxlErrorFailedToSelectNodeKey = "Failed to select the Key node.",
    submittodbxlErrorFailedToSelectNodeName = "Failed to select the Name node.",
    submittodbxlErrorFailedToSelectNodeAuthor = "Failed to select the Author node.",
    submittodbxlErrorFailedToSelectNodeDesc = "Failed to select the Description node.",
    submitToDbxlErrorFailedToSelectNodeResultDocId = "Failed to select the Result DocID node.",
    submitToDbxlErrorFailedToSelectNodeResultRefId = "Failed to select the Result RefID node.";

    function verifyCorrectDbxlSubmitAdapter(commonFunction, submitSource, isKeySubmit, isUserSubmit) {
        var submitKey,
            erroMessage;

        if (isKeySubmit) {
            submitKey = 'SubmitDocumentWithKey';
            erroMessage = submittodbxlErrorIncorrectSubmitAdapterSubmitdocumentWithKey;
        }
        else if (isUserSubmit) {
            submitKey = 'SubmitDocumentAsUser';
            erroMessage = submittodbxlErrorIncorrectSubmitAdapterSubmitdocumentAsUser;
        }
        else {
            submitKey = 'SubmitDocument';
            erroMessage = submittodbxlErrorIncorrectSubmitAdapterSubmitdocument;
        }

        commonFunction.getValidNode(submitSource, String.format('//node()[local-name() = "{0}"]', submitKey), erroMessage);
    }

    function getNodeValueIfSpecified(commonFunction, currentValue, currentNode, path, errorMessage) {
        return !path
            ? currentValue
            : commonFunction.getValidNode(currentNode, path, errorMessage).value();
    }

    function getValidDocId(docId) {
        if (!docId) {
            return null;
        }

        var intValue = parseInt(docId);

        if (Number.isNaN(intValue) || intValue === 0) {
            return null;
        }

        return docId;
    }

    function SubmitToDbxl(params) {

        function buildDomFromNode(dom, node, docId) {
            var doc = $.parseXML(qd.util.xmlToString(node.getNode())),
                docElement = doc.documentElement,
                docParent = docElement.parentElement || docElement.ownerDocument,
                pis = params.commonFunction.getDataSource()
                .selectNodes("/processing-instruction()[local-name() != 'QdabraDBXL']");

            pis.forEach(function (pi) {
                var piNode = pi.getNode(),
                    piStr = qd.util.getNodeValue(piNode),
                    piNodeOwner = qd.util.ownerDocument(piNode);

                //if (piNode.localName === 'mso-infoPathSolution')//TODO:Check localName or nodeName ??
                if (piNode.nodeName === 'mso-infoPathSolution') {
                    var start = piStr.indexOf('solutionVersion'),
                        end = piStr.indexOf('"', start + 20) + 1;

                    piStr = piStr.substr(0, start) + piStr.substr(end);
                }

                //var piStrNode = $.parseXML(piStr);
                var piStrNode = piNodeOwner.createProcessingInstruction('mso-infoPathSolution', piStr);
                docParent.insertBefore(piStrNode, docElement);
            });

            // Add QdabraDBXL PI if DocID is present.
            if (docId) {
                var qdabraPi = doc.createProcessingInstruction('QdabraDBXL', String.format('docid="{0}"', docId));
                docParent.insertBefore(qdabraPi, docElement);
            }

            return doc;
        }

        function executeAsync() {
            var commonFunction = params.commonFunction,
                utilities = params.utilities,
                submit = commonFunction.getParamValue('submit'),
                docType = commonFunction.getParamValue('doctype', ''),
                dsname = commonFunction.getParamValue('dsname'),
                docId = commonFunction.getParamValue('docid'),
                key = commonFunction.getParamValue('key'),
                userName = commonFunction.getParamValue('user'),
                name = commonFunction.getParamValue('name', ''),
                author = commonFunction.getParamValue('author', ''),
                desc = commonFunction.getParamValue('desc', ''),
                xpath = commonFunction.getParamValue('xpath'),
                doctypexpath = commonFunction.getParamValue('doctypexpath'),
                docIdxpath = commonFunction.getParamValue('docidxpath'),
                keyxpath = commonFunction.getParamValue('keyxpath'),
                namexpath = commonFunction.getParamValue('namexpath'),
                authorxpath = commonFunction.getParamValue('authorxpath'),
                descxpath = commonFunction.getParamValue('descxpath'),
                resultdocIdxpath = commonFunction.getParamValue('resultdocidxpath'),
                resultrefidxpath = commonFunction.getParamValue('resultrefidxpath'),
                timeout = commonFunction.getIntParamValue('timeout'),
                refid,
                isKeySubmit = !!key || !!keyxpath,
                isUserSubmit = !!userName;

            commonFunction.verifySecondaryDataSource(submit);

            var submitConnection = params.dataConnections.get(submit),
                submitSource = commonFunction.getDataSource(submit);

            verifyCorrectDbxlSubmitAdapter(commonFunction, submitSource, isKeySubmit, isUserSubmit);

            var qrules = Qd.FormsViewer.qRules,
                submitDocumentObj = qrules.submitDocument.standard(submitSource, submitConnection),
                submitDocumentAsUserObj = utilities.submitDocumentAsUser(submitSource.getNode(), submitConnection),
                submitDocumentWithKeyObj = qrules.submitDocument.withKey(submitSource, submitConnection),
                dom = commonFunction.getDataSource(dsname);

            if (timeout > 0) {
                submitConnection.timeOut = timeout;
            }

            var nodes = xpath
                ? commonFunction.getValidNodeSet(dom, xpath)
                : [dom];

            return qd.util.runPromiseSequence(nodes,
                    function(lastResult, node) {
                        if (lastResult && lastResult.shouldStop) {
                            return lastResult;
                        } else {
                            if (nodes.length > 1) {
                                // These values must be unique if there is more than one row being submitted.
                                docId = null;
                                key = null;
                            }

                            docType = getNodeValueIfSpecified(commonFunction, docType, node, doctypexpath, submittodbxlErrorFailedToSelectNodeDoctype);
                            docId = getNodeValueIfSpecified(commonFunction, docId, node, docIdxpath, submittodbxlErrorFailedToSelectNodeDocid);
                            key = getNodeValueIfSpecified(commonFunction, key, node, keyxpath, submittodbxlErrorFailedToSelectNodeKey);
                            name = getNodeValueIfSpecified(commonFunction, name, node, namexpath, submittodbxlErrorFailedToSelectNodeName);
                            author = getNodeValueIfSpecified(commonFunction, author, node, authorxpath, submittodbxlErrorFailedToSelectNodeAuthor);
                            desc = getNodeValueIfSpecified(commonFunction, desc, node, descxpath, submittodbxlErrorFailedToSelectNodeDesc);
                            docId = getValidDocId(docId);

                            var subdom = xpath
                                ? buildDomFromNode(dom, node, docId)
                                : dom.getNode();

                            return Q()
                                .then(function() {
                                    var xmlStr = qd.util.xmlToString(subdom);

                                    if (isKeySubmit) {
                                        return submitDocumentWithKeyObj.querySubmitDocumentWithKey(docType, xmlStr, name, author, desc, key);
                                    }

                                    if (isUserSubmit) {
                                        return submitDocumentAsUserObj.querySubmitDocumentAsUser(docType, userName, xmlStr, name, author, desc);
                                    }

                                    return submitDocumentObj.querySubmitDocument(docType, xmlStr, name, author, desc);
                                })
                                .then(function(result) {
                                    if (result.success) {

                                        commonFunction.setDocumentIdToDbxlPi(subdom, parseInt(result.docId), docType, name, author, desc);

                                        return {
                                            docId: result.docId,
                                            refId: result.refId
                                        };
                                    }

                                    throw new Error(result.error || 'An unspecified error occurred');
                                })
                                .then(function(result) {
                                    docId = result.docId;
                                    refid = result.refId;

                                    if (!resultdocIdxpath) {
                                        return;
                                    }

                                    var docIdNode = commonFunction.getValidNode(node, resultdocIdxpath, submitToDbxlErrorFailedToSelectNodeResultDocId);
                                    if (!docIdNode) {
                                        return;
                                    }

                                    return docIdNode.setValueAsync(docId);
                                })
                                .then(function() {
                                    if (!resultrefidxpath) {
                                        return;
                                    }
                                    var refIdNode = commonFunction.getValidNode(node, resultrefidxpath, submitToDbxlErrorFailedToSelectNodeResultRefId);

                                    if (!refIdNode) {
                                        return;
                                    }
                                    return refIdNode.setValueAsync(refid);
                                });
                        }
                    })
                .then(function() {
                    var resultObject = {
                        Success: !!docId
                    };

                    if (!xpath) {
                        resultObject['Result'] = docId;
                    }

                    return resultObject;
                })
                .catch(function(e) {
                    console.error(e);
                    throw e;
                });
        }

        return {
                executeAsync: executeAsync,
                optionalParameters: optionalParameters,
                requiredParameters: requiredParameters
            };
    }

    return SubmitToDbxl;
    }) (Qd);