var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};

// TODO: find a smaller subset of values to pass in rather than the entire FormsViewer app
(function(fv) {

    function objectModel(engine) {

        function resetFileValueCacheValues(field) {
            var fcf = fv.Constants.Files;

            if (FVUtil.getNodeData(field, fcf.FileNameProperty)) {
                FVUtil.setNodeData(field, fcf.FileNameProperty, null);
                FVUtil.setNodeData(field, fcf.FileSizeProperty, null);
            }
        }

        function setNodeValueAsync(node, value) {
            resetFileValueCacheValues(node);
            return engine.updateDomNodeAsync(node, value);
        }

        function getNodeById(nodeId) {
            return engine.getNodeForNodeId(nodeId);
        }

        return {
            getNodeById: getNodeById,
            setNodeValueAsync: setNodeValueAsync
        };

    };

    fv.objectModel = objectModel;

})(Qd.FormsViewer);
