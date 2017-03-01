var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.CopyMove = (function (qRules, qd) {
    "use strict";

    var cnt = qRules.Constants,
        errMsgs = qRules.ErrorMessages,
        locationFirstChild = "firstChild",
        locationLastChild = "lastChild",
        locationBefore = "before",
        locationAfter = "after",
        locationDescription = String.format("The location relative to the destination node where the node should be inserted ({0}, {1}, {2} or {3})",
        locationFirstChild, locationLastChild, locationBefore, locationAfter),
        errorInsertFail = "An error occurred trying to add the node to the specified location.",
        errorInvalidLocation = String.format("Invalid location value. Allowed values are {0}, {1}, {2} and {3}.",
        locationFirstChild, locationLastChild, locationBefore, locationAfter),
        errorRemoveOriginalFail = "An error occurred trying to delete the node being moved.";


    function CopyMove() {

        function getInsertedNodeSelectionPath(location) {
            switch (location) {
                case locationFirstChild:
                    return "node()[1]";
                case locationLastChild:
                    return "node()[last()]";
                case locationBefore:
                    return "preceding-sibling::node()[1]";
                case locationAfter:
                    return "following-sibling::node()[1]";
                default:
                    throw new Error(errorInvalidLocation);
            }
        }

        function getInsertAction(location, destNode) {
            switch (location) {
                case locationFirstChild:

                    if (destNode.canMoveToFirstChild()) {
                        var firstNode = destNode.selectSingle("node()[1]");
                        if (firstNode) {
                            return firstNode.insertBeforeAsync;
                        }

                        return destNode.insertAfterAsync;
                    }
                    else
                        return destNode.insertAfterAsync;

                case locationLastChild:
                    return destNode.appendChildAsync;

                case locationBefore:
                    return destNode.insertBeforeAsync;

                case locationAfter:
                    return destNode.insertAfterAsync;

                default:
                    throw new Error(errorInvalidLocation);
            }
        }

        function performInsert(location, destNode, sourceNode) {
            var insertNode = sourceNode.getNode().cloneNode(true);

            return getInsertAction(location, destNode)(insertNode);
        }

        function performInsertAction(location, destNode, sourceNode) {
            return performInsert(location, destNode, sourceNode)
                .catch(function () {
                    return new Error(errorInsertFail);
                })
                .then(function () {
                    return destNode.selectSingle(getInsertedNodeSelectionPath(location));
                });
        }

        function executeAsync(params, isMove) {
            var cf = params.commonFunction,
            sourceDs = cf.getParamValue(cnt.paramSourceDs),
            sourcePath = cf.getParamValue(cnt.paramSourcePath),
            destDs = cf.getParamValue(cnt.paramDestDs),
            destPath = cf.getParamValue(cnt.paramDestPath),
            location = cf.getParamValue(cnt.paramLocation),
            sourceNodes = cf.getValidNodeSet(cf.getDataSource(sourceDs), sourcePath, errMsgs.errorFailedToSelectSource),
            destNode = cf.getValidNode(cf.getDataSource(destDs), destPath, errMsgs.errorFailedToSelectDestination);

            return qd.util.runPromiseSequence(sourceNodes, function (lastResult, sourceNode) {
                if (lastResult && lastResult.shouldStop) {
                    return lastResult;
                } else {

                    return performInsertAction(location, destNode, sourceNode)
                        .then(function (resultNode) {
                            destNode = resultNode;
                            location = locationAfter;

                            if (isMove) {
                                try {
                                    sourceNode.deleteSelf();
                                } catch (e) {
                                    throw new Error(errorRemoveOriginalFail);
                                }
                            }
                        });
                }
            })
            .then(function () {
                return {
                    Success: true
                };
            });

            //sourceNodes.forEach(function (sourceNode) {
            //    performInsertAction(location, destNode, sourceNode);
            //    location = locationAfter;

            //    if (isMove) {
            //        try {
            //            sourceNode.deleteSelf();
            //        } catch (e) {
            //            throw new Error(errorRemoveOriginalFail);
            //        }
            //    }
            //});
        }

        return {
            executeAsync: executeAsync,
            locationFirstChild: locationFirstChild,
            locationLastChild: locationLastChild,
            locationBefore: locationBefore,
            locationAfter: locationAfter,
            locationDescription: locationDescription
        };
    }

    return CopyMove;
})(Qd.FormsViewer.qRules, Qd);


Qd.FormsViewer.qRules.Copy = (function (qRules, qd) {
    "use strict";

    var cnt = qRules.Constants,
        copyMove = qRules.CopyMove(),
        optionalParameters = [
        {
            name: cnt.paramSourceDs,
            description: "The name of the data source from which the node should be copied"
        },
        {
            name: cnt.paramDestDs,
            description: "The name of the data source to which the node should be copied"
        },
        {
            name: cnt.paramLocation,
            description: copyMove.locationDescription
        }],
        requiredParameters = [
        {
            name: cnt.paramSourcePath,
            description: "The xpath of the node to copy"
        },
        {
            name: cnt.paramDestPath,
            description: "The XPath of the location where the node should be copied"
        }];

    function Copy(params) {

        function executeAsync() {
            return copyMove.executeAsync(params, false);
        }

        return {
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters,
            executeAsync: executeAsync
        };
    }

    return Copy;
})(Qd.FormsViewer.qRules, Qd);


Qd.FormsViewer.qRules.Move = (function (qRules, qd) {
    "use strict";

    var cnt = qRules.Constants,
        copyMove = qRules.CopyMove(),
        optionalParameters = [
        {
            name: cnt.paramSourceDs,
            description: "The name of the data source from which the node should be moved"
        },
        {
            name: cnt.paramDestDs,
            description: "The name of the data source to which the node should be moved"
        },
        {
            name: cnt.paramLocation,
            description: copyMove.locationDescription
        }],
        requiredParameters = [
        {
            name: cnt.paramSourcePath,
            description: "The xpath of the node to move"
        },
        {
            name: cnt.paramDestPath,
            description: "The XPath of the location where the node should be moved"
        }];

    function Move(params) {

        function executeAsync() {
            return copyMove.executeAsync(params, true);
        }

        return {
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters,
            executeAsync: executeAsync
        };
    }

    return Move;
})(Qd.FormsViewer.qRules, Qd);