var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.DeleteFromSharePoint = (function () {
    'use strict';

    var constants = Qd.FormsViewer.qRules.Constants,
        requiredParameters = [{
            name: constants.paramUrl,
            description: 'Item URL'
        }],
        deleteFromSharePointErrorBlankUrl = "URL cannot be blank";

    function DeleteFromSharePoint(params) {

        function executeAsync() {
            var commonFunction = params.commonFunction,
                url = commonFunction.getParamValue(constants.paramUrl),
                shpAccess = params.shpAccess;

            if (!url) {
                throw new Error(deleteFromSharePointErrorBlankUrl);
            }

            return shpAccess.deleteFileAsync(url)
                .then(function (result) {
                    return {
                        Success: result
                    };
                });
        }

        return {
            executeAsync: executeAsync,
            requiredParameters: requiredParameters
        }
    }

    return DeleteFromSharePoint;
})(Qd);