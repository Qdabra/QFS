var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.DataConnections = Qd.FormsViewer.DataConnections || {};

Qd.FormsViewer.DataConnections.udcxFileAdapter = (function (qd, dc) {
    'use strict';

    function createXPathEngine() {
        var xPathEngine = new XPathEngine(),
            nsr = new FVNamespaceResolver();

        nsr.addNamespace("udc", "http://schemas.microsoft.com/office/infopath/2006/udc");

        xPathEngine.nsr = nsr;

        return xPathEngine;
    }

    function selectNodeListFromXPathEngine(xPathEngine, node, xPath) {
        var nodeList = xPathEngine.evaluateXPath(xPath, {
            context: node
        }).toArray();

        return nodeList;
    }

    function selectNodeFromXPathEngine(xPathEngine, xPath, context, errorMessage) {
        var nodeList = selectNodeListFromXPathEngine(xPathEngine, context, xPath);

        var node = nodeList.length > 0
            ? nodeList[0]
            : null;

        if (!node && errorMessage) {
            throw new Error(errorMessage);
        }

        return node;
    }

    function getAdapterType(localName) {
        switch (localName) {
            case 'davAdapter':
                return 'dav';
            case 'sharepointListAdapterRW':
                return 'shpList';
            case 'webServiceAdapter':
                return 'webService';
            case 'xmlFileAdapter':
                return 'xmlFile';
            default:
                return '';
        }
    }

    function udcxFileAdapter(definition, dcFactory, template, shpAccess, qfsAccess) {
        var source = definition.source,
            sc = definition.siteCollection,
            adapter = null,
            connectionPath = '/*/udc:ConnectionInfo/',
            selectCommandPath = 'udc:SelectCommand/';

        function assignSharePointProperties(xpathEngine, xmlNode) {
            var basePath = connectionPath + selectCommandPath,
                listIdNode = selectNodeFromXPathEngine(xpathEngine, basePath + 'udc:ListId', xmlNode),
                webUrlNode = selectNodeFromXPathEngine(xpathEngine, basePath + 'udc:WebUrl', xmlNode),
                listId = listIdNode
                ? qd.util.getNodeValue(listIdNode)
                : '',
                webUrl = webUrlNode
                ? qd.util.getNodeValue(webUrlNode)
                : '';

            definition.listId = listId;
            definition.siteURL = webUrl;

            //TODO:Assign relListUrl ?
        }

        function assignWebProperties(xpathEngine, xmlNode) {
            var selectCommandPath = 'udc:SelectCommand/',
                basePath = connectionPath + selectCommandPath,
                wsdlUrlnode = selectNodeFromXPathEngine(xpathEngine, connectionPath + 'udc:WsdlUrl', xmlNode),
                serviceUrlNode = selectNodeFromXPathEngine(xpathEngine, basePath + 'udc:ServiceUrl', xmlNode),
                soapActionNode = selectNodeFromXPathEngine(xpathEngine, basePath + 'udc:SoapAction', xmlNode);

            definition.wsdlUrl = wsdlUrlnode ? qd.util.getNodeValue(wsdlUrlnode) : '';
            definition.serviceUrl = serviceUrlNode ? qd.util.getNodeValue(serviceUrlNode) : '';
            definition.soapAction = soapActionNode ? qd.util.getNodeValue(soapActionNode) : '';

            //TODO:Assign methodName ?
        }

        function assignAdapterProperties(adapterType, xpathEngine, xmlNode) {
            switch (adapterType) {
                case 'shpList':
                    assignSharePointProperties(xpathEngine, xmlNode);
                    return;
                case 'webService':
                    assignWebProperties(xpathEngine, xmlNode);
                    return;
                default:
                    return;
            }
        }

        function parseUdcxContents(xmlData) {
            var xmlNode = $.parseXML(xmlData),
                xpathEngine = createXPathEngine(),
                adapterType = getAdapterType(definition.localName);

            assignAdapterProperties(adapterType, xpathEngine, xmlNode);

            definition.type = adapterType;
        }

        function initAsync(dataSource) {
            var udcxPath = sc + source,
                isAppOnlyMode = SharePointAccess.isAppOnlyMode;

            return Q()
                .then(function () {
                    if (!isAppOnlyMode) {
                        return shpAccess.getDocumentAsync(udcxPath);
                    }

                    return qfsAccess.getUdcxContents(udcxPath);
                })
                .then(function (data) {
                    if (isAppOnlyMode) {
                        if (data && data.Success) {
                            parseUdcxContents(data.Data);
                        }
                        else {
                            throw new Error(data.Error);
                        }
                    }
                    else {
                        parseUdcxContents(data);
                    }
                })
                .then(function () {
                    adapter = dcFactory.makeDataConnection(definition.name, definition.type, definition);

                    if (adapter && adapter.initAsync) {
                        return adapter.initAsync(dataSource);
                    }
                });
        }

        function executeAsync() {
            if (!adapter || !adapter.executeAsync) {
                return Q.Promise.resolve();
            }

            return adapter.executeAsync();
        }

        return {
            initAsync: initAsync,
            executeAsync: executeAsync
        };
    }

    return udcxFileAdapter;

})(Qd, Qd.FormsViewer.DataConnections);