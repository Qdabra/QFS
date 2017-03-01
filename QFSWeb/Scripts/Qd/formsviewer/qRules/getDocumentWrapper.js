(function(qRules) {
    "use strict";

    var nses = {
        "qws": "http://qdabra.com/webservices/",
        "quk": "http://qdabra.com/querydbxldocumentwithuserkey"
    };

    function getDocumentWrapper(dataSource, dataConnection) {
        var wswrap = qd.qRules.webServiceWrapper(
            dataSource,
            dataConnection,
            nses,
            ['GetDocument', 'GetDocumentVersion']);

        function docInfoNode() {
            return wswrap.getServiceElement(wswrap.responseNode(), 'docInfo');
        }

        function contentNode() {
            return wswrap.getServiceElement(docInfoNode(), 'Content');
        }

        return {
            docId: function(value) {
                wswrap.setQueryField('docId', value);
            },
            version: function(value) {
                wswrap.setQueryField('version', value);
            },
            resultNode: wswrap.resultNode,
            successNode: function() {
                return wswrap.getServiceElement(wswrap.resultNode(), 'Success');
            },
            docInfoNode: docInfoNode,
            contentNode: contentNode,
            documentRoot: function() {
                return wswrap.selectNode(contentNode(), '*');
            },
            name: function() {
                return wswrap.getServiceElementValue(docInfoNode(), 'Name');
            },
            author: function() {
                return wswrap.getServiceElementValue(docInfoNode(), 'Author');
            },
            description: function() {
                return wswrap.getServiceElementValue(docInfoNode(), 'Description');
            },
            executeAsync: function() {
                return wswrap.executeAsync();
            }
        };
    }

    qRules.getDocumentWrapper = getDocumentWrapper;
})(qd.qRules);