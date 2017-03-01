var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.RemoveDbxlPi = (function (qd) {
    'use strict';

    var optionalParameters = [{
        name: 'dsname',
        description: 'Data source name.'
    }];

    function RemoveDbxlPi(params) {

        function executeAsync() {
            var commonFunction = params.commonFunction,
                dsName = commonFunction.getParamValue('dsname');

            return Q(commonFunction.removePi('QdabraDBXL', dsName));
        }

        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters
        }
    }

    return RemoveDbxlPi;
})(Qd);