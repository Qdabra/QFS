(function (qRules) {
    "use strict";

    function getOrSetValue(node, value) {
        if (node) {
            if (typeof value === 'undefined') {
                return qd.util.getNodeValue(node);
            }

            return qd.util.setNodeValue(node, value);
        }

        return null;
    }

    function dateIsoString(date) {
        return date.toISOString().substring(0, 19);
    }

    var nses = {
        "qws": "http://qdabra.com/webservices/",
        "quk": "http://qdabra.com/querydbxldocumentwithuserkey"
    };

    /**
     * @param dsRoot is a dataSourceNode for the root of the submit connection's data source
     * @param dataCon a dataConnection object for the DBXL submit connection
     * @param methodName the name of the submit method being used
     */
    function documentSubmitter(dsRoot, dataConn, methodName) {
        var wrapper = qd.qRules.webServiceWrapper(dsRoot, dataConn, nses, methodName);

        function getServiceElement(baseNode, elementName) {
            return wrapper.getServiceElement(baseNode, elementName);
        }

        function getOrSetServiceElement(baseNode, elementName, value) {
            return getOrSetValue(getServiceElement(baseNode, elementName), value);
        }

        function docTypeName(value) {
            wrapper.setQueryField('docTypeName', value);
        }

        function xml(value) {
            wrapper.setQueryField('xml', value);
        }

        function name(value) {
            wrapper.setQueryField('name', value);
        }

        function author(value) {
            wrapper.setQueryField('author', value);
        }

        function description(value) {
            wrapper.setQueryField('description', value);
        }

        function getError(exception) {
            if (exception) {
                return exception.message;
            }

            var errorNode = getServiceElement(wrapper.resultNode(), 'Errors'),
                errorValue = errorNode && qd.util.getNodeValue(errorNode);

            if (!errorNode || !errorValue) {
                return 'Error data unavailable';
            }

            return errorValue;
        }

        function failureResult(exception) {
            return {
                success: false,
                error: getError(exception)
            };
        }

        function performSubmitAsync() {
            return wrapper.executeAsync()
                .then(function () {
                    var res = wrapper.responseNode(),
                        docIdNode = getServiceElement(res, 'docId');

                    if (!docIdNode) {
                        return failureResult();
                    }

                    var docIdValue = qd.util.getNodeValue(docIdNode);

                    if (docIdValue === '-1') {
                        return failureResult();
                    }

                    var refIdNode = getServiceElement(res, 'refId');

                    if (!refIdNode) {
                        return failureResult();
                    }

                    return {
                        docId: docIdValue,
                        refId: qd.util.getNodeValue(refIdNode),
                        success: true
                    };
                })
                .catch(function (e) {
                    console.error(e);
                    return failureResult(e);
                });
        }

        return {
            performSubmitAsync: performSubmitAsync,
            queryFieldsNode: wrapper.queryFieldsNode,
            setQueryField: wrapper.setQueryField,
            getQueryFieldNode: function (nodeName) {
                return wrapper.getServiceElement(wrapper.queryFieldsNode(), nodeName);
            },
            getServiceElement: getServiceElement,
            getOrSetServiceElement: getOrSetServiceElement,
            docTypeName: docTypeName,
            xml: xml,
            name: name,
            author: author,
            description: description
        };
    }

    /**
     * @param dsRoot - a dataSourceNode for the root of the submit connection's data source
     * @param dataConn - a dataConnection object for the DBXL submit connection
     */
    function submitDocument(dsRoot, dataConn) {
        var submitter = documentSubmitter(dsRoot, dataConn, 'SubmitDocument');

        function querySubmitDocument(docType, xmlData, nameData, authorData, desc) {
            submitter.docTypeName(docType);
            submitter.xml(xmlData);
            submitter.name(nameData);
            submitter.author(authorData);
            submitter.description(desc);

            return submitter.performSubmitAsync();
        }

        return {
            querySubmitDocument: querySubmitDocument
        };
    }

    /**
     * @param dsRoot - a dataSourceNode for the root of the submit connection's data source
     * @param dataConn - a dataConnection object for the DBXL submit connection
     */
    function submitDocumentWithKey(dsRoot, dataConn) {
        var submitter = documentSubmitter(dsRoot, dataConn, 'SubmitDocumentWithKey');

        function documentType(value) {
            // field name is different from in standard SubmitDocument method
            return submitter.setQueryField('documentType', value);
        }

        function key(value) {
            var keyNode =
                    submitter.getQueryFieldNode('dockey') ||
                    submitter.getQueryFieldNode('key');

            return getOrSetValue(keyNode, value);
        }

        function clientDateTime(value) {
            return submitter.setQueryField('clientDateTime', value);
        }

        function querySubmitDocumentWithKey(docType, xmlString, nameValue, authorValue, desc, docKey) {
            documentType(docType);
            key(docKey);
            clientDateTime(dateIsoString(new Date()));

            submitter.xml(xmlString);
            submitter.name(nameValue);
            submitter.author(authorValue);
            submitter.description(desc);

            return submitter.performSubmitAsync();
        }

        return {
            querySubmitDocumentWithKey: querySubmitDocumentWithKey
        };
    }

    qRules.submitDocument = {
        standard: submitDocument,
        withKey: submitDocumentWithKey
    };

})(qd.qRules);