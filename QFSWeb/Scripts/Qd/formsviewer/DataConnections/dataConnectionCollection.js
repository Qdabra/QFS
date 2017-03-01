var Qd = Qd || {};

Qd.FormsViewer = Qd.FormsViewer || {},
Qd.FormsViewer.DataConnections = Qd.FormsViewer.DataConnections || {};

(function (qd, dc) {
    "use strict";

    function dataConnectionCollection(connections) {
        var connectionMap = qd.util.makeAssoc(connections, function (conn) {
            return conn.name;
        });

        function get(name) {
            return connectionMap[name];
        }

        function getAll() {
            return connections;
        }

        function exists(name) {
            return connectionMap.hasOwnProperty(name);
        }

        // interface
        return {
            get: get,
            getAll: getAll,
            exists: exists
        }
    }

    function IsInByPassProxyList(url) {
        // Set proxy list  here
        var list = [ ];
        // TODO: pull from external configuration
        // Example: (list must be in lowercase)
        // list = ["https://dbxl.yourdomain.com/", "https://yourservice.com/"];
        url = url.toLowerCase();
        var found = false;
        list.forEach(function (value, index) {
            if (url.startsWith(value)) {
                found = true;
            }
        });

        return found;
    }

    dc.dataConnectionCollection = dataConnectionCollection;
    dc.IsInByPassProxyList = IsInByPassProxyList;

})(Qd, Qd.FormsViewer.DataConnections);
