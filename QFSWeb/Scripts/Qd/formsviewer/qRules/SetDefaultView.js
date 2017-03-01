var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.SetDefaultView = (function (qd) {
    'use strict';

    var constants = qd.FormsViewer.qRules.Constants,
        requiredParameters = [
        {
            name: constants.paramView,
            description: 'View name'
        }];

    function SetDefaultView(params) {

        function executeAsync() {
            var cf = params.commonFunction,
                view = cf.getParamValue(constants.paramView);

            cf.setView(view);

            return Q({
                Success: true
            });
        }

        return {
            executeAsync: executeAsync,
            requiredParameters: requiredParameters
        };
    }

    return SetDefaultView;
})(Qd);