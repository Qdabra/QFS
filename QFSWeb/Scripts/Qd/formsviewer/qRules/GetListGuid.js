var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.GetListGuid = (function (qd) {
    "use strict";

    var cnt = qd.FormsViewer.qRules.Constants,
        optionalParameters = [],
        requiredParameters = [{
            name: cnt.paramDsName,
            description: "The data connection to the GetListCollection method of the Lists web service."
        },
        {
            name: cnt.paramListName,
            description: "The name of the list to return the GUID for"
        }];

    function GetListGuid(params) {
        var cf = params.commonFunction;

        function executeAsync() {
            var dsName = cf.getParamValue(cnt.paramDsName),
                shpAccess = params.shpAccess;

            cf.verifyDataConnectionExists(dsName);

            var listName = cf.getParamValue(cnt.paramListName),
                dc = params.dataConnections,
                listConn = dc.get(dsName),
                connUrl = listConn.getUrl(),
                siteUrl = connUrl.replace('_vti_bin/Lists.asmx', '');

            return shpAccess.getListIdByNameAsync(siteUrl, listName)
                .then(function (data) {
                    return {
                        Result: data,
                        Success: true
                    };
                })
                .catch(function (e) {
                    return {
                        Error: "Failed to get GUID for list: " + (e.message || listName)
                    };
                });
        }

        return {
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters,
            executeAsync: executeAsync
        };
    }

    return GetListGuid;
})(Qd);