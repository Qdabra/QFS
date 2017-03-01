Qd.FormsViewer.qRules.ChangeSubmitUrl = (function (qd) {
    'use strict';

    var errorCreatingUrl = "Error occurred trying to get SharePoint Library URL from form";

    var constants = qd.FormsViewer.qRules.Constants;

    var optionalParameters = [
    ];

    var requiredParameters = [
        {
            name: constants.paramSubmit,    // TODO: double-check
            description: 'Submit Adapter Name'
        },
        {
            name: constants.paramUrl,      // TODO: double-check
            description: 'Path to submit to'
        }
    ];

    function command(params) {

        function execute() {
            var commonFunctions = params.commonFunction,
                submit = commonFunctions.getParamValue(constants.paramSubmit),
                url = commonFunctions.getParamValue(constants.paramUrl);

            var conn = commonFunctions.getDataConnection(submit);

            if (conn.type !== 'dav') {
                throw new Error('Data connection must be a SharePoint library submit connection.');
            }

            conn.setUrl(url);

            return {
                result: url,
                success: true
            };
        }

        return {
            execute: execute,
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters
        };
    }

    return command;
})(Qd);