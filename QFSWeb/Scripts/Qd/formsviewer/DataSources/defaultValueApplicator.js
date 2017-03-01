var Qd = Qd || {},
    fv = Qd.FormsViewer = Qd.FormsViewer || {},
    ds = fv.DataSources = fv.DataSources || {};

(function (qd, ds) {
    "use strict";

    function defaultValueApplicator(template, dsCollection) {


        // dataSourceNode, string -> Promise
        function applyDefaultValue(targetNode, expression) {
            var newValue = targetNode.evaluateString(expression);

            return targetNode.setValueAsync(newValue, { setDefault: true });
        }

        // defaultValue -> Promise[AssignmentResult] // TODO - reconcile AssignmentResult
        function evaluateAndApplyDefaultValueAsync(defaultValue) {
            var targetNodePath = defaultValue.getTarget(),
                expr = defaultValue.getExpression();
            var targetNodes = dsCollection.selectNodes(targetNodePath);

            if (targetNodes) {
                return qd.util.runPromiseSequence(targetNodes, function (lastResult, item) {
                    if (lastResult && lastResult.shouldStop) {
                        return lastResult;
                    } else {
                        return applyDefaultValue(item, expr);
                    }
                });
            }

            return Q.Promise.resolve();
        }

        // defaultValue[] -> Promise[AssignmentResult]
        function runDefaultValuesAsync(defaultValues) {
            return qd.util.runPromiseSequence(defaultValues, function (lastResult, item) {
                if (lastResult && lastResult.shouldStop) {
                    return lastResult;
                } else {
                    return evaluateAndApplyDefaultValueAsync(item);
                }
            });
        }

        // dataSourceNode -> Promise[AssignmentResult]
        function checkAffectedDefaultValuesAsync(node) {
            var defValues = template.getDependentDefaultValues(node.getNode());

            return runDefaultValuesAsync(defValues);
        };

        // -> Promise[AssignmentResult]
        function processAllDefaultValues() {
            var defValues = template.getAllDefaultValues();

            return runDefaultValuesAsync(defValues);
        }

        // interface
        return {
            processAffectedDefaultValuesAsync: checkAffectedDefaultValuesAsync,
            processAllDefaultValues: processAllDefaultValues
        };
    }

    ds.defaultValueApplicator = defaultValueApplicator;
})(Qd, ds);