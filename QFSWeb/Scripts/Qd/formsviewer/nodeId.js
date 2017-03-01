var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};

// Represents an identifier for a data source node
(function (fv) {
    "use strict";

    fv.nodeId = {
        create: function(id, ds) {
            return {
                id: id,
                ds: ds
            };
        }
    };

})(Qd.FormsViewer);
