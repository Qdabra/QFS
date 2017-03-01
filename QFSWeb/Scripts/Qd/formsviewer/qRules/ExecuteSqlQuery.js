var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.ExecuteSqlQuery = (function (qd) {
    "use strict";

    var cnt = qd.FormsViewer.qRules.Constants,
        errMsgs = qd.FormsViewer.qRules.ErrorMessages,
        optionalParameters = [],
        requiredParameters = [{
            name: cnt.paramDsName,
            description: 'SQL Data Source Name'
        },
        {
            name: cnt.paramSql,
            description: 'SQL to execute[i.e. "Exec AdventureWorks.dbo.GetCustomer @customerId = 12345"]'
        }],
        executeSqlQueryUnsupportedConnectionTypeError = "ExecuteSqlQuery is only for use with SQL data connections",
        executeSqlQueryError = "ExecuteSqlQuery error: {0}";

    function ExecuteSqlQuery(params) {

        function executeAsync() {
            var cf = params.commonFunction,
                dCs = params.dataConnections,
                dsName = cf.getParamValue("dsname"),
                sql = cf.getParamValue("sql"),
                dc = dCs.get(dsName);

            if (!dc) {
                return {
                    Error: errMsgs.errorDataSourceNotFound
                };
            }

            if (dc.type !== "ado") {
                return {
                    Error: executeSqlQueryUnsupportedConnectionTypeError
                };
            }

            var origCmdText = dc.getCommandText();

            dc.setCommandText(sql);

            return dc.executeAsync()
                .then(function () {
                    return {
                        Success: true
                    };
                })
                .catch(function (e) {
                    return {
                        Error: String.format(executeSqlQueryError, e)
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

    return ExecuteSqlQuery;
})(Qd);