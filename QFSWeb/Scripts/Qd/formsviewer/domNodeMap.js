var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};

// object for storing an id => node mapping for quick retrieval of nodes based on a single value
Qd.FormsViewer.domNodeMap = (function () {
    "use strict";

    function create(dataSourceName) {
        var map = {},
            nextId = 0,
            ap = Array.prototype;

        function getNode(id) {
            return map[id];
        }

        function setId(node) {
            var id = "N" + nextId;

            FVUtil.setNodeData(node, "fvUid", id);
            if (dataSourceName) {
                FVUtil.setNodeData(node, "fvDs", dataSourceName);
            }
            map[id] = node;

            nextId += 1;
        }

        function purgeNodes() {
            map = {};
        }

        function addNode(node) {
            var curVal = FVUtil.getNodeData(node, "fvUid");

            if (!(curVal && (getNode(curVal) === node))) {
                setId(node);
            }
        }

        function assignIds(node) {
            function assignInner(n) {
                var children = ap.slice.call(n.childNodes || []),
                    attribs = ap.slice.call(n.attributes || []);

                addNode(n);

                children.concat(attribs).forEach(assignInner);
            }

            assignInner(node);
        }

        return {
            addNode: addNode,
            getNode: getNode,
            assignIds: assignIds,
            //getDsName: getDsName,
            purgeNodes: purgeNodes
        };
    }

    return {
        create: create
    };
})();
