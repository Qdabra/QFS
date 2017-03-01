var Qd = Qd || {};
var qd = qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.SubmitToSharePointList = (function (qd, qdNew) {
    'use strict';

    var optionalParameters = [{
        name: 'mapping',
        description: 'Mapping Data Connection Name - default is mapping'
    },
    {
        name: 'mappingName',
        description: 'Name of mapping to submit if not submitting all mappings in a mapping file'
    },
    {
        name: 'id',
        description: 'Path to Id field for SharePoint List Id (required if adding attachments, pre-4.2 mapping - can be indicated in mapping file for 4.2 and later.)'
    },
    {
        name: 'dsname',
        description: 'Data Source For AddAttachment Method (SharePoint Lists Web Service)'
    },
    {
        name: 'xpath',
        description: 'XPath to attachment field  (pre-4.2 mapping - can be indicated in mapping file for v4.2 and later)'
    },
    {
        name: 'name',
        description: 'Name for file (extension will be added by qRules)'
    },
    {
        name: 'namexpath',
        description: 'Relative XPath for name field'
    },
    {
        name: 'uniqueName',
        description: 'Prepend date and time information to the file name to provide a unique name (yes | no)'
    },
    {
        name: 'clear',
        description: '(yes | no)- indicates whether to clear the attachment field on successful upload. Default is yes.'
    },
    {
        name: 'ssappid',
        description: 'Secure store application id to use if user is logged in anonymously'
    }],
    requiredParameters = [{
        name: 'submit',
        description: 'Sharepoint List Service Submit Connection Name'
    }],
    failedToGetMapping = 'Failed to get mapping. {0}',
    failedToGetMappingForName = "Can't find mapping node for mapping name {0}.",
    invalidListIdXpath = "Failed to select node for SharePoint List Id: {0}",
    attachmentWithoutId = "Adding attachments requires specifying the ID either in the mapping or the command.";

    function submitter() {

        function selectNodesToMap(commonFunction, baseNodes, mapping) {
            var path = mapping.hasBasePath ? mapping.basePath : '.',
                selectedNodesToMap;

            baseNodes.forEach(function (base) {
                var selectedNodes = commonFunction.getNodes(base.node, path),
                    mappedNodes = selectedNodes.map(function (selectedNode) {
                        return {
                            parentId: base.id,
                            node: selectedNode
                        }
                    });

                if (!selectedNodesToMap || selectedNodesToMap.length == 0) {
                    selectedNodesToMap = mappedNodes;
                }
                else {
                    selectedNodesToMap = selectedNodesToMap.concat(mappedNodes);
                }
            });

            return selectedNodesToMap;
        }

        function checkIdNode(idPath, nodes) {
            var filterNodes = nodes.filter(function (nodeItem) {
                return nodeItem.node.selectSingle(idPath) !== null;
            });

            if (!idPath || (filterNodes && filterNodes.length > 0)) {
                return;
            }

            throw new Error(String.format(invalidListIdXpath, idPath));
        }

        function getAttachmentXPath(mapping, attachXpath) {
            //as of 4.2, indicating attachment field in the mapping so that we can loop through the mapping to submit to all lists.
            //if both are included, defaulting to the param

            if (!attachXpath) {
                var attachFieldFilter = mapping.getFields().filter(function (fieldItem) {
                    return fieldItem.isAttachment;
                });

                if (attachFieldFilter.length > 0) {
                    attachXpath = attachFieldFilter[0].xPath;
                }
            }

            return attachXpath;
        }

        function checkHasAttachments(attachDsName, attachXPath) {
            //if there is a dsname and an xpath for including attachments, there must be an id - we have to have the item ID to know what to attach to
            return attachDsName && attachXPath;
        }

        function checkAttachmentPreReqs(attachXPath, attachDsName, idXPath) {
            var hasAttachments = checkHasAttachments(attachDsName, attachXPath);

            //data connection is verified in Attach to ShP List method
            if (hasAttachments) {
                if (!idXPath) {
                    throw new Error(attachmentWithoutId);
                }
            }

            return hasAttachments;
        }

        function getDateFieldValue(value) {
            if (value === '') {
                return null;
            }

            var dateSpec = qdNew.util.parseIsoDate(value);

            if (!dateSpec) {
                throw new Error("Could not submit to list, invalid date format.");
            }

            dateSpec.omitMilliseconds = true;

            return qdNew.util.makeIsoDate(dateSpec);
        }

        function getFieldHtml(node) {
            if (!node.childNodes) {
                return null;
            }

            return $('<div>').append($(node.childNodes).clone()).html();
        }

        function getValueForFieldMapping(fieldItem, nodeMap) {
            if (fieldItem.isParentId) {
                return nodeMap.parentId;
            }
            if (!fieldItem.xPath) {
                return null;
            }

            var selectedNode = nodeMap.node.selectSingle(fieldItem.xPath);
            if (!selectedNode) {
                return null;
            }

            if (fieldItem.isRichText) {
                // .html() doesn't work on XML nodes in IE
                return getFieldHtml(selectedNode.getNode());
            }

            var nodeValue = selectedNode.value();
            if (fieldItem.isDate) {
                return getDateFieldValue(nodeValue);
            }

            return nodeValue;
        }

        function getItemArray(nodesToMap, mapping) {
            return nodesToMap.map(function (nodeMap) {
                var nodeItem = {
                    node: nodeMap,
                    fieldArray: mapping.getFields()
                        .map(function (fieldItem) {
                            var value = getValueForFieldMapping(fieldItem, nodeMap);

                            if (value === null) {
                                return null;
                            }

                            return {
                                internalName: fieldItem.sharePointColumn,
                                value: value,
                                isId: fieldItem.isId,
                                xPath: fieldItem.xPath,
                                isDate: fieldItem.isDate
                            };
                        })
                        .filter(function (item) {
                            return item;
                        })
                };

                var idNode = getIdNode(nodeItem.fieldArray, nodeMap.node);
                if (idNode) {
                    nodeItem.Id = parseInt(idNode.value());
                }

                return nodeItem;
            });
        }

        function getIdNode(fieldArray, node) {
            var filteredColumn = fieldArray.filter(function (item) {
                return item.isId;
            });

            if (filteredColumn && filteredColumn.length > 0) {
                return node.selectSingle(filteredColumn[0].xPath);
            }
            return null;
        }

        function idFromResult(data, item, index) {
            return SharePointAccess.isAppOnlyMode
                ? data[index].Id
                : item.listItem.get_id();
        }

        function submitToListSuccessCallback(resultData, itemArray) {
            var index = 0,
                nodesList = [];

            return qd.util.runPromiseSequence(itemArray,
                function (lastResult, item) {
                    var idNode = getIdNode(item.fieldArray, item.node.node);
                    var itemId = idFromResult(resultData, item, index);

                    nodesList.push({ node: item.node.node, id: itemId });

                    index += 1;
                    if (idNode) {
                        return idNode.setValueAsync(itemId);
                    }
                })
                .then(function () {
                    return {
                        success: true,
                        items: nodesList
                    };
                });
        }

        function processChildMappingsAsync(mapping, settings, baseItems, commonFunction, shpAccess, qfsAccess) {
            var childMappings = settings.mappings.getChildMappings(mapping),
                error = [];

            return qd.util.runPromiseSequence(childMappings,
                function (lastResult, childMapping) {
                    return performSubmitAsync(commonFunction, childMapping, settings, baseItems, shpAccess, qfsAccess)
                        .then(function (data) {
                            if (data && !data.success) {
                                error = error.concat(data);
                            }
                        });
                })
                .then(function () {
                    return error;
                });
        }

        function submitContainerToListAsync(container, shpAccess, qfsAccess) {
            return SharePointAccess.isAppOnlyMode
                ? qfsAccess.submitToListAsync(container)
                : shpAccess.submitToListAsync(container);
        }

        function performSubmitAsync(commonFunction, mapping, settings, baseNodes, shpAccess, qfsAccess) {
            var idxPath = commonFunction.getIdPath(mapping, settings.idxPath),
                nodesToMap = selectNodesToMap(commonFunction, baseNodes, mapping),
                hasDeletes = mapping.baseNode.selectNodes('SharePointItems/SharePointItem').length !== 0,
                error = [];

            if (!nodesToMap.length && !hasDeletes) {
                // Nothing to map. Log message?
                return Q();
            }

            //only check id if there are nodes to map
            if (nodesToMap.length) {
                checkIdNode(idxPath, nodesToMap);
            }

            var attachXpath = getAttachmentXPath(mapping, settings.attachSettings.xPath),
                hasAttachements = checkAttachmentPreReqs(attachXpath, settings.attachSettings.dsName, idxPath);

            var itemArray = getItemArray(nodesToMap, mapping),
                list = mapping.listName,
                container = {
                    itemArray: itemArray,
                    siteUrl: mapping.listUrl,
                    listId: list.id,
                    listName: list.name,
                    useName: list.useName
                };

            return submitContainerToListAsync(container, shpAccess, qfsAccess)
                .then(function (data) {
                    return submitToListSuccessCallback(data, itemArray);
                }, function (error) {
                    return {
                        success: false,
                        listName: list.useName ? list.name : list.id
                    };
                })
                .then(function (data) {
                    //return if no data i.e. no mapping found.
                    if (!data) {
                        return;
                    }

                    if (data.success) {
                        return processChildMappingsAsync(mapping, settings, data.items, commonFunction, shpAccess, qfsAccess)
                            .then(function (res) {
                                error = error.concat(res);
                            });
                    } else {
                        error.push(data.listName);
                    }
                })
                .then(function () {
                    return error;
                });
        }

        return {
            performSubmitAsync: performSubmitAsync
        };
    }

    function SubmitToSharePointList(params) {

        var shpAccess = params.shpAccess;

        function performSubmitToList(settings) {
            var ds = params.dataSources.getDom(),
                error = [];

            return qd.util.runPromiseSequence(settings.mappings.topLevelMappings,
                function (lastResult, mapping) {
                    if (lastResult && lastResult.shouldStop) {
                        return lastResult;
                    }
                    else {
                        var submitterObj = submitter(),
                            baseNodes = [{
                                node: ds,
                                id: ''
                            }];
                        return submitterObj.performSubmitAsync(params.commonFunction, mapping, settings, baseNodes, shpAccess, params.qfsAccess)
                        .then(function (resultErrors) {
                            //return if no data i.e. no mapping found.
                            if (!(resultErrors && resultErrors.length)) {
                                return;
                            }
                            error = error.concat(resultErrors);
                            //if (data && data.success) {
                            //    return processChildMappingsAsync(mapping, settings, baseNodes);
                            //} else {
                            //    error.push(data.listName);
                            //}
                        });
                    }
                }).then(function () {
                    return error;
                });
        }

        function executeAsync() {
            var commonFunction = params.commonFunction,
                mappingDsName = commonFunction.getParamValue('mapping', 'mapping'),
                mappingName = commonFunction.getParamValue('mappingName', ''),
                ssappid = commonFunction.getParamValue('ssappid', ''),
                settings = {
                    submitDsName: commonFunction.getParamValue('submit'),
                    idxPath: commonFunction.getParamValue('id', ''),
                    attachSettings: {
                        xPath: commonFunction.getParamValue('xpath', ''),
                        name: commonFunction.getParamValue('name', ''),
                        nameXPath: commonFunction.getParamValue('namexpath'),
                        clear: commonFunction.getBoolParamValue('clear', true),
                        uniqueName: commonFunction.getBoolParamValue('uniqueName', false),
                        dsName: commonFunction.getParamValue('dsname', '')
                    }
                };

            //just verify the submit at this point - we will verify the mapping when the mapping nodes are returned
            commonFunction.verifyDataConnectionExists(settings.submitDsName);

            settings.mappings = commonFunction.mappingSource(mappingDsName, mappingName);

            commonFunction.validateMappingName(mappingName, settings.mappings);

            return performSubmitToList(settings)
                .then(function (data) {
                    var errorMessage = data && data.length !== 0
                        ? String.format('Could not insert data in the list : {0}', data.join())
                        : '';

                    return {
                        Error: errorMessage,
                        Success: errorMessage === ''
                    };
                });
        }

        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters
        }
    }

    return SubmitToSharePointList;

})(Qd, qd);