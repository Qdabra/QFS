var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.DataConnections = Qd.FormsViewer.DataConnections || {};

(function (fv, dc) {
    "use strict";

    var queryConnectionTypes = ["xmlFile", "shpList"];

    function dataConnectionFactory(api, shpAccess, template, xpathEngine, dataSources) {

        function getAdapter(definition) {
            var adapterDef = definition;

            switch (adapterDef.type) {
                case "xmlFile":
                    return dc.xmlFileAdapter(adapterDef, api, shpAccess, template);
                case "shpList":
                    return dc.shpListAdapter(adapterDef, template, shpAccess, api);
                case "webService":
                    return dc.soapAdapter(adapterDef, template, api, xpathEngine, dataSources);
                case "dav":
                    return dc.sharePointSubmitAdapter(adapterDef, template, xpathEngine, shpAccess, dataSources, api);
                case "udcx":
                    var dcFactory = dataConnectionFactory(api, shpAccess, template, xpathEngine, dataSources);
                    return dc.udcxFileAdapter(adapterDef, dcFactory, template, shpAccess, api);
                case "ado":
                    return dc.adoAdapter(adapterDef, dataSources, api);
            }

            console.warn("Unknown adapter type: " + definition.type);
            return null;
        }

        function isQueryAdapter(definition) {
            var type = definition.type;

            return queryConnectionTypes.indexOf(type) !== -1 ||
                (type === "webService" && definition.queryAllowed);
        }

        function makeDataConnection(name, type, definition) {
            var adapter = getAdapter(definition),
                isQuery = isQueryAdapter(definition),
                dataSource = dataSources.getDataSource(name);

            function setUrl(queryUrl) {
                if (adapter.setUrl) {
                    return adapter.setUrl(queryUrl);
                }

                throw new Error("Adapter " + name + ' does not support changing its url.');
            }

            function setUrlAndListId(siteUrl, listId) {
                if (adapter.setUrlAndListId) {
                    return adapter.setUrlAndListId(siteUrl, listId);
                }
            }

            function initAsync() {
                if (adapter.initAsync) {
                    return adapter.initAsync(dataSource)
                        .then(function () {

                            //Check and assign adapter to its underlying adapter for udcxFileAdapter
                            if (adapter.getAdapter) {
                                adapter = adapter.getAdapter();
                            }

                            if (dataSource) {
                                dataSource.reassignIds();
                            }
                        });
                }

                return Q();
            }

            function executeQueryAsync() {
                var argsAry = Array.prototype.slice.call(arguments);

                return adapter.executeAsync
                    .apply(adapter, [].concat(dataSource, argsAry))
                    .then(function () {
                        dataSource.reassignIds();
                    });
            }

            function executeSubmitAsync() {
                return adapter.executeAsync.apply(adapter, arguments);
            }

            function executeAsync() {
                var fun = isQuery ? executeQueryAsync : executeSubmitAsync;

                return fun.apply(null, arguments);
            }

            function getUrl() {
                if (adapter.getUrl) {
                    return adapter.getUrl();
                }

                throw new Error("Adapter " + name + ' does not support getting its url.');
            }

            function getCommandText() {
                if (adapter.getCommandText) {
                    return adapter.getCommandText();
                }

                throw new Error("Adapter " + name + ' does not support getting its command text.');
            }

            function setCommandText(commandString) {
                if (adapter.setCommandText) {
                    return adapter.setCommandText(commandString);
                }

                throw new Error("Adapter " + name + ' does not support setting its command text.');
            }

            function isAdoSupported() {
                return !!adapter.isAdoSupported;
            }

            if (!adapter) {
                console.warn('Failed to create data connection. Could not create adapter.');
                return null;
            }

            return {
                name: name,
                initAsync: initAsync,
                executeAsync: executeAsync,
                dataSource: dataSource,
                setUrl: setUrl,
                setUrlAndListId: setUrlAndListId,
                type: type,
                getUrl: getUrl,
                getCommandText: getCommandText,
                setCommandText: setCommandText,
                isAdoSupported: isAdoSupported
            };
        }

        // interface
        return {
            makeDataConnection: makeDataConnection
        };
    }

    dc.dataConnectionFactory = dataConnectionFactory;
})(Qd.FormsViewer, Qd.FormsViewer.DataConnections);