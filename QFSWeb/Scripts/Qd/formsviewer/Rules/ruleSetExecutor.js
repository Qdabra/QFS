var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.RuleSet = Qd.FormsViewer.Rules || {};

(function (qd, rs) {
    "use strict";

    function ruleResultToRuleSetResult(ruleResult) {
        if (ruleResult && ruleResult.status === ResultTypes.CLOSE) {
            // Pass up the close result if a rule returned one
            return RuleSetResult.CloseResult;
        } else {
            return RuleSetResult.NormalResult;
        }
    }

    function showRuleError(rule, error) {
        return qd.FormsViewer.UI.showRuleError(rule.caption, error).then(function () {
            return RuleResult.StopRuleSetResult;
        });
    }

    function create(ruleExecutor) {

        // rule[], dataSourceNode -> Promise<ruleResult>
        // runs the specified rules until a rule result indicates a stop event
        // or all are complete, and returns the last result or the stop event if there
        // was one
        function runRulesAsync(rules, context) {
            return qd.util.runPromiseSequence(rules, function (lastResult, rule) {
                if (lastResult && lastResult.shouldStop) {
                    return lastResult;
                }

                return ruleExecutor.runRuleAsync(rule, context)
                    .catch(function (error) {
                        console.error(error);
                        return showRuleError(rule, error);
                    });
            });
        }

        // ruleSet, dataSourceNode -> Promise[ruleSetResult]
        // runs the rules in the ruleSet and returns the outcome
        function runRuleSetAsync(ruleSet, context) {
            return runRulesAsync(ruleSet.rules, context)
            .then(ruleResultToRuleSetResult);
        }

        return {
            runRuleSetAsync: runRuleSetAsync
        };
    }

    rs.ruleSetExecutor = {
        create: create
    };

})(Qd, Qd.FormsViewer.RuleSet);
