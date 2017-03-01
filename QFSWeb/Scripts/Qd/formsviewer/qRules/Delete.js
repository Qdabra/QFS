var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.Delete = (function (qd) {
    "use strict";
    var optionalParameters = [{
        name: "dsname",
        description: 'Only needs to be specified if the XPath to delete is not located in the Main data source'
    }],
    requiredParameters = [{
        name: "xpath",
        description: 'XPath to delete. It can be filtered in the case of a repeating group or field'
    }];

    function Delete(params) {

        function executeAsync() {
            var commonFunction = params.commonFunction,
                dataSources = params.dataSources,
                deleteErrorMissingNode = "Could not locate field to delete.",
                resultObject = {
                    Error: '',
                    Result: '',
                    Success: false
                };

            var dsname = commonFunction.getParamValue("dsname"),
                xpath = commonFunction.getParamValue("xpath"),
                dom = dataSources.getDom(dsname),
                deleteCount = commonFunction.deleteNodes(dom, xpath),
                isSuccess = deleteCount > 0;

            resultObject.Success = isSuccess;
            resultObject.Error = isSuccess ? '' : deleteErrorMissingNode;

            return Q(resultObject);
        }
        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters
        }
    }

    return Delete;
})(Qd);
