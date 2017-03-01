var Qd = Qd || {};

Qd.FormsViewer = Qd.FormsViewer || {};

(function (qd, fv) {
    "use strict";

    /**
     * Create a domNode instance
     * @param node - An actual DOMNode (DOMElement or DOMAttribute)
     * @param listeners - The listeners that should be notified when this node changes
     * @param xpathEngine - The XPath engine to use when querying this node
     */
    function domNode(node, listeners, xpathEngine) {

        function setValueAsync(value) {
            qd.util.setNodeValue(node, value);

            return Q.Promise.resolve();
        }

        return {
            setValueAsync: setValueAsync
        };
    }

    fv.domNode = domNode;

})(Qd, Qd.FormsViewer);