var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.Insert = (function (qd) {
    "use strict";

    var optionalParameters = [{
        name: "dsname",
        description: 'Name of the data source. Assumes you are using the Main data source if it is not specified'
    },
    {
        name: "child",
        description: 'Relative XPath to the child node (repeating) – must provide either /child or /xpathsrc'
    },
    {
        name: "before",
        description: 'Relative XPath from the parent node to the sibling node that child node should be inserted before (ignored when using /posn, if node cannot be selected, simply inserts as usual)'
    },
    {
        name: "posn",
        description: 'Row position where to insert. Assumes "last" if it is not specified'
    },
    {
        name: "count",
        description: 'Number of occurrences to insert. Assumes "1" if it is not specified.'
    },
    {
        name: "xpathsrc",
        description: 'Specifies the XPath to the xml fragment to insert'
    },
    {
        name: "firstparentonly",
        description: 'When the form has a repeating group (child) within a repeating group (parent), the schema may have multiple parents. Executing the Insert command with /firstparentonly set to true (or not declared) means that only the first parent will receive the action specified by the Insert command. If /firstparentonly is set to false, then EVERY parent node will receive the action specified by the Insert command. Defaults to true'
    }],
    requiredParameters = [{
        name: "parent",
        description: 'XPath to the parent node (insertion point)'
    }],
    insertErrorMustSpecifyNode = "You must include either /child or /xpathsrc.",
    insertErrorChildSlash = "The child parameter value should not start with a slash.",
    insertErrorFailedToSelectSource = "Failed to select the source node.",
    insertErrorFailedToSelectParent = "Failed to select the parent node.",
    insertErrorInvalidPosition = 'Position must be "last" or a positive integer.',
    insertErrorInvalidCount = "Count must be a positive integer.",
    insertErrorFailedToInsert = "Failed to insert the child node.";

    function Insert(params) {

        function addNils(dsname, childnode) {
            //TODO: AddNils functionality.
        }

        function performInsertAsync(child, posn, parentNode, childNode, beforeNode, position, insertCount) {
            try {

                var countArray = [],
                    insertedCount = 0,
                    failedItemCount = 0;
                for (var index = 1; index <= insertCount; index++) {
                    countArray.push(index)
                }

                return qd.util.runPromiseSequence(countArray,
                    function (lastResult, item) {
                        if (lastResult && lastResult.shouldStop) {
                            return lastResult;
                        }

                        var cloneNode = childNode.cloneNode(true);
                        insertedCount++;
                        if (posn === "last") {
                            if (!beforeNode) {
                                return parentNode.appendChildAsync(cloneNode);
                            }
                            return beforeNode.insertBeforeAsync(cloneNode);
                        }

                        try {
                            return parentNode.selectSingle(String.format("{0}[{1}]", child, position))
                                .insertBeforeAsync(cloneNode);
                        }
                        catch (e) {
                            // There is no node found at the specified position, so just append.
                            posn = "last";
                            insertedCount--;
                            failedItemCount++;
                        }
                    })
                    .then(function () {
                        if (!failedItemCount) {
                            return 0;
                        }

                        return performInsertAsync(child, posn, parentNode, childNode, beforeNode, position, failedItemCount);
                    })
                    .then(function (count) {
                        return insertedCount + count;
                    });
            }
            catch (e) {
                throw new Error(insertErrorFailedToInsert);
            }
        }

        function performInsertOuterAsync(child, before, posn, count, parentNode, childNode) {
            var beforeNode = null;
            if (before) {
                beforeNode = parentNode.selectSingle(before);
            }

            // Ensure posn is a valid positive integer or the string "last".
            var position = 1;
            if (!posn || posn.toLowerCase() === "last") {
                posn = "last";
            }
            else {
                try {
                    position = parseInt(posn);

                    if (Number.isNaN(posn)) {
                        throw new Error('Position is not a valid number');
                    }

                    if (position <= 1) {
                        // Handle case of position not valid on the low end.
                        position = 1;
                    }
                    else if (position > parentNode.selectNodes(child).length) {
                        // Handle case of position not valid on the high end.
                        posn = "last";
                    }
                }
                catch (e) {
                    throw new Error(insertErrorInvalidPosition);
                }
            }

            // Ensure count is a valid positive integer.
            if (!count) {
                count = "1";
            }

            var insertCount = parseInt(count);
            if (Number.isNaN(insertCount) || insertCount <= 0) {
                throw new Error(insertErrorInvalidCount);
            }

            return performInsertAsync(child, posn, parentNode, childNode, beforeNode, position, insertCount);
        }

        function executeAsync() {
            var commonFunction = params.commonFunction,
                dataSources = params.dataSources,
                dsname = commonFunction.getParamValue("dsname"),
                parentXPath = commonFunction.getParamValue("parent"),
                child = commonFunction.getParamValue("child"),
                before = commonFunction.getParamValue("before"),
                xpathsrc = commonFunction.getParamValue("xpathsrc"),
                posn = commonFunction.getParamValue("posn"),
                count = commonFunction.getParamValue("count"),
                firstOnly = commonFunction.getBoolParamValue("firstparentonly", true);

            if (!child && !xpathsrc) {
                throw new Error(insertErrorMustSpecifyNode);
            }

            if (child && child.startsWith("/")) {
                throw new Error(insertErrorChildSlash);
            }

            if (!xpathsrc) {
                xpathsrc = parentXPath +
                    (parentXPath.endsWith("/")
                    ? '' :
                    '/') +
                    child;
            }

            if (!child) {
                // Need this for the selection for the actual insert to work below.
                child = xpathsrc.substr(xpathsrc.lastIndexOf("/") + 1);
            }

            var dom = dataSources.getDom(dsname);

            return commonFunction.getSampleData(params.template)
                .then(function (sampleData) {
                    var xPath = commonFunction.getSampleData2dsXPath(dsname, xpathsrc),
                        childNode = params.xpathEngine.evaluateXPath(xPath, { context: sampleData }).first();

                    if (!childNode) {
                        throw new Error(insertErrorFailedToSelectSource);
                    }

                    //Try to add nils where appropriate - only applies to main data source for now
                    addNils(dsname, childNode);

                    if (firstOnly) {
                        var parentNode = commonFunction.getValidNode(dom, parentXPath, insertErrorFailedToSelectParent);
                        return performInsertOuterAsync(child, before, posn, count, parentNode, childNode).then(function (insertedCount) {
                            return {
                                Error: '',
                                Result: insertedCount,
                                Success: insertedCount !== 0
                            };
                        });
                    }
                    else {
                        var matchingParents = commonFunction.getValidNodeSet(dom, parentXPath, insertErrorFailedToSelectParent),
                            addedCount = 0;

                        return qd.util.runPromiseSequence(matchingParents,
                            function (lastResult, parentNode) {
                                if (lastResult && lastResult.shouldStop) {
                                    return lastResult;
                                }
                                return performInsertOuterAsync(child, before, posn, count, parentNode, childNode).then(function (insertedCount) {
                                    addedCount += insertedCount;
                                    return addedCount;
                                });
                            })
                            .then(function (insertedCount) {
                                return {
                                    Error: '',
                                    Result: insertedCount,
                                    Success: insertedCount !== 0
                                };
                            });
                    }


                });
        }

        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters
        };
    }

    return Insert;
})(Qd);