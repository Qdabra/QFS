var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.DataConnections = Qd.FormsViewer.DataConnections || {};

Qd.FormsViewer.DataConnections.adoAdapter = (function () {
    "use strict";

    var dNs = 'http://schemas.microsoft.com/office/infopath/2003/ado/dataFields',
        dfsNs = dc.utils.dfsNs,
        baseXml = '<dfs:myFields xmlns:dfs="' + dfsNs + '" />',
        dataFieldsElement = "<dfs:dataFields xmlns:dfs='" + dfsNs + "'/>";

    function getBaseXmlNode() {
        return $.parseXML(baseXml);
    }

    function adoAdapter(adapter, dataSources, api) {

        var commandText = adapter.commandText;

        function makeXmlItem(nodeName, valueItem, dom) {
            var el = dom.createElementNS(dNs, "d:" + nodeName);

            Object.keys(valueItem)
                .forEach(function (key) {
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
                        dsNode = dataSource.selectSingle('dfs:myFields');

                    return dsNode.setContentAsync(childNodes);
                });
        }

        function initAsync(dataSource) {
            dataSource.setDom(getBaseXmlNode());
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
            setCommandText: setCommandText,
            isAdoSupported: true
        };
    }

    return adoAdapter;
}());