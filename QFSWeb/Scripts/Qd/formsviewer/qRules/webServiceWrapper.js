(function (qRules) {
    "use strict";

    var xPathEngine = XPathEngine,
        namespaceResolver = FVNamespaceResolver;

    function createXPathEngine(namespaces) {
        var xpe = new xPathEngine(),
            nsr = new namespaceResolver();

        nsr.addNamespace("dfs", "http://schemas.microsoft.com/office/infopath/2003/dataFormSolution");

        if (namespaces) {
            Object.keys(namespaces).forEach(function (key) {
                nsr.addNamespace(key, namespaces[key]);
            });
        }

        xpe.nsr = nsr;

        return xpe;
    }

    function webServiceWrapper(dataSource, dataConnection, namespaces, methodNames) {
        var xpe = createXPathEngine(namespaces),
            serviceNamespaces = namespaces && Object.keys(namespaces),
            methodNameArr = [].concat(methodNames),
            root = dataSource.getNode();

        function selectNodes(start, path) {
            return xpe.evaluateXPath(path, { context: start }).toArray();
        }

        function selectNode(start, path) {
            return selectNodes(start, path)[0];
        }

        function dfsQueryFields() {
            return selectNode(root, "/dfs:myFields/dfs:queryFields");
        }

        function dfsDataFields() {
            return selectNode(root, "/dfs:myFields/dfs:dataFields");
        }

        function getServiceElements(start, name) {
            if (!start) {
                return [];
            }

            if (!serviceNamespaces) {
                return selectNode(start, name);
            }

            var pred = serviceNamespaces
                .map(function (pref) { return "self::" + pref + ":" + name; })
                .join(" or ");
            var path = "*[" + pred + "]";

            return selectNodes(start, path);
        }

        function getServiceElement(start, name) {
            return getServiceElements(start, name)[0];
        }

        function getServiceElementValue(start, name) {
            var se = getServiceElement(start, name);

            return se ? qd.util.getNodeValue(se) : null;
        }

        function setServiceElementValue(start, name, value) {
            var se = getServiceElement(start, name);

            if (se) {
                qd.util.setNodeValue(se, value);
            }
        }

        function findByMethodName(start, suffix) {
            return methodNameArr.reduce(function (prev, name) {
                return prev || getServiceElement(start, name + suffix);
            }, null);
        }

        function queryFieldsNode() {
            return findByMethodName(dfsQueryFields(), "");
        }

        function responseNode() {
            return findByMethodName(dfsDataFields(), "Response");
        }

        function resultNode() {
            return findByMethodName(responseNode(), "Result");
        }

        function setQueryField(name, value) {
            setServiceElementValue(queryFieldsNode(), name, value);
        }

        function executeAsync() {
            return dataConnection.executeAsync();
        }

        return {
            setQueryField: setQueryField,
            selectNode: selectNode,
            getServiceElements: getServiceElements,
            getServiceElement: getServiceElement,
            getServiceElementValue: getServiceElementValue,

            queryFieldsNode: queryFieldsNode,
            responseNode: responseNode,
            resultNode: resultNode,

            executeAsync: executeAsync
        };
    }

    qRules.webServiceWrapper = webServiceWrapper;
})(qd.qRules);