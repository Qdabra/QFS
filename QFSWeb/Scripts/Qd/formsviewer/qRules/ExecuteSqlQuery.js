var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.ExecuteSqlQuery = (function (qd) {
    "use strict";

    var cnt = qd.FormsViewer.qRules.Constants,
        errMsgs = qd.FormsViewer.qRules.errorMessages,
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
                    error: errMsgs.errorDataSourceNotFound
                };
            }

            if (!dc.isAdoSupported()) {
                return {
                    error: executeSqlQueryUnsupportedConnectionTypeError
                };
            }

            var origCmdText = dc.getCommandText();

            dc.setCommandText(sql);

            return dc.executeAsync()
                .then(function () {
                    return {
                        success: true
                    };
                })
                .catch(function (e) {
                    return {
                        error: String.format(executeSqlQueryError, e)
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