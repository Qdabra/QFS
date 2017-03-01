var Qd = Qd || {},
    fv = Qd.FormsViewer = Qd.FormsViewer || {},
    ds = fv.DataSources = fv.DataSources || {};

(function (ds) {
    "use strict";

    function ruleSetResultToAssignmentResult(ruleSetResult) {
        if (ruleSetResult.status === ResultTypes.CLOSE) {
            return AssignmentResult.CloseResult;
        } else {
            return AssignmentResult.NormalResult;
        }
    };


    function fieldChangeListener(defValApplicator, fieldChangeRuleExecutor, qRules, dataConnections, dataSources, template, qfsAccess, xpathEngine) {

        function notifyChangeAsync(dsNode) {
            return fieldChangeRuleExecutor.runFieldChangeRulesAsync(dsNode)
            .then(function (result) {
                if (result && result.shouldStop) {
                    return ruleSetResultToAssignmentResult(result);
                }

                return defValApplicator.processAffectedDefaultValuesAsync(dsNode);
            })
            .then(function () {
                var nodeName = dsNode.localName(),
                    dataSource = dsNode.getDsName();

                if (dataSource === 'QdabraRules' && nodeName === 'Command') {
                    var commandParams = {
                        node: dsNode
                    };

                    return qRules.executeCommandAsync(commandParams);
                }
            });
        }

        return {
            notifyChangeAsync: notifyChangeAsync
        };
    }

    ds.fieldChangeListener = fieldChangeListener;
})(ds);