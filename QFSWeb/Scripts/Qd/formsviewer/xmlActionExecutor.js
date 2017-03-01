var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};

(function (fv) {
    "use strict";

    function xmlActionExecutor(dataSources) {

        function cloneInnerFragment(xmlToEdit) {
            return xmlToEdit.innerFragment.cloneNode(true);
        }

        function insertBeforeAsync(targetNode, xmlToEdit) {
            return targetNode.insertBeforeAsync(cloneInnerFragment(xmlToEdit));
        }

        function insertAfterAsync(targetNode, xmlToEdit) {
            return targetNode.insertAfterAsync(cloneInnerFragment(xmlToEdit));
        }

        /**
         * Removes the specified node from its data source
         * @param targetNode {dataSourceNode} the node to remove
         * @returns a promise for the completed action
         */
        function removeAsync(targetNode) {

            return Q()
                .then(function () {
                    targetNode.deleteSelf();
                });
        }

        /**
         * Returns the action function for the specified action type
         * @param actionName {string} - the action type to retrieve
         * @returns function(dsNode) the action to perform on the node
         */
        function actionForActionType(actionName) {
            switch (actionName) {
                case XmlActions.CollectionInsertBefore:
                    return insertBeforeAsync;
                case XmlActions.CollectionInsertAfter:
                    return insertAfterAsync;
                case XmlActions.CollectionRemove:
                    return removeAsync;
            }

            return null;
        }

        /**
         * Performs an xmlToEdit action on a data source node
         * @param targetNode {dataSourceNode} the node upon which to act
         * @returns a promise for the completed action
         */
        function performXmlToEditAction(targetNode, action, xmlToEdit) {
            return Q()
                .then(function() {
                    var actionFunc = actionForActionType(action);

                    if (actionFunc) {
                        return actionFunc(targetNode, xmlToEdit);
                    }

                    throw new Error("Unsupported action type: " + action);
                });
        }

        return {
            performXmlToEditActionAsync: performXmlToEditAction
        };
    }

    fv.xmlActionExecutor = xmlActionExecutor;
})(Qd.FormsViewer);