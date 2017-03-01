var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.RefreshSharePointListItems = (function (qd) {
    'use strict';
    var requiredParameters = [{
        name: 'dsname',
        description: 'Data source name for list data'
    }],
    optionalParameters = [{
        name: 'xpathsrc',
        description: 'Path to the repeating node in your SharePoint list'
    },
    {
        name: 'id',
        description: 'XPath to ID field(s) for SharePoint List ID'
    },
    {
        name: 'mapping',
        description: 'Mapping data source name'
    },
    {
        name: 'mappingName',
        description: 'Specify the mapping to refresh, refreshes all mappings in mapping file if not specified.'
    },
    {
        name: 'mode',
        description: 'Can be Report or Update'
    }],
    refreshSharePointListitemsMustIncludeMappingname = "Must include /mappingName if using /xpathsrc.",
    invalidListIdXpath = "Failed to select node for SharePoint List Id: {0}",
    sharepointListitemAttributeXpathQrulesLastModified = "@*[starts-with(local-name(), 'qRulesLastModified')]",
    unableToFindLastModifiedAtt = "Unable to find qRulesLastModified attribute.",
    errorInvalidVersion = "/xpathsrc parameter is only for use in InfoPath 2010.",
    errorFailedToRefresh = "Failed to refresh list items: {0}",
    refreshSharePointListitemsNothingToRefresh = "No list items to refresh. Verify parameters are correct.",
    errorNoModifiedNode = "Unable to find Modified field in data source.",
    unableToUpdateRtNode = "Unable to update rich text node for item {0}.";

    function processor(listItems) {
        //TODO:Swap getField and getFieldValues name.
        function getItem(shpItemId) {

            if (!listItems) {
                return null;
            }

            var filterItem = listItems.filter(function (item) {
                return item.get_id() === shpItemId;
            });

            if (filter.length === 0) {
                return null;
            }

            return filterItem[0];
        }

        function getFields(item) {
            return item.get_fieldValues();
        }

        function getField(item, name) {
            var fields = getFields(item);

            return fields[name];
        }

        function getModifiedDateTime(item) {
            var modifiedDate = getField(item, 'Modified');

            if (!modifiedDate) {
                throw new Error(errorNoModifiedNode);
            }

            return modifiedDate;
        }

        function getFieldValue(item, name) {
            return item.get_item(name);
        }

        function getFieldRichTextValue(item, field) {
            return getFieldValue(item, field);
        }

        function isLookup(item, name) {
            var fieldValue = getFieldValue(item, name);

            return fieldValue instanceof SP.FieldLookupValue;
        }

        function isBoolean(item, name) {
            // TODO: Check and implement.
            return false;
        }

        function hasField(item, name) {
            var fields = getFields(item);

            return Object.keys(fields).indexOf(name) >= 0;
        }

        return {
            getItem: getItem,
            getModifiedDateTime: getModifiedDateTime,
            getField: getField,
            getFieldRichTextValue: getFieldRichTextValue,
            getFieldValue: getFieldValue,
            isLookup: isLookup,
            isBoolean: isBoolean,
            hasField: hasField
        };
    }

    function refresher(commonFunction, sharePointCommon, shpAccess) {
        var listRefreshReport = [],
            refreshErrors = [];

        function logMappingNotice(mapping, messageFormat) {
            var namePart = mapping.mappingName
                ? String.format('"{0}"', mapping.mappingName)
                : '';

            listRefreshReport.push(String.format(messageFormat, namePart));
        }

        function noteSkippedMappingNoId(mapping) {
            logMappingNotice(mapping, "Skipping mapping {0}. No ID XPath specified.\n");
        }

        function noteSkippedMappingNoItems(mapping) {
            logMappingNotice(mapping, "Skipping mapping {0}. No nodes to refresh.");
        }

        function selectNodesToRefresh(baseNodes, mapping) {
            var nodePath = mapping.hasBasePath ? mapping.basePath : '.',
                nodesToRefresh = [];

            baseNodes.forEach(function (baseNode) {
                var selectedNodes = commonFunction.getNodes(baseNode, nodePath);

                nodesToRefresh = nodesToRefresh.concat(selectedNodes);
            });

            return nodesToRefresh;
        }

        function checkIdNode(mapping, idPath, nodes) {
            //verify that id param will get a node - case 33504
            var idNodes = nodes.map(function (node) {
                return node.selectSingle(idPath);
            });

            if (idNodes.length === 0) {
                throw new Error(String.format(invalidListIdXpath, idPath));
            }

            var lmAttNodes = idNodes.map(function (node) {
                return node.selectSingle(sharepointListitemAttributeXpathQrulesLastModified);
            });

            if (lmAttNodes.length === 0) {
                throw new Error(unableToFindLastModifiedAtt);
            }
        }

        function generateListDataDoc(mapping, mappedNodes) {
            var listData = [];
            //TODO:Perf see if we can retrieve items in parallel or in 1 request.
            return qd.util.runPromiseSequence(mappedNodes,
                function (lastResult, mappedNode) {
                    if (lastResult && lastResult.shouldStop) {
                        return lastResult;
                    }
                    else {
                        var itemId = mappedNode.selectSingle(mapping.listIdPath).value();

                        return shpAccess.getListItemAsync(mapping.listUrl, mapping.listName, itemId)
                            .then(function (listItem) {
                                if (listItem) {
                                    listData.push(listItem);
                                }
                            });
                    }
                }).then(function () {
                    return listData;
                });
        }

        function getIdOrNull(node, idPath) {
            var idNode = node.selectSingle(idPath);
            if (!idNode) {
                return null;
            }

            return parseInt(idNode.value());
        }

        function getNodesWithIds(nodes, idXPath) {
            var nodesWithIds = nodes.map(function (nodeItem) {
                return {
                    id: getIdOrNull(nodeItem, idXPath),
                    node: nodeItem
                };
            });

            return nodesWithIds.filter(function (node) {
                return node.id;
            });
        }

        function getItemToUpdate(availableNodes, shpItemId) {
            var filteredNodes = availableNodes.filter(function (node) {
                return node.id === shpItemId;
            });

            return filteredNodes.length > 0
                ? filteredNodes[0].node
                : null;
        }

        function setRichTextValue(shpItemId, targetField, sourceFieldValue) {
            //TODO: Implement Rich Text Value.

            //return if source field value is null
            //if (!sourceFieldValue) {
            //    return;
            //}

            //var cleanedHtml = sourceFieldValue.replace(/(\?<=<[^<>]*\\w+\\s*=\\s*)(?!\")[^\\s>]*(?=[^<>]*>)/, '"$0"')
            //    .replace('&nbsp;', '&#xA0;'),
            //    originalValue = targetField.getInnerHtml();

            //try {
            //    var children = targetField.childNodes();
            //    commonFunction.deleteNodesCollection(children);

            //    if (cleanedHtml) {
            //        targetField.setInnerHtml('<div xmlns="http://www.w3.org/1999/xhtml">' + cleanedHtml + '</div>');
            //    }

            //} catch (e) {
            //    var error = String.format(unableToUpdateRtNode, shpItemId);
            //    listRefreshReport.push(error + ' ');
            //    refreshErrors.push(error);

            //    try {
            //        // Try to restore the field's value
            //        targetField.setInnerHtml(originalValue);
            //    }
            //    catch (e) { }
            //}

        }

        function updateRichTextField(processor, shpItemId, targetField, sourceItem, columnName) {
            var sourceFieldValue = processor.getFieldRichTextValue(sourceItem, columnName);

            return setRichTextValue(shpItemId, targetField, sourceFieldValue);
        }

        function getValueToUse(processor, sourceItem, columnName, originalValue) {
            if (!originalValue) {
                return '';
            }

            if (processor.isLookup(sourceItem, columnName)) {
                return originalValue.get_lookupId();
            }

            if (processor.isBoolean(sourceItem, columnName)) {
                return originalValue.toLowerCase();
            }

            return originalValue;
        }

        function updateFieldDataAsync(processor, targetField, sourceItem, columnName) {
            var originalValue = processor.getFieldValue(sourceItem, columnName),
                value = getValueToUse(processor, sourceItem, columnName, originalValue);

            return commonFunction.setNodeValueAsync(targetField, value);
        }

        function checkFieldForUpdateAsync(processor, shpItemId, shpListItem, itemToUpdate, fieldDefinition) {
            var fieldXPath = fieldDefinition.xPath,
                columnName = fieldDefinition.sharePointColumn,
                isRichText = fieldDefinition.isRichText;

            if (fieldXPath || !columnName) {
                var fieldValue,
                    targetField = itemToUpdate.selectSingle(fieldXPath);

                if (targetField) {
                    var sourceField = processor.hasField(shpListItem, columnName);

                    if (!sourceField) {
                        listRefreshReport.push(String.format("Warning: The field '{0}' was not found in the list.", columnName));
                    }
                    else {
                        if (isRichText) {
                            return updateRichTextField(processor, shpItemId, targetField, shpListItem, columnName);
                        }
                        else {
                            return updateFieldDataAsync(processor, targetField, shpListItem, columnName);
                        }
                    }
                }
            }

            return Q();
        }

        function updateFields(processor, fields, shpListItem, itemId, itemToUpdate) {
            return qd.util.runPromiseSequence(fields,
                function (lastResult, field) {
                    if (lastResult && lastResult.shouldStop) {
                        return lastResult;
                    }
                    else {
                        return checkFieldForUpdateAsync(processor, itemId, shpListItem, itemToUpdate, field);
                    }
                });
        }

        function updateLastModified(id, shpModifiedValue, itemToUpdate) {
            var lastMod = itemToUpdate.selectSingle(id + '/' + sharepointListitemAttributeXpathQrulesLastModified);

            if (lastMod) {
                return lastMod.setValueAsync(shpModifiedValue);
            }
            else {
                refreshErrors.push(unableToFindLastModifiedAtt);
                return Q();
            }
        }

        function handleNoLongerPresentItemAsync(settings, mapping, nodeWithIds, idXPath, shpItemId) {
            listRefreshReport.push(String.format('Item {0} is no longer present in SharePoint List. ', shpItemId));

            if (settings.isUpdate) {
                var item = getItemToUpdate(nodeWithIds, shpItemId);

                if (item) {
                    if (mapping.isRepeating) {
                        item.deleteSelf();
                    }
                    else {
                        return commonFunction.setNodeValueAsync(item.selectSingle(idXPath), '')
                        .then(function () {
                            listRefreshReport.push('Delete not available for non-repeating items. Id field has been cleared. ');
                        });
                    }
                }
                else {
                    throw new Error(String.format('Unexpected error. Could not find item to delete with ID "{0}".', shpItemId));
                }
            }

            return Q();
        }

        function checkForAllMatch(shpItems, matchCount) {
            if (matchCount > 0) {
                listRefreshReport.push(matchCount === shpItems.length
                    ? 'All items match. '
                    : String.format('{0} matching items found. ', matchCount));
            }
        }

        function processChanges(idXPath, settings, mapping, processor, mappedNodes) {
            var shpItems = mapping.baseNode.selectNodes('SharePointItems/SharePointItem'),
                fields = mapping.getFields(),
                mappingName = mapping.mappingName;

            if (mappingName) {
                listRefreshReport.push(String.format('Report for mapping: {0}. ', mappingName));
            }

            var nodesWithIds = getNodesWithIds(mappedNodes, idXPath),
                matchCount = 0,
                items = shpItems.map(function (shpItem) {
                    return {
                        id: parseInt(shpItem.selectSingle('Id').value()),
                        modified: shpItem.selectSingle('LastModified').value()
                    };
                });

            return qd.util.runPromiseSequence(items,
                function (lastResult, item) {
                    if (lastResult && lastResult.shouldStop) {
                        return lastResult;
                    }
                    else {
                        var shpListItem = processor.getItem(item.id);

                        if (shpListItem) {
                            var shpModifiedValue = processor.getModifiedDateTime(shpListItem),
                                modifiedTicks = Date.parse(item.modified),
                                shpItemLastModifiedValue = !Number.isNaN(modifiedTicks)
                                ? new Date(modifiedTicks)
                                : null;

                            if (shpModifiedValue && shpItemLastModifiedValue < shpModifiedValue) {
                                listRefreshReport.push(String.format('Item {0} does not match. ', item.id));

                                if (settings.isUpdate) {
                                    var itemToUpdate = getItemToUpdate(nodesWithIds, item.id);

                                    if (itemToUpdate) {
                                        return updateFields(processor, fields, shpListItem, item.id, itemToUpdate)
                                            .then(function () {
                                                return updateLastModified(idXPath, shpModifiedValue, itemToUpdate);
                                            });
                                    }
                                }
                            }
                            else {
                                matchCount++;
                            }
                        }
                        else {
                            return handleNoLongerPresentItemAsync(settings, mapping, nodesWithIds, idXPath, item.id).then(function () {
                                if (settings.isUpdate) {
                                    var refreshedNodes = selectNodesToRefresh(commonFunction.getDataSource(), mapping);

                                    sharePointCommon.updateFormItemList(refreshedNodes, idXPath, mapping);
                                }
                            });
                        }
                    }
                }).then(function () {
                    return checkForAllMatch(shpItems, matchCount);
                });
        }

        function generateListData(mapping, settings, idXPath, mappedNodes) {
            return generateListDataDoc(mapping, mappedNodes)
                .then(function (listItems) {

                    if (!listItems || listItems.length === 0) {
                        throw new Error(String.format(errorFailedToRefresh, refreshSharePointListitemsNothingToRefresh));
                    }

                    return processChanges(idXPath, settings, mapping, processor(listItems), mappedNodes);
                });
        }

        function processChildMappings(settings, mapping, mappedNodes) {
            var childMappings = settings.mappings.getChildMappings(mapping);

            return qd.util.runPromiseSequence(childMappings,
                function (lastResult, childMapping) {
                    if (lastResult && lastResult.shouldStop) {
                        return lastResult;
                    }
                    else {
                        return refreshSharePointListItems(settings, childMapping, mappedNodes);
                    }
                });
        }

        function refreshSharePointListItems(settings, mapping, baseNodes) {
            var idXPath = commonFunction.getIdPath(mapping, settings.idxPath);

            if (!idXPath) {
                noteSkippedMappingNoId(mapping);
                return Q();
            }

            var mappedNodes = selectNodesToRefresh(baseNodes, mapping);

            if (!mappedNodes || mappedNodes.length == 0) {
                noteSkippedMappingNoItems(mapping);
            }

            checkIdNode(mapping, idXPath, mappedNodes);

            return sharePointCommon.updateFormItemList(commonFunction, mappedNodes, idXPath, mapping)
                .then(function () {
                    return generateListData(mapping, settings, idXPath, mappedNodes);
                })
                .then(function () {
                    return processChildMappings(settings, mapping, mappedNodes);
                })
                .catch(function (e) {
                    refreshErrors.push(String.format(errorFailedToRefresh, e.message));
                });
        }

        return {
            listRefreshReport: listRefreshReport,
            refreshErrors: refreshErrors,
            refreshSharePointListItems: refreshSharePointListItems
        }
    }

    function RefreshSharePointListItems(params) {
        function executeAsync() {
            var commonFunction = params.commonFunction,
                mappingDsName = commonFunction.getParamValue('mapping', 'mapping'),
                mappingName = commonFunction.getParamValue('mappingName', ''),
                settings = {
                    dsName: commonFunction.getParamValue('dsname'),
                    idXPath: commonFunction.getParamValue('id', ''),
                    mode: commonFunction.getParamValue('mode', 'report'),
                    xPathSrc: commonFunction.getParamValue('xpathsrc', '')
                };

            settings.isUpdate = settings.mode.toLowerCase() === 'update';

            //if including xpathsrc, must include mapping name
            if (settings.xPathSrc && !mappingName) {
                throw new Error(refreshSharePointListitemsMustIncludeMappingname);
            }

            commonFunction.verifyDataConnectionExists(settings.dsName);

            settings.mappings = commonFunction.mappingSource(mappingDsName, mappingName);
            commonFunction.validateMappingName(mappingName, settings.mappings);

            var refresherObj = refresher(commonFunction, params.sharePointCommon, params.shpAccess),
                baseNode = [commonFunction.getDataSource()];

            return qd.util.runPromiseSequence(settings.mappings.topLevelMappings,
                function (lastResult, mapping) {
                    if (lastResult && lastResult.shouldStop) {
                        return lastResult;
                    }
                    else {
                        return refresherObj.refreshSharePointListItems(settings, mapping, baseNode);
                    }
                }).then(function () {
                    return {
                        Error: refresherObj.refreshErrors.join(" | "),
                        Result: refresherObj.listRefreshReport.join(),
                        Success: refresherObj.refreshErrors.length === 0
                    }
                });
        }

        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters
        }
    }

    return RefreshSharePointListItems;
})(Qd);