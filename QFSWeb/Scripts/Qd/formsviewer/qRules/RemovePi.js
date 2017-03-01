var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.RemovePi = (function (qd) {
    'use strict';

    var requiredParameters = [{
        name: 'name',
        description: 'Name of the processing instruction to remove'
    }];

    function RemovePi(params) {

        function executeAsync() {
            var commonFunction = params.commonFunction,
                name = commonFunction.getParamValue('name');

            return Q(commonFunction.removePi(name, null));
        }

        return {
            executeAsync: executeAsync,
            requiredParameters: requiredParameters
        };
    }

    return RemovePi;
})(Qd);