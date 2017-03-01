var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.ModifySqlQuery = (function (qd) {
    "use strict";

    var cnt = qd.FormsViewer.qRules.Constants,
        errMsgs = qd.FormsViewer.qRules.ErrorMessages,
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
                    Error: errMsgs.errorDataSourceNotFound
                };
            }

            if (dc.type !== "ado") {
                return {
                    Error: modifySqlQueryUnsupportedConnectionTypeError
                };
            }

            var origCmdText = dc.getCommandText(),
                newCmdText = origCmdText + " " + where;

            dc.setCommandText(newCmdText);

            return dc.executeAsync()
                .then(function () {
                    return {
                        Success: true
                    };
                })
                .catch(function (e) {
                    return {
                        Error: String.format(modifySqlQueryError, e)
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