var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.DataConnections = Qd.FormsViewer.DataConnections || {};

Qd.FormsViewer.DataConnections.adoAdapter = (function () {
    "use strict";

    var dNs = 'http://schemas.microsoft.com/office/infopath/2003/ado/dataFields',
        dfsNs = dc.utils.dfsNs,
        baseXml = '<dfs:myFields xmlns:dfs="' + dfsNs + '" />',
        xml = $.parseXML(baseXml),
        dataFieldsElement = "<dfs:dataFields xmlns:dfs='" + dfsNs + "'/>";

    function adoAdapter(adapter, template, xpathEngine, shpAccess, dataSources, api) {

        var commandText = adapter.commandText;

        function makeXmlItem(nodeName, valueItem, dom) {
            var el = dom.createElementNS(dNs, "d:" + nodeName);

            Object.keys(valueItem)
                .forEach(function myfunction(key) {
                    if (el.setAttribute)
                        el.setAttribute(key, valueItem[key]);
                });

            return el;
        }

        function qfsListToXml(data) {
            var dom = $.parseXML(dataFieldsElement),
                docEl = dom.documentElement;

            data.Data.forEach(function (item) {
                docEl.appendChild(makeXmlItem(data.NodeName, item, dom));
            });

            return docEl;
        }

        function executeAsync() {
            return api.executeAdoAdapterAsync(adapter.connectionString, commandText)
                .then(function (data) {
                    if (!data || !data.Success) {
                        throw data.Error;
                    }

                    var childNodes = qfsListToXml(data),
                        dataSource = dataSources.getDom(adapter.name),
                        dsNode = dataSource.selectSingle('dfs:myFields'),
                        existingNodes = dsNode.selectNodes('*/d:' + data.NodeName);

                    if (existingNodes.length) {
                        existingNodes.forEach(function (node) {
                            node.deleteSelf();
                        });
                    }

                    return dsNode.appendChildAsync(childNodes);
                });
        }

        function initAsync(dataSource) {
            dataSource.setDom(xml);
            return Q.Promise.resolve();
        }

        function getCommandText() {
            return commandText;
        }

        function setCommandText(commandString) {
            commandText = commandString;
        }

        return {
            executeAsync: executeAsync,
            initAsync: initAsync,
            getCommandText: getCommandText,
            setCommandText: setCommandText
        };
    }

    return adoAdapter;
}());