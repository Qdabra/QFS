var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.ModifySqlQuery = (function (qd) {
    "use strict";

    var cnt = qd.FormsViewer.qRules.Constants,
        errMsgs = qd.FormsViewer.qRules.errorMessages,
        optionalParameters = [],
        requiredParameters = [{
            name: cnt.paramDsName,
            description: 'SQL Data Source Name'
        },
        {
            name: cnt.paramWhere,
            description: 'Where clause for SQL Command[i.e. "Where Sales >= 12345"]'
        }],
        modifySqlQueryUnsupportedConnectionTypeError = "ModifySQLQuery is only for use with SQL data connections",
        modifySqlQueryError = "ModifySqlQuery error: {0}";

    function ModifySqlQuery(params) {

        function executeAsync() {
            var cf = params.commonFunction,
                dCs = params.dataConnections,
                dsName = cf.getParamValue("dsname"),
                where = cf.getParamValue("where"),
                dc = dCs.get(dsName);

            if (!dc) {
                return {
                    error: errMsgs.errorDataSourceNotFound
                };
            }

            if (!dc.isAdoSupported()) {
                return {
                    error: modifySqlQueryUnsupportedConnectionTypeError
                };
            }

            var origCmdText = dc.getCommandText(),
                newCmdText = origCmdText + " " + where;

            dc.setCommandText(newCmdText);

            return dc.executeAsync()
                .then(function () {
                    return {
                        success: true
                    };
                })
                .catch(function (e) {
                    return {
                        error: String.format(modifySqlQueryError, e)
                    };
                })
                .finally(function () {
                    dc.setCommandText(origCmdText);
                });
        }

        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters
        };
    }

    return ModifySqlQuery;
})(Qd);