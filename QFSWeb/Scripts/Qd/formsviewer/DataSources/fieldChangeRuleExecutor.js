var Qd = Qd || {},
    fv = Qd.FormsViewer = Qd.FormsViewer || {},
    ds = fv.DataSources = fv.DataSources || {};

(function (ds) {
    "use strict";

    function fieldChangeRuleExecutor(template, ruleSetExecutor) {
        // dataSourceNode -> Promise[RuleSetResult]
        function runFieldChangeRulesAsync(node) {
            var dsName = node.getDsName(),
                domHandler = template.getRulesForField(dsName, node.getNode());

            if (domHandler && domHandler.ruleSet) {
                return ruleSetExecutor.runRuleSetAsync(domHandler.ruleSet, node)
                    .catch(function (err) {
                        console.error(err);
                        alert('Some rules were not applied.');
                    });
            }

            return Q.Promise.resolve();
        }

        return {
            runFieldChangeRulesAsync: runFieldChangeRulesAsync
        };
    }

    ds.fieldChangeRuleExecutor = fieldChangeRuleExecutor;
})(ds);