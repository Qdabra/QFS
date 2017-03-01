var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.Rules = Qd.FormsViewer.Rules || {};

(function (rs) {
    "use strict";

    function actionResultToRuleResult(actionResult) {
        if (actionResult) {
            if (actionResult.status === ResultTypes.CLOSE) {
                return RuleResult.CloseResult;
            } else if (actionResult.status === ResultTypes.STOP_RULESET) {
                return RuleResult.StopRuleSetResult;
            }
        }

        return RuleResult.NormalResult;
    }

    // rule, dsNode -> Boolean
    function shouldRunRule(rule, context) {
        var condition = rule.condition;

        if (!rule.isEnabled) {
            return false;
        }

        return !condition || context.evaluateBoolean(condition);
    }

    function create(actionExecutor) {

        function executeRuleAsync(rule, context) {
            return rule.actions.reduce(function (last, action) {
                return last.then(function (lastResult) {
                    if (lastResult && lastResult.shouldStop) {
                        return lastResult;
                    } else {
                        return actionExecutor.runActionAsync(rule.caption, action, context);
                    }
                });
            }, Q.Promise.resolve())
            .then(actionResultToRuleResult);
        }

        function runRuleAsync(rule, context) {
            return Q()
                .then(function () {
                    return shouldRunRule(rule, context)
                        ? executeRuleAsync(rule, context)
                        : RuleResult.SkipResult;
                });
        }

        return {
            runRuleAsync: runRuleAsync
        };
    }

    rs.ruleExecutor = {
        create: create
    };
})(Qd.FormsViewer.Rules);