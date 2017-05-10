var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.CopyTable = (function (qd, qdNew) {
    'use strict';

    var constants = qd.FormsViewer.qRules.Constants,
        optionalParameters = [
        {
            name: constants.paramDsNameSrc,
            description: 'dsnamesrc'
        },
        {
            name: constants.paramDsNameDest,
            description: 'dsnamedest'
        },
        {
            name: constants.paramXpathDest,
            description: 'xpathdest'
        },
        {
            name: constants.paramEmpty,
            description: 'empty'
        }],
        requiredParameters = [{
            name: constants.paramTableSrc,
            description: 'tablesrc'
        },
        {
            name: constants.paramRowSrc,
            description: 'rowsrc'
        },
        {
            name: constants.paramTableDest,
            description: 'tabledest'
        },
        {
            name: constants.paramRowDest,
            description: 'rowdest'
        }],
        copyTableErrorFailedToSelectSourceTable = "Failed to select the source table to {0}.",
        copyTableErrorFailedToSelectDestinationTable = "Failed to select the destination table to {0} to.",
        copyTableErrorFailedToSelectSourceRow = "Failed to select any source rows to {0}.",
        copyTableErrorFailedToSelectDestinationRow = "Failed to select the destination row to {0} to.",
        copyTableErrorStructureMismatch = "The table row of the source and destination must contain the same number of elements and attributes.",
        copyTableErrorDeepTables = "Copy Table does not work with tables containing groups. Instead, use the Insert command and then XPath or SetValue to populate your values.",
        copyTableErrorFailedToAdd = "Failed to add copied rows to destination table.",
        copyTableErrorFailedToDelete = "Failed to empty rows from source table.",
        isMove = false,//TODO:Check as its implemented for CopyTable
        cmd = isMove ? "move" : "copy";

    function createError(name, message, stackMessage) {
        var error = new Error(message);
        error.name = name;

        //TODO:Confirm stack message implemented correctly, not used anywhere?
        if (stackMessage) {
            error.stack = stackMessage;
        }

        return error;
    }

    function CopyTable(params) {

        var cf = params.commonFunctions;

        var isInside = false,
            xPathNodeTypeWhitespace = 6;
        function nodeList(nodes) {
            //TODO:Check
            return nodes
                .map(function (node) {
                    if (node.getNode) {
                        return node.localName();
                    }
                    return node.localName;
                });
        }

        function copyAttributes(xPathEngine, srcNode, destNode) {
            var attributes = srcNode.selectNodes("@*");
            for (var i = 1; i <= attributes.length; i++) {
                // NOTE: We cannot handle the case where an optional attribute is missing from the source.
                //		 This will cause the code to fail with an exception.

                // Skip xsi:nil on destination.
                var srcAttr = srcNode.selectSingle("@*[position() = " + i + "]");
                //TODO:Check NamespaceUri
                if (srcNode.namespaceURI() === cf.xmlInstanceNamespace) {
                    continue;
                }

                var destAttr = cf.selectNodeFromXPathEngine(xPathEngine, "@*[position() = " + i + "]", destNode);
                qd.util.setNodeValue(destAttr, srcAttr.value());
            }
        }

        function copyElements(srcNode, destNode, isInside) {
            var srcChildren = srcNode.selectNodes("*");

            var destChildren = qdNew.xmlUtility.getChildElements(destNode);

            srcChildren.forEach(function(srcChild, i) {
                qd.util.copyNodeContent(srcChild.getNode(), destChildren[i]);
            });
            //TODO: Else condition not implemented in C#.
        }

        function testNodeStructure(xPathEngine, srcNode, destNode, isInside) {
            var srcNodes = srcNode.selectNodes("*/*[namespace-uri() != 'http://www.w3.org/1999/xhtml']");
            if (srcNodes.length) {
                throw createError('InvalidOperationException', copyTableErrorDeepTables);
            }

            var srcAttributes = srcNode.selectNodes(String.format("@*[namespace-uri() != '{0}']", cf.xmlInstanceNamespace)),
                destAttributes = cf.selectNodeListFromXPathEngine(xPathEngine,
                destNode,
                String.format("@*[namespace-uri() != '{0}']", cf.xmlInstanceNamespace));

            if (srcAttributes.length !== destAttributes.length) {
                var srcList = nodeList(srcAttributes),
                    destList = nodeList(destAttributes);

                throw createError('InvalidOperationException', copyTableErrorStructureMismatch,
                    String.format("Source attribute count: {0}. Destination attribute count: {1}. Source attribute name list: {2}. Destination attribute name list: {3}.",
                    srcAttributes.length, destAttributes.length, srcList.join(), destList.join()));
            }

            if (!isInside) {
                var srcElements = srcNode.selectNodes("*"),
                    destElements = cf.selectNodeListFromXPathEngine(xPathEngine,
                    destNode, "*");

                if (srcElements.length !== destElements.length) {
                    var srcList = nodeList(srcElements),
                        destList = nodeList(destElements);

                    throw createError('InvalidOperationException', copyTableErrorStructureMismatch,
                        String.format("Source element count: {0}. Destination element count: {1}. Source element name list: {2}. Destination element name list: {3}.",
                        srcElements.length, destElements.length, srcList.join(), destList.join()));
                }
            }
        }

        function copyRow(xPathEngine, srcNode, destNode) {
            testNodeStructure(xPathEngine, srcNode, destNode, isInside);
            copyElements(srcNode, destNode, isInside);
            copyAttributes(xPathEngine, srcNode, destNode);

            if (isInside) {
                return;
            }

            isInside = true;

            var elements = srcNode.selectNodes('*');
            for (var i = 1; i <= elements.length; i++) {
                // Skip xsi:nil on destination.
                var srcElement = srcNode.selectSingle("*[position() = " + i + "]"),
                    destElement = cf.selectNodeFromXPathEngine(xPathEngine, "*[position() = " + i + "]", destNode);

                if (destElement) {
                    copyRow(xPathEngine, srcElement, destElement);
                }
            }
            isInside = false;
        }

        function copyRowsAsync(srcNodes, destRow, xPathEngine, isMove) {
            var count = 0;
            var addList = []; // List of rows to add to dest DOM. Add at end in case of error along the way.
            var deleteList = [];// List of rows to delete from source DOM. See below for details.

            return qd.util.runPromiseSequence(srcNodes,
                    function (lastResult, srcNode) {
                        if (lastResult && lastResult.shouldStop) {
                            return lastResult;
                        } else {
                            var destNode = destRow.cloneNode(true);
                            isInside = false;

                            copyRow(xPathEngine, srcNode, destNode);
                            addList.push(destNode.cloneNode(true));

                            if (isMove) {
                                deleteList.push(srcNode.cloneNode(true));
                            }

                            count += 1;
                        }
                    })
                .then(function () {
                    return {
                        count: count,
                        addList: addList,
                        deleteList: deleteList
                    };
                })
                .catch(function (e) {
                    throw new Error('An error occurred while copying rows: ' + e.message);
                });

        }

        function getDestRowAsync(template, dsnamedest, xpathdest) {
            return cf.getSampleData(template)
                .then(function (sampleData) {
                    var xPath = cf.getSampleData2dsXPath(dsnamedest, xpathdest);
                    var destRow = params.xpathEngine.evaluateXPath(xPath, {
                        context: sampleData
                    }).first();

                    if (!destRow) {
                        throw new Error(String.format(copyTableErrorFailedToSelectDestinationRow, cmd));
                    }

                    return destRow;
                });
        }

        function addRowsToDestAsync(destTables, addList, rowdest, empty) {
            return qd.util
                .runPromiseSequence(destTables, function (lastResult, destTable) {
                    if (empty) {
                        cf.deleteNodes(destTable, rowdest);
                    }

                    if (!addList.length) {
                        return;
                    }

                    //AddNils(dsnamedest, node);//TODO:AddNils Functionality
                    return destTable.appendChildrenAsync(addList.map(function (n) { return n.cloneNode(true); }));
                })
                .catch(function (e) {
                    throw new Error(copyTableErrorFailedToAdd);
                });
        }

        function deleteSourceNodes(deleteList) {
            try {
                // Delete queued up nodes.
                if (deleteList.length) {
                    deleteList.forEach(function (node) {
                        node.deleteSelf();
                    });
                }
            } catch (e) {
                throw new Error(copyTableErrorFailedToDelete);
            }
        }

        function executeAsync() {
            var xPathEngine = params.xpathEngine,
                dsnamesrc = cf.getParamValue(constants.paramDsNameSrc),
                tablesrc = cf.getParamValue(constants.paramTableSrc),
                rowsrc = cf.getParamValue(constants.paramRowSrc),
                dsnamedest = cf.getParamValue(constants.paramDsNameDest),
                tabledest = cf.getParamValue(constants.paramTableDest),
                rowdest = cf.getParamValue(constants.paramRowDest),
                full_rowdest = tabledest
                + (tabledest[tabledest.length - 1] === '/'
                    ? ''
                    : '/')
                + rowdest,
                empty = cf.getBoolParamValue(constants.paramEmpty),
                xpathdest = cf.getParamValue(constants.paramXpathDest),
                domSource = cf.getDataSource(dsnamesrc),
                domDest = cf.getDataSource(dsnamedest);

            //allow use of xpathdest to get the destination row            
            if (!xpathdest) {
                xpathdest = full_rowdest;
            }

            var sourceTable = cf.getValidNode(domSource, tablesrc, String.format(copyTableErrorFailedToSelectSourceTable, cmd));
            var destTables = cf.getValidNodeSet(domDest, tabledest, String.format(copyTableErrorFailedToSelectDestinationTable, cmd));
            var sourceRows = cf.getValidNodeSet(sourceTable, rowsrc, String.format(copyTableErrorFailedToSelectSourceRow, cmd));

            var pCopyResult = getDestRowAsync(params.template, dsnamedest, xpathdest)
                .then(function (destRow) {
                    return copyRowsAsync(sourceRows, destRow, xPathEngine, isMove);
                });

            return pCopyResult.then(function (copyResult) {
                return addRowsToDestAsync(destTables, copyResult.addList, rowdest, empty)
                    .then(function () {
                        deleteSourceNodes(copyResult.deleteList);
                    })
                    .then(function () {
                        return {
                            Result: copyResult.count,
                            Success: true
                        };
                    });
            });
        }

        return {
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters,
            executeAsync: executeAsync
        };
    }

    return CopyTable;

})(Qd, qd);