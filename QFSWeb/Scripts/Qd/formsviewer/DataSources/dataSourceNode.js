var Qd = Qd || {},
    fv = Qd.FormsViewer = Qd.FormsViewer || {},
    ds = fv.DataSources = fv.DataSources || {};

(function (qd, ds, qdNew) {
    "use strict";

    var defaultValueKey = "defVal";

    function normalizeValue(v) {
        return v ? v.replace(/\r\n|\r/g, "\n") : '';
    }

    function setRichTextXml(node, rtNodes) {
        $(node)
            .empty()
            .append($(rtNodes).clone());
    }

    function dataSourceNode(node, source, xpathEvaluator, listener) {
        var self;

        // -> string
        function value() {
            return FVUtil.getNodeValue(node);
        }

        function evaluateXPath(xpath, options) {
            options = options || {};

            return xpathEvaluator.evaluateXPath(xpath, { context: node, namespaces: options.namespaces });
        }

        // string -> boolean
        function evaluateBoolean(xpath) {
            return evaluateXPath(xpath).booleanValue();
        }

        // string -> string
        function evaluateString(xpath) {
            return evaluateXPath(xpath).stringValue();
        }

        function setDefaultValue(val) {
            FVUtil.setNodeData(node, defaultValueKey, val);
        }

        function lastDefaultValue() {
            return FVUtil.getNodeData(node, defaultValueKey);
        }

        // string, [bool = true] -> Promise
        function setValueAsync(val, options) {
            var strVal = String(val);
            var setDefault = options && options.setDefault;
            var isRichTextString = options && options.isRichTextString;
            var isRichTextXml = options && options.isRichTextXml;

            return Q.Promise.resolve()
            .then(function () {
                if (isRichTextString) {
                    //Move the method to util.js -- 11/15/16
                    qd.util.setRichTextString(node, val);
                    return listener.notifyChangeAsync(self);
                }
                if (isRichTextXml) {
                    setRichTextXml(node, val);
                    return listener.notifyChangeAsync(self);
                }

                var currentValue = value(),
                    newValNorm = normalizeValue(strVal),
                    curValNorm = normalizeValue(currentValue);

                if (!setDefault || newValNorm !== normalizeValue(lastDefaultValue())) {
                    qd.util.setNodeValue(node, strVal);

                    if (setDefault) {
                        setDefaultValue(strVal);
                    }

                    if (newValNorm !== curValNorm && listener) {
                        return listener.notifyChangeAsync(self);
                    }
                }
            });
        }

        function makeDsNode(n) {
            return dataSourceNode(n, source, xpathEvaluator, listener);
        }

        // string -> dataSourceNode[]
        function selectNodes(xpath, options) {
            return evaluateXPath(xpath, options).toArray().map(makeDsNode);
        }

        // string -> dataSourceNode
        function selectSingle(xpath, options) {
            var node = evaluateXPath(xpath, options).first();

            return node ? makeDsNode(node) : null;
        }

        function getDsName() {
            return qd.util.getDsName(node);
        }

        function getNode() {
            return node;
        }

        function childNodes() {
            var cn = node.childNodes || [];

            return Array.prototype.slice.call(cn).map(makeDsNode);
        }

        function localName() {
            return node.localName;
        }

        function namespaceURI() {
            return node.namespaceURI;
        }

        function appendChildAsync(newChild) {
            var newNode = makeDsNode(newChild);

            node.appendChild(newChild);

            source.assignIds(newChild);

            return listener.notifyChangeAsync(newNode).then(function () { return newNode; });
        }

        function appendChildrenAsync(newChildren) {
            var childrenNorm = [].concat(newChildren);
            var newNodes = [];

            return childrenNorm
                .reduce(function (prev, next) {
                    return prev
                        .then(function () { return appendChildAsync(next); })
                        .then(function (newNode) { newNodes.push(newNode); });
                }, Q())
                .then(function () { return newNodes; });
        }

        //Function to remove current node.
        function deleteSelf() {
            if (!node.parentNode) {
                throw new Error("Unable to locate parent of node to remove.");
            }

            // TODO: re-evaluate default values, etc.
            node.parentNode.removeChild(node);
        }

        /**
         * @param target {DOMNode} the existing sibling of the current node 
         *     before which newSibling should be inserted. If falsy, newSibling is inserted as the
         *     last child of the current node's parent
         * @param newSibling {DOMNode} the new sibling to add
         */
        function insertSiblingAsync(target, newSibling) {
            var newNode = makeDsNode(newSibling),
                parent = node.parentNode || node.ownerDocument;

            parent.insertBefore(newSibling, target);
            source.assignIds(newSibling);

            return listener.notifyChangeAsync(newNode).then(function () { return newNode; });
        }

        /**
         * Inserts the specified node before the current node
         */
        function insertBeforeAsync(newSibling) {
            return insertSiblingAsync(node, newSibling);
        }

        /**
         * Inserts the specified node after the current node
         */
        function insertAfterAsync(newSibling) {
            // https://developer.mozilla.org/en-US/docs/Web/API/Node.insertBefore
            // We insert after by inserting before the target node's next sibling. If it has no next sibling, it will
            // be added as the last child of the parent
            return insertSiblingAsync(node.nextSibling, newSibling);
        }

        function setContentAsync(nodes) {
            $(node).empty();

            return appendChildrenAsync(nodes);
        }

        function createElement(name) {
            if (!name) {
                return null;
            }

            return qd.util.ownerDocument(node).createElement(name);
        }

        function getAttribute(name) {
            if (!node.getAttribute) {
                return null;
            }

            return node.getAttribute(name);
        }

        self = {
            setValueAsync: setValueAsync,
            value: value,
            selectNodes: selectNodes,
            selectSingle: selectSingle,
            evaluateBoolean: evaluateBoolean,
            evaluateString: evaluateString,
            lastDefaultValue: lastDefaultValue,
            getDsName: getDsName,
            getNode: getNode,
            childNodes: childNodes,
            localName: localName,
            namespaceURI: namespaceURI,
            setContentAsync: setContentAsync,
            appendChildAsync: appendChildAsync,
            appendChildrenAsync: appendChildrenAsync,
            toString: localName,
            deleteSelf: deleteSelf,
            insertBeforeAsync: insertBeforeAsync,
            insertAfterAsync: insertAfterAsync,
            createElement: createElement,
            getAttribute: getAttribute
        };

        return self;
    }

    ds.dataSourceNode = dataSourceNode;
})(Qd, ds, qd);