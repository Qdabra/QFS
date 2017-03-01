var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.Rules = Qd.FormsViewer.Rules || {};

(function (qd, rs) {
    "use strict";

    function assignmentResultToActionResult(assignmentResult) {
        if (assignmentResult && assignmentResult.status === ResultTypes.CLOSE) {
            return ActionResult.CloseResult;
        } else {
            return ActionResult.NormalResult;
        }
    }


    function create(dataConnections, dataSources, viewManager, xpathEngine) {

        function evaluateXPath(xpath, context) {
            return xpathEngine.evaluateXPath(xpath, { context: context });
        }

        // Action, dataSourceNode -> ActionResult
        function performAssignmentAsync(action, context) {
            var targetNodes = context.selectNodes(action.target),
                value;

            if (targetNodes && targetNodes.length) {
                value = context.evaluateString(action.expression);

                return qd.util.runPromiseSequence(targetNodes, function (lastResult, node) {
                    if (lastResult && lastResult.shouldStop) {
                        return lastResult;
                    } else {
                        return node.setValueAsync(value);
                    }
                })
                .then(assignmentResultToActionResult);
            }

            return Q.Promise.resolve();
        }

        // String -> void
        function showDialog(text) {
            alert(text);
        }


        // Action, DomNode -> void
        function showDialogExpression(action, context) {
            var result = context.evaluateString(action.expression);

            showDialog(result);
        };

        // Action -> void
        function showDialogMessage(action) {
            showDialog(action.message);
        }

        // Action -> void
        function performSwitchViewAction(action) {
            viewManager.setCurrentView(action.view);
        }

        function getConnectionForAction(action) {
            var name = action.adapterName,
                adapter = name && dataConnections.get(name);

            if (!name) {
                throw new TypeError("Adapter name was unspecified.");
            }
            if (!adapter) {
                throw new Error("No adapter found for name " + name);
            }

            return adapter;
        };

        // Action -> Promise[void]
        function performSubmitActionAsync(ruleName, action) {
            var connection = getConnectionForAction(action);

            return connection.executeAsync();
        }

        // Action -> Promise[void]
        function performQueryActionAsync(ruleName, action) {
            var connection = getConnectionForAction(action);

            return connection.executeAsync();
        }

        function performChangeAdapterProperty(action, context) {
            var connection = getConnectionForAction(action),
                expression = context.evaluateString(action.expression),
                adapterProperty = action.adapterProperty;

            if (adapterProperty && adapterProperty === 'FileURL') {
                return connection.setUrl(expression, action.adapterProperty);
            }

            console.warn('Adapter property ' + adapterProperty + ' is not currently supported.');
        }

        // Action, DomNode -> Promise[ActionResult], or void
        function runActionAsync(ruleName, action, context) {
            // wrapping this in an IIFE so that we can momentarily return a mixture
            // of promises and non-promises
            var actionMixed = (function () {
                var actionType = action.actionType;
                switch (actionType) {
                    case AssignmentAction.type:
                        return performAssignmentAsync(action, context);
                    case DialogExpressionAction.type:
                        return showDialogExpression(action, context);
                    case DialogMessageAction.type:
                        return showDialogMessage(action);
                    case SwitchViewAction.type:
                        return performSwitchViewAction(action);
                    case SubmitAction.type:
                        return performSubmitActionAsync(ruleName, action);
                    case QueryAction.type:
                        return performQueryActionAsync(ruleName, action);
                    case ExitAction.type:
                        return ActionResult.StopRuleSetResult;
                    case CloseDocumentAction.type:
                        return ActionResult.CloseResult;
                    case ChangeAdapterAction.type:
                        return performChangeAdapterProperty(action, context);
                }

                console.warn("Unsupported action type: " + actionType);
                return null;
            })();

            return Q(actionMixed);
        }

        return {
            runActionAsync: runActionAsync
        };
    }

    rs.actionExecutor = {
        create: create
    };
})(Qd, Qd.FormsViewer.Rules);