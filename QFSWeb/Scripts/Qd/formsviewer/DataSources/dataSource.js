var Qd = Qd || {},
    fv = Qd.FormsViewer = Qd.FormsViewer || {},
    ds = fv.DataSources = fv.DataSources || {};

(function (fv, ds) {
    "use strict";

    function dataSource(options) {
        var name = options.name,
            initOnLoad = !!options.initOnLoad,
            domNodeMap = fv.domNodeMap.create(name),
            dom = options.initialDom;

        function getNodeById(id) {
            return domNodeMap.getNode(id);
        }

        function reassignIds() {
            domNodeMap.purgeNodes();
            domNodeMap.assignIds(dom);
        }

        function setDom(domNode) {
            dom = domNode;
        }

        function getDom() {
            return dom;
        }

        function assignIds(node) {
            domNodeMap.assignIds(node);
        }

        // interface
        return {
            name: name,
            initOnLoad: initOnLoad,
            setDom: setDom,
            getDom: getDom,
            reassignIds: reassignIds,
            getNodeById: getNodeById,
            assignIds: assignIds
        };
    }

    ds.dataSource = dataSource;
})(fv, ds);

