(function (qRules) {
    "use strict";

    function SubmitToSharePoint(params) {

        var constants = qRules.constants;

        var requiredParameters = [
            {
                name: 'dssubmit',
                description: 'Submit Data Connection Name'
            }
        ];

        var optionalParameters = [
            {
                name: constants.paramDsName,
                description: 'Data Source Name'
            },
            {
                name: constants.paramOverwrite,
                description: 'Allow overwriting the target file'
            },
            {
                name: constants.paramUrl,
                description: 'Folder location to save'
            }
        ];

        function executeAsync() {
            var cf = params.commonFunctions;

            var dsSubmitName = cf.getParamValue('dssubmit');

            var dsname = cf.getParamValue(constants.paramDsName);
            var overwrite = cf.getBoolParamValue(constants.paramOverwrite);
            var url = cf.getParamValue(constants.paramUrl);

            var inputDataSource = cf.getDataSource(dsname);
            var submitDataConn = cf.getDataConnection(dsSubmitName);

            if (submitDataConn.type !== 'dav') {
                throw new Error('Invalid connection type for dssubmit');
            }

            return submitDataConn.executeAsync({
                folderUrl: url,
                overwrite: overwrite,
                xml: inputDataSource.getNode()
            }).then(function() {
                return {
                    success: true
                };
            });
        }

        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters
        };
    }

    qRules.SubmitToSharePoint = SubmitToSharePoint;
})(Qd.FormsViewer.qRules);
