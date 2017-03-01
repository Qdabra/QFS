var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.DataSources = Qd.FormsViewer.DataSources || {};

(function (qd, fv, ds) {
    "use strict";

    function dataSourceCollection(sources, xpathEngine) {
        var _listener,
            sourceMap = qd.util.makeAssoc(sources, function (source) {
                return source.name;
            });

        function checkExists(source, name) {
            if (!source) {
                throw new Error("Unknown data source: " + name);
            }
        }

        function getDataSource(name) {
            return sourceMap[name];
        }

        function makeDsNode(node, source) {
            return node
                ? ds.dataSourceNode(node, source, xpathEngine, _listener)
                : null;
        }

        function getNodeById(nodeId) {
            var dsName = nodeId.ds || '';
            var source = getDataSource(dsName),
                node = source && source.getNodeById(nodeId.id);

            checkExists(source, dsName);

            return node ? makeDsNode(node, source) : null;
        }

        function setListener(listener) {
            _listener = listener;
        }

        /**
         * Returns a dataSourceNode for the specified data source name
         * @param [name] - The name of the data source. If unspecified or blank, returns the main data source.
         * @returns - a dataSourceNode positioned at the root of the data source
         */
        function getDom(name) {
            name = name || '';
            var ds = getDataSource(name);

            checkExists(ds, name);

            return makeDsNode(ds.getDom(), ds);
        }

        function getMainDocumentElement() {
            var mds = getDataSource(''),
                node = qd.util.getDocumentElement(mds.getDom());

            return makeDsNode(node, mds);
        }

        function selectNodes(path) {
            return getDom().selectNodes(path);
        }

        function getAll() {
            return sources.slice();
        }

        // interface
        return {
            getAll: getAll,
            getDataSource: getDataSource,
            getDom: getDom,
            getNodeById: getNodeById,
            setListener: setListener,
            selectNodes: selectNodes,
            getMainDocumentElement: getMainDocumentElement
        };
    }

    fv.dataSourceCollection = dataSourceCollection;

})(Qd, Qd.FormsViewer, Qd.FormsViewer.DataSources);

