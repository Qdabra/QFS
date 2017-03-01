var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.ChangeConnectionUrl = (function (qd) {
    'use strict';

    var constants = qd.FormsViewer.qRules.Constants,
        optionalParameters = [
        {
            name: constants.paramListGuid,
            description: 'GUID for the SharePoint List - required if data connection is to a SharePoint List. Only available for InfoPath 2010 and later.'
        }],
        requiredParameters = [{
            name: constants.paramDsName,
            description: 'Name of data connection where URL should be changed'
        },
        {
            name: constants.paramUrl,
            description: 'New URL for the data connection'
        }],
        changeConnectionUrlListGuidNeeded = 'You must provide the ' + constants.paramListGuid + ' parameter if changing the URL for a SharePoint List data connection.',
        changeConnectionUrlUnknownConnectionType = 'ChangeConnectionUrl is not supported for this connection type';

    function ChangeConnectionUrl(params) {

        function executeAsync() {
            var commonFunction = params.commonFunction,
                dsName = commonFunction.getParamValue(constants.paramDsName),
                url = commonFunction.getParamValue(constants.paramUrl),
                listGuid = commonFunction.getParamValue(constants.paramListGuid),
                conn = commonFunction.getDataConnection(dsName);

            try {
                switch (conn.type) {
                    case 'xmlFile':
                    case 'webService':
                    case 'dav':
                        conn.setUrl(url);
                        break;

                    case 'shpList':
                        if (!listGuid) {
                            var errorObj = new Error(changeConnectionUrlListGuidNeeded);
                            errorObj.name = constants.qRulesExceptionName;

                            throw errorObj;
                        }

                        conn.setUrlAndListId(url, listGuid);
                        break;

                    default:
                        var errorObj = new Error(changeConnectionUrlUnknownConnectionType);
                        errorObj.name = constants.qRulesExceptionName;

                        throw errorObj;
                        break;
                }

                return Q({
                    Result: url,
                    Success: true
                });
            } catch (e) {
                if (e.name === constants.qRulesExceptionName) {
                    throw e;
                }

                throw new Error('An error occurred trying to change the connection URL: ' + e.message);
            }
        }

        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters
        };
    }

    return ChangeConnectionUrl;
})(Qd);