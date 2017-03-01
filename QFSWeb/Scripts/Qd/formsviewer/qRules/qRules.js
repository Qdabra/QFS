var Qd = Qd || {},
    qd = qd || {};

Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

qd.qRules = Qd.FormsViewer.qRules = (function (qd, qdNew) {
    "use strict";

    var errorInvalidPath = "Error: No nodes were found using the specified XPath.",
        sampledata2dsXpathPrefix = "/*/xd:DataConnection[@Name='{0}']",
        errorMissingDataConnection = "Error: The specified data connection is not present: ",
        errorMissing2ds = "Error: The specified secondary DOM is not present: ",
        qdabraRulesDataSource = 'QdabraRules',
        qdabraRulesUseBrowserApiXpath = "/QdabraRules/Form/@useBrowserApi",
        sharePointListitemAttributeXpathQrulesLastmodified = "@*[starts-with(local-name(), 'qRulesLastModified')]",
        removePiErrorPiNotFound = 'The specified processing-instruction was not found.',
        qRulesIsSwappingDomXPath = '/QdabraRules/@isSwappingDom',
        dbxlProcessingInstructionName = "QdabraDBXL",
        newLine = '\r\n',
        newLineTab = newLine + '\t',
        qRulesExecutionHistoryPath = '/QdabraRules/ExecutionHistory';

    ///Method to get named groups using XRegExp.
    function getNamedGroups(regExpPattern, value) {
        var regExp = XRegExp(regExpPattern, 'gi');
        var isMatch = regExp.test(value);

        if (!isMatch) {
            return null;
        }
        return XRegExp.exec(value, regExp);
    }

    function getCommandType(commandName, parameters) {
        if (commandName) {
            var commandFunction = Qd.FormsViewer.qRules[commandName];
            if (commandFunction) {
                return commandFunction(parameters);
            }
        }
    }

    function selectNodeListFromXPathEngine(xPathEngine, node, xPath) {
        return xPathEngine.evaluateXPath(xPath, {
            context: node
        }).toArray();
    }

    function selectNodeFromXPathEngine(xPathEngine, xPath, context, errorMessage) {
        var nodeList = selectNodeListFromXPathEngine(xPathEngine, context, xPath);

        var node = nodeList.length > 0
            ? nodeList[0]
            : null;

        if (!node && errorMessage) {
            throw new Error(errorMessage);
        }

        return node;
    }

    function formatParameters(parameters, formatString) {
        return parameters.map(function (item) {
            return String.format(formatString, item.name, item.description || item.name);
        });
    }

    function getUsageTextForCommand(optionalParameters, requiredParameters, commandName) {
        var formattedParameters = formatParameters(requiredParameters, "/{0}={1}")
            .concat(formatParameters(optionalParameters, "[/{0}={1}]")),
            usageText = String.format("Usage is:{0}{0}{2}{1}{3}",
            newLine,
            newLineTab,
            commandName,
            formattedParameters.join(newLineTab));

        return usageText;
    }

    function setNodeValueFromXPathEngine(xPathEngine, xpath, context, value) {
        var nodeItem = selectNodeFromXPathEngine(xPathEngine, xpath, context);

        if (!nodeItem) {
            console.error('Could not find node for XPath ' + xpath);
        } else {
            qd.util.setNodeValue(nodeItem, value);
        }
    }

    function commonFunctions(parameterArray, dataSources, dataConnections, template, viewManager, settings) {
        var xslTransforms = {},
            xmlInstanceNamespace = 'http://www.w3.org/2001/XMLSchema-instance';

        function getElementValue(sourceArray, key, value) {
            if (!sourceArray || sourceArray.length === 0 || !key || !value) {
                return null;
            }

            var elements = $.grep(sourceArray, function (item, index) {
                return item[key] === value;
            })

            if (!elements || elements.length === 0) {
                return null;
            }

            return elements[0];
        }

        function findParameter(parameterSet, name) {
            if (!parameterSet || parameterSet.length === 0) {
                // no parameters available
                return null;
            }

            var plainValueElement = getElementValue(parameterSet, "Key", name),
            plainValue = plainValueElement ? plainValueElement.Value : null,
            xpathValueElement = getElementValue(parameterSet, "Key", name + "-xpath"),
            xpathValue = xpathValueElement ? xpathValueElement.Value : null,
            dsNameValueElement = getElementValue(parameterSet, "Key", name + "-dsname"),
            dsNameValue = dsNameValueElement ? dsNameValueElement.Value : null;

            if (plainValue && xpathValue) {
                throw new Error(name + " and " + name + "-xpath cannot both be specified.");
            }
            if (dsNameValue && !xpathValue) {
                throw new Error(name + "-dsname cannot be specified unless " + name + "-xpath is specified.");
            }
            if (!(plainValue || xpathValue)) {
                return null;
            }

            return {
                Name: name,
                Value: plainValue,
                XPath: xpathValue,
                DSName: dsNameValue
            };
        }

        function removeParameter(parameterSet, parameter) {
            var parameterCollection = new Array(parameter.Name, parameter.Name + "-xpath", parameter.Name + "-dsname");

            parameterCollection.forEach(function (paramName, index) {
                var paramElement = getElementValue(parameterSet, "Key", paramName);
                if (paramElement) {
                    parameterSet.splice(parameterSet.indexOf(paramElement), 1);
                }
            });
        }

        function checkValidNode(node, errorMessage) {
            if (!node) {
                throw new Error(errorMessage);
            }

            return node;
        }

        function getValidNode(start, xPath, errorMessage) {
            return checkValidNode(start.selectSingle(xPath), errorMessage);
        }

        function validateParameters(validParameters, errorMessage) {
            var constants = qd.FormsViewer.qRules.Constants;
            var validParamIndex = (!validParameters
                ? 0
                : validParameters.length);

            // If no parameters were passed from the command, and none are expected, all is fine.
            if (validParamIndex === 0 && !parameterArray) {
                return true;
            }

            // No parameters are expected, some are present.
            //only an exception if parameterArray count > 2 or doesn't contain the result params
            if (validParamIndex === 0 && parameterArray) {
                if ((!parameterArray[constants.paramResultDs] && !parameterArray[constants.paramResultPath]) || parameterArray.length > 2) {
                    throw new Error(errorMessage);
                }
            }

            validParameters[validParamIndex] = "?" + constants.paramResultDs;
            validParameters[validParamIndex + 1] = "?" + constants.paramResultPath;

            // Params are expected. If none are present it is invalid.
            if (!parameterArray) {
                // Ensure all valid params are optional.
                validParameters.forEach(function (parameter, index) {
                    if (parameter.indexOf("?") !== 0) {
                        throw new Error(errorMessage);
                    }
                });

                return true;
            }

            var testParameter = parameterArray.slice(0),
            mustExist;

            validParameters.forEach(function (paramName, index) {
                var key = paramName;
                // Identify how to handle the param.
                mustExist = key.substr(0, 1) !== "?";

                // Remove the special charater for optional params.
                if (!mustExist) {
                    key = key.substr(1);
                }

                // Identify whether param exists in dictionary.
                var parameter = findParameter(testParameter, key);

                if (parameter) {
                    // Remove parameter for later tests.
                    removeParameter(testParameter, parameter);
                }

                // Validate against existence requirments.
                // We allow specifying blank parameters now, so a parameter's value must
                // be non-empty to qualify satisfy the mustExist requirement.
                // In the future, we may want a way of indicating parameters that are required
                // but can be blank.
                var isUnspecified = !parameter || !parameter.Value && !parameter.XPath;

                if (mustExist && isUnspecified) {
                    throw new Error("Required parameter unspecified: " + key + ". " + errorMessage);
                }
            });

            // Check for extraneous params.
            if (testParameter.length !== 0) {
                var keyList = (testParameter.map(function (testItem) {
                    return testItem.Key;
                })).join();
                throw new Error("Unexpected parameter(s): " + keyList + ". " + errorMessage);
            }

            return true;
        }

        function getBoolParamValue(key, defaultValue) {
            defaultValue = defaultValue || false;

            var paramValue = getParamValue(key, null);
            if (!paramValue) {
                return defaultValue;
            }

            paramValue = paramValue.toLowerCase();

            return paramValue === "yes" || paramValue === "true" || paramValue === "1";
        }

        function getIntParamValue(key, defaultValue, allowInvalid, allowBlanks) {
            if (typeof defaultValue === 'undefined') {
                defaultValue = 0;
            }

            if (typeof allowInvalid === 'undefined') {
                allowInvalid = true;
            }

            if (typeof allowBlanks === 'undefined') {
                allowBlanks = true;
            }

            var intValue,
                value = getParamValue(key, null);

            if (allowBlanks && !value) {
                return defaultValue;
            }
            var parsedValue = parseInt(value);

            if (Number.isNaN(parsedValue)) {
                if (allowInvalid) {
                    return defaultValue;
                }

                throw new Error(String.format("Value '{0}' for parameter '{1}' is not a valid integer.", value, key));
            }

            return parsedValue;
        }

        function getParamValue(key, defaultValue) {
            if (typeof defaultValue === 'undefined') {
                defaultValue = null;
            }

            var param = findParameter(parameterArray, key);

            if (param) {
                if (!param.XPath) {
                    return param.Value;
                }
                else {
                    var ds = dataSources.getDom(param.DSName),
                        errorMessage = "Could not find valid node for parameter " + param.Name + " at XPath " + param.XPath + (!param.DSName
                            ? ""
                            : " in data source " + param.DSName),
                            node = getValidNode(ds, param.XPath, errorMessage);

                    return node.value();
                }
            }
            else {
                return defaultValue;
            }
        }

        function getValidNodeSet(dom, xpath, errorMessage) {
            if (!dom) {
                throw new Error('Dom object is invalid');
            }

            var nodes = dom.selectNodes(xpath);
            errorMessage = errorMessage || errorInvalidPath;

            if (!nodes || nodes.length === 0) {
                throw new Error(errorMessage);
            }

            return nodes;
        }

        function getSampleData2dsXPath(dsname, xpath) {
            if (dsname && xpath.indexOf('xd:DataConnection[@Name=') === -1) {
                xpath = String.format(sampledata2dsXpathPrefix, dsname) +
                    (xpath.startsWith("/")
                    ? ''
                    : '/') +
                xpath;
            }

            return xpath;
        }

        function dataConnectionExists(domName) {
            if (!domName) {
                return false;
            }

            return dataConnections.exists(domName);
        }

        function verifyDataConnectionExists(domName) {
            // Iterate data connection collection verify existence.
            // Submit connections are only in the Data Connections collection.
            if (domName) {
                if (!dataConnectionExists(domName)) {
                    throw new Error(errorMissingDataConnection + domName);
                }
            }
        }

        function verifySecondaryDataSource(domName) {
            if (domName) {
                var ds = dataSources.getDom(domName);

                if (!ds) {
                    // If we reach here we know the item doesn't exist,
                    // so throw an error
                    throw new Error(errorMissing2ds + domName);
                }

                return ds;
            }

            return null;
        }

        /**
         * Returns a dataSourceNode for the root of the specified data source, or throws an error if not found
         */
        function getDataSource(dsName) {
            if (dsName) {
                return verifySecondaryDataSource(dsName);
            }

            return dataSources.getDom();
        }

        function useBrowserApis() {
            //TODO:Check implementation
            var qRuleDataSource = dataSources.getDom(qRuleDataSource);
            if (!qRuleDataSource) {
                return false;
            }

            var useBrowserApiNode = qRuleDataSource.selectSingle(qdabraRulesUseBrowserApiXpath),
                nodeValue = useBrowserApiNode ? useBrowserApiNode.value() : '';

            return nodeValue === 'true';
        }

        function mappingField(fieldMappingNode) {

            function isAttributeTrue(element, attributeName) {
                var attr = element.selectSingle(String.format('@*[local-name() = "{0}"]', attributeName));

                return attr &&
                    (attr.value() === 'true' || attr.value() === '1');
            }

            var formField = fieldMappingNode.selectSingle('*[local-name() = "FormField"]'),
                sharePointColumn = fieldMappingNode.selectSingle('*[local-name() = "SharePointColumn"]');
            if (!formField) {
                throw new Error('FormField element not found.');
            }

            if (!sharePointColumn) {
                throw new Error('SharePointColumn element not found.');
            }

            return {
                sharePointColumn: sharePointColumn.value(),
                xPath: formField.value(),
                isRichText: isAttributeTrue(formField, 'IsRichText'),
                isId: isAttributeTrue(formField, 'IsId'),
                isAttachment: isAttributeTrue(formField, 'IsAttachment'),
                isDate: isAttributeTrue(formField, 'IsDate'),
                isParentId: isAttributeTrue(formField, 'IsParentId')
            }
        }

        function mapping(mappingNode) {
            var pathLevel = '*[local-name() = "Properties"]/*[local-name() = "Level"]';

            function getMappingLevelNode(mappingNode) {
                return mappingNode.selectSingle(pathLevel);
            }

            function selectNodeValueOrBlank(node, xPath) {
                var selectedNode = node.selectSingle(xPath);

                return selectedNode
                    ? selectedNode.value()
                    : '';
            }

            function getMappingLevelnumber(mappingNode) {
                var levelNode = getMappingLevelNode(mappingNode);

                if (!levelNode) {
                    return 0;
                }

                var levelValue = parseInt(levelNode.value());
                if (!levelValue || Number.isNaN(levelValue)) {
                    return 0;
                }

                return levelValue;
            }

            function getParentMappingName(mappingNode) {
                return selectNodeValueOrBlank(mappingNode, '*[local-name() = "Properties"]/*[local-name() = "ParentMapping"]');
            }

            function getListName(mapping) {
                var listCollection = mapping.selectSingle('.//*[local-name() = "ListCollection"]');

                if (!listCollection) {
                    // Support pre-4.2 mappings
                    listCollection = mapping.selectSingle('//*[local-name() = "ListCollection"]');

                    if (!listCollection) {
                        throw new Error("Unable to find ListCollection element in mapping.");
                    }
                }

                var useName = listCollection.selectSingle('@*[local-name() = "useName"]'),
                    listName = listCollection.selectSingle('@*[local-name() = "ListName"]');

                return {
                    id: listCollection.value(),
                    useName: useName && useName.value() === 'true',
                    name: listName
                        ? listName.value()
                        : ''
                };
            }

            function getListIdPath(mapping) {
                var path = mapping.selectSingle('.//*[local-name() = "FormField"][@*[local-name() = "IsId"] = "true"]');

                return path
                    ? path.value()
                    : null;
            }

            function getRepeatingItemPath(mappingNode) {
                return mappingNode.selectSingle('.//*[local-name() = "RepeatingGroup"]').value();
            }

            function getMappingName(mappingNode) {
                return selectNodeValueOrBlank(mappingNode, '@*[local-name() = "mappingName"]');
            }

            function getSharepointListUrl(baseNode) {
                // qRules 4.2 changes the structure of the mapping file provided. 
                // However, there is still only one SharePoint List URL per mapping - that is, all lists need to be in the same site.
                return baseNode.selectSingle('//*[local-name() = "SharePointListURL"]').value();
            }

            function getIsRepeatingNode(node) {
                var isRepeating = node.selectSingle('*[local-name() = "IsRepeating"]');

                return isRepeating && (isRepeating.value() === 'true' || isRepeating.value() === '1');
            }

            function getFields() {
                return mappingNode.selectNodes('.//*[local-name() = "Mapping"]')
                    .map(function (nodeItem) {
                        return mappingField(nodeItem);
                    });
            }

            var basePath = getRepeatingItemPath(mappingNode),
                hasBasePath = !!(basePath && $.trim(basePath).length > 0);

            return {
                baseNode: mappingNode,
                level: getMappingLevelnumber(mappingNode),
                parent: getParentMappingName(mappingNode),
                listName: getListName(mappingNode),
                listIdPath: getListIdPath(mappingNode),
                basePath: basePath,
                mappingName: getMappingName(mappingNode),
                listUrl: getSharepointListUrl(mappingNode),
                isRepeating: getIsRepeatingNode(mappingNode),
                getFields: getFields,
                hasBasePath: hasBasePath
            };
        }

        function mappingSource(mappingDsName, mappingName) {
            var topLevelMappings = [],
                allMappings = [];

            function getMappingNodeXPath(mappingName) {
                var mappingNodeXPath = mappingName
                    ? '//Mappings[@mappingName = "' + mappingName + '"]'
                    : '//*[local-name() = "Mappings"]';

                return mappingNodeXPath;
            }

            //if mapping name has been provided, try to get the correct mapping for the mapping name
            var mappingNodeXPath = getMappingNodeXPath(mappingName),
                //mapping data connection existence will be verified as part of GetDataSource
                mappingNodes = getDataSource(mappingDsName)
                .selectNodes(mappingNodeXPath);

            if (!mappingNodes || mappingNodes.length === 0) {
                var namePart = mappingName
                    ? String.format("Can't find mapping node for mapping name {0}.", mappingName)
                    : '';

                throw new Error(String.format("Failed to get mapping. {0}", namePart));
            }

            function getChildMappings(mapping) {
                return allMappings.filter(function (mappingItem) {
                    return mappingItem.level === mapping.level + 1 &&
                        mapping.mappingName.toLowerCase() === mappingItem.parent.toLowerCase();
                });
            }

            mappingNodes.forEach(function (mappingNode) {
                var m = mapping(mappingNode);

                allMappings.push(m);

                if (m.level === 0) {
                    topLevelMappings.push(m);
                }
            });

            return {
                allMappings: allMappings,
                topLevelMappings: topLevelMappings,
                getChildMappings: getChildMappings
            };
        }

        function validateMappingName(mappingName, mappingSource) {

            var filterMapping = mappingSource.allMappings.filter(function (mapping) {
                return mapping.mappingName === mappingName && mapping.parent;
            });

            if (mappingName && filterMapping.length > 0) {
                var error = String.format('Mapping name {0} was explicitly specified, but it has a parent mapping. ' +
                    'Only top-level mappings can be explicitly specified as a parameter value.', mappingName);

                throw new Error(error);
            }
        }

        function getIdPath(mapping, idxPath) {
            return idxPath || mapping.listIdPath;
        }

        function getNodes(context, path) {
            return context.selectNodes(path);
        }

        function deleteNodes(dom, xpath) {
            var selectedNodes = dom.selectNodes(xpath);

            return deleteNodesCollection(selectedNodes);
        }

        function deleteNodesCollection(nodes) {
            if (!nodes || nodes.length == 0) {
                return;
            }

            nodes.forEach(function (node) {
                if (node) {
                    node.deleteSelf();
                }
            });

            return nodes.length;
        }

        function getPi(dom, name) {
            name = name.replace(/"/g, '&quot;');

            var pi = dom.selectSingle(String.format('/processing-instruction()[local-name() = "{0}"]', name));

            return pi;
        }

        function removePi(name, dsName) {
            var dom = getDataSource(dsName),
                pi = getPi(dom, name);

            if (pi) {
                pi.deleteSelf();

                return {
                    Success: true
                };
            }

            return {
                Error: removePiErrorPiNotFound,
                Success: false
            };
        }

        function setNodeValueAsync(dsNode, valueObject) {
            if (!dsNode) {
                return Q();
            }

            var value = valueObject;

            if (typeof valueObject === 'boolean') {
                value = value ? 'true' : 'false';
            }

            return dsNode.setValueAsync(value);
        }

        function selectAndSetNodeValueAsync(dsNode, xPath, valueObject) {
            var selectedNode = dsNode.selectSingle(xPath);

            return setNodeValueAsync(selectedNode, valueObject);
        }

        function getDataConnection(dsName) {
            verifyDataConnectionExists(dsName);

            return dataConnections.get(dsName);
        }

        function setIsSwappingDom(value) {
            var domQRules = dataSources.getDom(qdabraRulesDataSource);

            return selectAndSetNodeValueAsync(domQRules, qRulesIsSwappingDomXPath, value);
        }

        function getDbxlPIFromDsNode(dsNode) {
            var nodes = Array.prototype.slice.call(dsNode.childNodes),
                piMatches = nodes.filter(function (node) {
                    return node.nodeType === 7 && node.target === dbxlProcessingInstructionName;
                });

            return piMatches[0];
        }

        function getOrAddDbxlPIFromDsNode(dsNode) {
            var pi = getDbxlPIFromDsNode(dsNode);
            if (pi) {
                return pi;
            }

            var xdoc = qd.util.ownerDocument(dsNode),
                newPi = xdoc.createProcessingInstruction(dbxlProcessingInstructionName, 'docid="-1"'),
                dsNodeRoot = qd.util.getDocumentElement(xdoc);

            xdoc.insertBefore(newPi, dsNodeRoot);

            return newPi;
        }

        function setNodeListValueFromXPathEngine(xPathEngine, context, xPath, value) {
            var nodeList = selectNodeListFromXPathEngine(xPathEngine, context, xPath);

            nodeList.forEach(function (nodeItem) {
                qd.util.setNodeValue(nodeItem, value);
            });
        }

        function setDocumentIdToDbxlPi(navigator, docId, docType, name, author, description) {
            var pi = getOrAddDbxlPIFromDsNode(navigator);
            var piDoc = $.parseXML('<root docid="" doctype="" name="" author="" description="" />');

            var rootNode = qd.util.getDocumentElement(piDoc);

            rootNode.setAttribute('docid', docId);

            if (!docType) {
                rootNode.attributes.removeNamedItem('doctype');
            }
            else {
                rootNode.setAttribute('doctype', docType);
            }

            rootNode.setAttribute('name', name);
            rootNode.setAttribute('author', author);
            rootNode.setAttribute('description', description);

            var xml = qd.util.xmlToString(piDoc);

            // now remove '<root ' and '/>'
            if (xml.indexOf('<root ') === 0 &&
                xml.indexOf('/>') === xml.length - 2) {
                xml = xml.substr(6);
                xml = xml.substr(0, xml.length - 2);

                pi.nodeValue = xml;
                return;
                //return pi.setValueAsync(xml);
            }

            qd.util.setNodeValue(pi, String.format('docid="{0}"', docId));
        }

        function removeChildren(node) {
            //TODO:check

            node.childNodes().forEach(function (childNode) {
                childNode.deleteSelf();
            });
        }

        function setNil(node) {
            return Q().
                then(function () {
                    //TODO:check is correct condition, Original::!node.IsNode
                    if (!node || !node.getNode) {
                        return;
                    }

                    var nilNode = node.selectSingle(String.format('@*[namespace-uri() = "{0}"]', xmlInstanceNamespace));

                    //TODO:check is correct condition, Original::!node.IsNode
                    if (!nilNode || !nilNode.getNode) {
                        node.childNodes()
                            .forEach(function (childNode) {
                                childNode.deleteSelf();
                            });

                        try {
                            //TODO: Compare with original --->> node.CreateAttribute("xsi", "nil", XmlSchema.InstanceNamespace, "true");
                            node.getNode().setAttributeNS(xmlInstanceNamespace, 'xsi:nil', 'true');
                        } catch (e) {
                        }
                    }
                });
        }

        function verifyRequiredAttributesExist(node) {
            var constants = qd.FormsViewer.qRules.Constants;

            if (!node.selectSingle(constants.qdimageAttributeXpathQrulesFilename) ||
                !node.selectSingle(constants.qdimageAttributeXpathQruleslink)) {
                throw new Error(errorMissingRequiredAttributes);
            }
        }

        function loadTransformOptions(isView, useDocument) {

            function defaultValue() {
                return loadTransformOptions(false, false);
            }

            return {
                isView: typeof (isView) === 'undefined' ? false : isView,
                useDocument: typeof (useDocument) === 'undefined' ? false : useDocument,
                'default': defaultValue
            }
        }

        function getTransformFromXml(transformXml, useDocument) {
            if (typeof (useDocument) === 'undefined') {
                useDocument = false;
            }

            //TODO:Implement
            //try {
            //} catch (e) {
            //    throw new Error(errorLoadXsl + ' ' + e.message);
            //}


            return transformXml;
        }

        function loadTransform(fileName, isView, useDocument) {
            return template.getTemplateFileAsync(fileName)
                .then(function (stringXml) {
                    var xsltDoc = $.parseXML(stringXml);

                    if (isView) {
                        //Not supported currently.
                        //var xsltDocString = performActualTransform(xsltDoc, viewPreTransform());
                        //xsltDoc = $.parseXML(xsltDocString);
                    }

                    return getTransformFromXml(xsltDoc, useDocument);
                });
        }

        function getTransform(fileName, options, useCache) {
            if (useCache === 'undefined') {
                useCache = false;
            }

            var toUseOptions = options || loadTransformOptions().default(),
                properties = {
                    name: fileName,
                    isView: toUseOptions.isView,
                    useDocument: toUseOptions.useDocument
                };

            if (!useCache) {
                return loadTransform(fileName, toUseOptions.isView, toUseOptions.useDocument);
            }

            return Q()
                .then(function () {
                    if (xslTransforms[properties]) {
                        return xslTransforms[properties];
                    }

                    return loadTransform(fileName, toUseOptions.isView, toUseOptions.useDocument)
                        .then(function (transform) {
                            xslTransforms[properties] = transform;
                            return transform;
                        }).catch(function (e) {
                            throw new Error(transformErrorFailedToSelectTransform);
                        });
                });
        }

        function getTransformNew(fileName) {
            return template.getTemplateFileAsync(fileName)
                .then(function (file) {
                    var doc = $.parseXML(file);

                    return qdNew.xslt.compile(doc);
                });
        }

        function getSampleData(template) {
            if (!template) {
                throw new Error("Template not found");
            }

            return template.getTemplateFileAsync('sampledata.xml')
                .then(function (file) {
                    return $.parseXML(file);
                });
        }

        function setView(viewName) {
            if (!viewName) {
                throw new Error('View name cannot be blank.');
            }

            return viewManager.setCurrentView(viewName);
        }

        function getBase64Values(node) {
            if (!node) {
                return null;
            }
            var decoded = qd.util.File.decodeBase64Attachment(node.value()),
                bytes = decoded.bytes,
                base64Value = FVUtil.File.byteArrayToBase64(bytes),
                fileName = decoded.name,
                fileSize = bytes.length,
                extensionIndex = fileName.lastIndexOf('.'),
                fileExtension = fileName.substr(extensionIndex);

            return {
                fileName: fileName,
                fileExtension: fileExtension,
                fileSize: fileSize,
                base64: base64Value
            };
        }

        function getDoubleParamValue(key, defaultValue, allowInvalid, allowBlanks) {
            if (typeof defaultValue === 'undefined') {
                defaultValue = 0;
            }

            if (typeof allowInvalid === 'undefined') {
                allowInvalid = true;
            }

            if (typeof allowBlanks === 'undefined') {
                allowBlanks = true;
            }

            var value = getParamValue(key, null);

            if (allowBlanks && !value) {
                return defaultValue;
            }

            var doubleValue = parseFloat(value);
            if (Number.isNaN(doubleValue)) {
                if (allowInvalid) {
                    return defaultValue;
                }

                throw new Error(String.format("Value '{0}' for parameter '{1}' is not a valid number.", value, key));
            }

            return doubleValue;
        }

        function userName() {
            return settings.user && settings.user.get_loginName();
        }

        function getValidDate(value) {
            if (!value) {
                return null;
            }

            //append only if ISO format
            if (value.indexOf('T') > 0 && value.indexOf('Z') !== value.length - 1) {
                value += 'Z';
            }
            var dtParse = Date.parse(value);

            if (dtParse && !Number.isNaN(dtParse)) {
                return new Date(value);
            }

            return null;
        }

        function getIntegerValue(value) {
            if (!value) {
                return null;
            }

            return Number(value);
        }

        function getHolidayList(holidays) {
            var holidayList = [];

            if (!holidays || holidays.length == 0) {
                holidayList.push(new Date(1900, 0, 1));

                return holidayList;
            }

            holidays.forEach(function (holidayNode, index) {
                var date = getValidDate(holidayNode.value());
                if (date) {
                    //var dateMilliseconds = Date.parse(holidayNode.value());
                    //if (!Number.isNaN(dateMilliseconds)) {
                    //    var date = new Date(dateMilliseconds);

                    date = new Date(date.toDateString());//Remove time from date object

                    holidayList.push(date);
                }
            })

            return holidayList;
        }

        function isWeekendDay(dt) {
            var day = dt.getDay();
            return day === 0 || day === 6;
        }

        function getPassword(dsnamepass, passwordXPath, error) {
            return getValidNode(getDataSource(dsnamepass), passwordXPath, error);
        }

        return {
            validateParameters: validateParameters,
            getParamValue: getParamValue,
            checkValidNode: checkValidNode,
            getValidNode: getValidNode,
            getValidNodeSet: getValidNodeSet,
            getBoolParamValue: getBoolParamValue,
            getSampleData2dsXPath: getSampleData2dsXPath,
            verifyDataConnectionExists: verifyDataConnectionExists,
            getDataSource: getDataSource,
            useBrowserApis: useBrowserApis,
            mappingSource: mappingSource,
            validateMappingName: validateMappingName,
            getIdPath: getIdPath,
            getNodes: getNodes,
            deleteNodes: deleteNodes,
            removePi: removePi,
            getIntParamValue: getIntParamValue,
            getPi: getPi,
            deleteNodesCollection: deleteNodesCollection,
            setNodeValueAsync: setNodeValueAsync,
            selectAndSetNodeValueAsync: selectAndSetNodeValueAsync,
            getDataConnection: getDataConnection,
            setDocumentIdToDbxlPi: setDocumentIdToDbxlPi,
            setIsSwappingDom: setIsSwappingDom,
            removeChildren: removeChildren,
            selectNodeFromXPathEngine: selectNodeFromXPathEngine,
            loadTransformOptions: loadTransformOptions,
            getTransform: getTransform,
            getTransformNew: getTransformNew,
            verifySecondaryDataSource: verifySecondaryDataSource,
            setNil: setNil,
            verifyRequiredAttributesExist: verifyRequiredAttributesExist,
            selectNodeListFromXPathEngine: selectNodeListFromXPathEngine,
            setNodeListValueFromXPathEngine: setNodeListValueFromXPathEngine,
            setNodeValueFromXPathEngine: setNodeValueFromXPathEngine,
            getUsageTextForCommand: getUsageTextForCommand,
            getSampleData: getSampleData,
            xmlInstanceNamespace: xmlInstanceNamespace,
            setView: setView,
            getBase64Values: getBase64Values,
            getDoubleParamValue: getDoubleParamValue,
            environment: {
                userName: userName
            },
            xpathFunctions: function () {
                return settings.functions;
            },
            getValidDate: getValidDate,
            getIntegerValue: getIntegerValue,
            getHolidayList: getHolidayList,
            isWeekendDay: isWeekendDay,
            getPassword: getPassword
        };
    }

    function validateCommand(commandName, command, commonFunction) {

        function getParameterNames(parameters) {
            return Array.isArray(parameters)
                ? parameters.map(function (p) { return p.name })
                : Object.keys(parameters);
        }

        function getCommandParameters(optionalParameters, requiredParameters) {
            var commandParameters = getParameterNames(optionalParameters)
                .map(function (item) {
                    return "?" + item;
                })
                .concat(getParameterNames(requiredParameters));

            return commandParameters;
        }

        /**
         * If the provided value is a key-value object of parameter definitions, converts them to an array of parameter objects
         */
        function convertParameters(parameters) {
            if (Array.isArray(parameters)) {
                return parameters;
            }

            return Object.keys(parameters).map(function (key) {
                return { name: key, description: parameters[key] };
            });
        }

        function executeAsync() {
            return Q()
                .then(function () {
                    if (!commonFunction) {
                        throw new Error('Could not execute command, CommonFunction not found');
                    }

                    var optionalParameters = convertParameters(command.optionalParameters || []),
                        requiredParameters = convertParameters(command.requiredParameters || []),
                        commandParameters = getCommandParameters(optionalParameters, requiredParameters);

                    var usageText = getUsageTextForCommand(optionalParameters, requiredParameters, commandName);
                    commonFunction.validateParameters(commandParameters, usageText);

                    var execFunc = command.executeAsync || command.execute;

                    if (!execFunc) {
                        throw new Error('Command does not have an execution method.');
                    }

                    return execFunc.call(command);
                })
                .catch(function (e) {
                    console.error('qRules command failure: ', e);

                    return {
                        result: '',
                        success: false,
                        error: e.message
                    };
                });
        }

        return {
            executeAsync: executeAsync
        }
    }

    function sharePointCommon() {

        function getShpItemsGroup(mapping) {
            var mappingNode = mapping.baseNode,
                shpItemsGroup = mappingNode.selectSingle('SharePointItems');

            if (shpItemsGroup) {
                return Q(shpItemsGroup);
            }

            //if it does not exist, create it
            var sharePointItemNode = mappingNode.createElement('SharePointItems');

            return mappingNode.appendChildAsync(sharePointItemNode).then(function () {
                return mappingNode.selectSingle('SharePointItems');
            });
        }

        function appendSharePointItem(shpItemsGroup, id, lastModified) {
            var sharePointItem = shpItemsGroup.createElement('SharePointItem'),
                idItem = shpItemsGroup.createElement('Id'),
                lastModifiedItem = shpItemsGroup.createElement('LastModified');

            qd.util.setNodeValue(idItem, id);
            qd.util.setNodeValue(lastModifiedItem, lastModified);

            sharePointItem.appendChild(idItem);
            sharePointItem.appendChild(lastModifiedItem);

            return shpItemsGroup.appendChildAsync(sharePointItem);
        }

        function updateOrAddShpItem(shpItemsGroup, item) {
            var id = item.value(),
                lastModified = item.selectSingle(sharePointListitemAttributeXpathQrulesLastmodified).value();
            //see if item is already in list
            var shpItem = shpItemsGroup.selectSingle('SharePointItem[Id="' + id + '"]');

            //if not
            if (!shpItem) {
                //create item, populate, append
                // Case 36150 - We only need to append the created element to the SharePointItems group once
                return appendSharePointItem(shpItemsGroup, id, lastModified);
            }

            //else, update the last modified
            return shpItem.selectSingle('LastModified').setValueAsync(lastModified);
        }

        function updateFormItemList(commonFunction, nodes, pathToIds, mapping) {

            //try to get SharePointItem repeating group
            return getShpItemsGroup(mapping)
                    .then(function (shpItemsGroup) {
                        //try to get SharePointItem repeating group
                        var shpItems = shpItemsGroup.selectSingle('SharePointItem'),
                            xPath = String.format('{0}[. != "" and {1}]', pathToIds, sharePointListitemAttributeXpathQrulesLastmodified);

                        // Items in main DOM
                        var items = [];
                        nodes.forEach(function (node) {
                            var nodeItems = node.selectNodes(xPath);

                            items = items.concat(nodeItems);
                        });

                        //if count is different between SharePointItem and form items, delete the SharePointItem groups
                        if (shpItems && shpItems.length !== items.length) {
                            commonFunction.deleteNodes(shpItems);
                        }

                        //add or update items.
                        return qd.util.runPromiseSequence(items,
                            function (lastResult, item) {
                                if (lastResult && lastResult.shouldStop) {
                                    return lastResult;
                                }
                                else {
                                    return updateOrAddShpItem(shpItemsGroup, item);
                                }
                            });
                    });

        }

        return {
            updateFormItemList: updateFormItemList
        };
    }

    function utilities(commonFunction) {

        function createXPathEngine() {
            var xPathEngine = new XPathEngine(),
                nsr = new FVNamespaceResolver();

            nsr.addNamespace("dfs", "http://schemas.microsoft.com/office/infopath/2003/dataFormSolution");
            nsr.addNamespace("tns", "http://qdabra.com/webservices/");
            nsr.addNamespace("qws", "http://qdabra.com/webservices/");
            nsr.addNamespace("quk", "http://qdabra.com/querydbxldocumentwithuserkey");

            xPathEngine.nsr = nsr;

            return xPathEngine;
        }

        function getQueryNode(xPathEngine, dataSourceRoot, xPath, documentType) {
            var queryFields = selectNodeFromXPathEngine(xPathEngine, '/dfs:myFields/dfs:queryFields/tns:' + documentType, dataSourceRoot),
                node = queryFields
                    ? selectNodeFromXPathEngine(xPathEngine, xPath, queryFields)
                    : null;

            return node;
        }

        function getOrSetValue(node, value) {
            if (node) {
                if (typeof value === 'undefined') {
                    return qd.util.getNodeValue(node);
                }

                return qd.util.setNodeValue(node, value);
            }
        }

        function getOrSetNodeValue(xPathEngine, dataSourceRoot, documentType, xPath, nodeValue) {
            var queryNode = getQueryNode(xPathEngine, dataSourceRoot, xPath, documentType);

            //TODO: Throw error?
            if (!queryNode) {
                return;
            }

            return getOrSetValue(queryNode, nodeValue);
        }
        function submitDocumentAsUser(dsRoot, dataConn) {
            var dataSourceRoot = dsRoot,
                dataConnection = dataConn,
                xPathEngine = createXPathEngine(),
                exception,
                documentType = 'SubmitDocumentAsUser';

            function docTypeName(nodeValue) {
                getOrSetNodeValue(xPathEngine, dataSourceRoot, documentType, 'tns:docTypeName', nodeValue);
            }

            function userName(nodeValue) {
                getOrSetNodeValue(xPathEngine, dataSourceRoot, documentType, 'tns:submitAsUser', nodeValue);
            }

            function xml(nodeValue) {
                getOrSetNodeValue(xPathEngine, dataSourceRoot, documentType, 'tns:xml', nodeValue);
            }

            function name(nodeValue) {
                getOrSetNodeValue(xPathEngine, dataSourceRoot, documentType, 'tns:name', nodeValue);
            }

            function author(nodeValue) {
                getOrSetNodeValue(xPathEngine, dataSourceRoot, documentType, 'tns:author', nodeValue);
            }

            function description(nodeValue) {
                getOrSetNodeValue(xPathEngine, dataSourceRoot, documentType, 'tns:description', nodeValue);
            }

            function success() {
                var successNode = selectNodeFromXPathEngine(xPathEngine,
                    '/dfs:myFields/dfs:dataFields/tns:SubmitDocumentAsUserResponse/tns:SubmitDocumentAsUserResult/tns:Success', dataSourceRoot);

                return qd.util.getNodeValue(successNode) === 'true';
            }

            function getError(exception) {
                if (exception) {
                    return exception.message;
                }

                var errorNode = selectNodeFromXPathEngine(xPathEngine,
                    '/dfs:myFields/dfs:dataFields/tns:SubmitDocumentAsUserResponse/tns:SubmitDocumentAsUserResult/tns:Errors', dataSourceRoot);

                if (!errorNode || !qd.util.getNodeValue(errorNode)) {
                    return 'Error data unavailable';
                }

                return qd.util.getNodeValue(errorNode);
            }

            function failureResult(exception) {
                return {
                    success: false,
                    error: getError(exception)
                };
            }

            function querySubmitDocumentAsUser(docType, user, xmlData, nameData, authorData, desc) {
                docTypeName(docType);
                userName(user);
                xml(xmlData);
                name(nameData);
                author(authorData);
                description(desc);
                exception = null;

                var resultData = {
                    docId: '',
                    refId: '',
                    success: false
                };

                return dataConnection.executeAsync()
                    .then(function () {

                        var docIdNode = selectNodeFromXPathEngine(xPathEngine, '/dfs:myFields/dfs:dataFields/tns:SubmitDocumentAsUserResponse/tns:docId', dataSourceRoot);
                        //TODO:Throw error if node not present?

                        if (!docIdNode) {
                            return failureResult();
                        }

                        var docIdValue = qd.util.getNodeValue(docIdNode);

                        if (docIdValue === '-1') {
                            return failureResult();
                        }

                        var refIdNode = selectNodeFromXPathEngine(xPathEngine, '/dfs:myFields/dfs:dataFields/tns:SubmitDocumentAsUserResponse/tns:refId', dataSourceRoot);

                        if (!refIdNode) {
                            return failureResult();
                        }

                        return {
                            docId: docIdValue,
                            refId: qd.util.getNodeValue(refIdNode),
                            success: true
                        };
                    })
                    .catch(function (e) {
                        exception = e;

                        resultData.docId = '-1';
                        return resultData;
                    });
            }

            return {
                querySubmitDocumentAsUser: querySubmitDocumentAsUser
            };
        }

        return {
            submitDocumentAsUser: submitDocumentAsUser
        };
    }



    function qRules(dataConnections, dataSources, template, qfsAccess, xpathEngine, shpAccess, viewManager, settings) {

        function executeCommandInnerAsync(commandString) {
            var resultObject = {
                Error: '',
                Result: '',
                Success: false
            },
                namedGroups = getNamedGroups('^(?<Command>[a-zA-Z0-9]+)(?<Params>.+)?$', commandString);

            if (!namedGroups) {
                resultObject.Error = "Command format is invalid.";
                return Q(resultObject);
            }

            var command = namedGroups["Command"],
                params = namedGroups["Params"],
                positionArray = new Array();

            XRegExp.forEach(params, /(\s\/[a-z0-9]+(?:-xpath|-dsname)?=)/i, function (match, i) {
                positionArray.push(match.index);
            });

            var paramsArray = [],
                errorMessage = '';

            positionArray.forEach(function (paramPosition, index) {
                var paramString = index === (positionArray.length - 1)
                ? params.substr(paramPosition)
                : params.substr(paramPosition, positionArray[index + 1] - positionArray[index]);

                var paramGroup = getNamedGroups('^\\s\/(?<Key>[a-z0-9]+(?:-xpath|-dsname)?)=(?<Value>.*)$', paramString);

                if (!paramGroup && paramGroup.length !== 3) {
                    errorMessage += "Key,Value not found for param:" + paramString;
                    return;
                }

                var paramObject = new Object();
                paramObject.Key = paramGroup["Key"];
                paramObject.Value = paramGroup["Value"];

                paramsArray.push(paramObject);
            });

            if (paramsArray.length !== positionArray.length) {
                resultObject.Error = errorMessage;
                return Q(resultObject);
            }

            var commonFunctionObj = commonFunctions(paramsArray, dataSources, dataConnections, template, viewManager, settings, xpathEngine.functions),
                parameter = {
                    commonFunction: commonFunctionObj,
                    commonFunctions: commonFunctionObj,
                    dataConnections: dataConnections,
                    dataSources: dataSources,
                    qfsAccess: qfsAccess,
                    shpAccess: shpAccess,
                    sharePointCommon: sharePointCommon(),
                    template: template,
                    utilities: utilities(commonFunctionObj),
                    xpathEngine: xpathEngine
                },
            commandType = getCommandType(command, parameter);
            if (commandType) {

                var validateObject = validateCommand(command, commandType, parameter.commonFunction);

                return validateObject.executeAsync()
                    .catch(function (e) {
                        console.error("Command failure: ", e);
                        return {
                            Error: e.message
                        };
                    });
            }

            resultObject.Error = 'Unsupported command: ' + command;
            return Q(resultObject);
        }

        function populateHistory(commandString, commandResultData) {
            var qRulesDom = dataSources.getDom(qdabraRulesDataSource);
            if (!qRulesDom) {
                return;
            }

            var executionHistory = qRulesDom.selectSingle(qRulesExecutionHistoryPath);
            if (!executionHistory) {
                return;
            }

            var historyNode = executionHistory.createElement('History'),
                commandNode = executionHistory.createElement('Command'),
                resultNode = executionHistory.createElement('Result'),
                successNode = executionHistory.createElement('Success'),
                errorNode = executionHistory.createElement('Error');

            qd.util.setNodeValue(commandNode, commandString);
            qd.util.setNodeValue(resultNode, commandResultData.result);
            qd.util.setNodeValue(successNode, commandResultData.success);
            qd.util.setNodeValue(errorNode, commandResultData.error);

            historyNode.appendChild(commandNode);
            historyNode.appendChild(resultNode);
            historyNode.appendChild(successNode);
            historyNode.appendChild(errorNode);

            return executionHistory.appendChildAsync(historyNode);
        }

        function formatResultData(result) {
            var resultData = 'result' in result ? result.result : result.Result;
            if (typeof resultData === 'number') {
                return resultData;
            }

            return resultData || '';
        }

        function normalizeResult(result) {
            if (result) {
                if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
                    return {
                        success: true,
                        result: result.toString(),
                        error: ''
                    };
                }

                return {
                    success: ('success' in result ? result.success : result.Success) || false,
                    result: formatResultData(result),
                    error: ('error' in result ? result.error : result.Error) || ''
                };
            }

            return normalizeResult(commandResult.failure('Unexpected error: Command failed without result value.'));
        }

        function executeCommandAsync(commandParams) {
            var node = commandParams.node;
            var commandString = node.value();
            if (!commandString) {
                return;
            }

            var resultNode = node.selectSingle("../Result"),
                successNode = node.selectSingle("../Success"),
                errorNode = node.selectSingle("../Error");

            return node.setValueAsync('')
                .then(function () {
                    return executeCommandInnerAsync(commandString);
                })
                .then(function (resultObject) {
                    var commandResultData = normalizeResult(resultObject);

                    return Q()
                        .then(function () {
                            if (resultNode) {
                                return resultNode.setValueAsync(commandResultData.result);
                            }
                        })
                        .then(function () {
                            if (successNode) {
                                return successNode.setValueAsync(commandResultData.success);
                            }
                        })
                        .then(function () {
                            if (errorNode) {
                                return errorNode.setValueAsync(commandResultData.error);
                            }
                        })
                        .then(function () {
                            return populateHistory(commandString, commandResultData);
                        });
                });
        }

        function initializeAsync() {
            if (!dataSources.getDataSource(qdabraRulesDataSource)) {
                return Q();
            }

            var cf = commonFunctions([], dataSources, dataConnections, template),
                dataSource = cf.getDataSource(qdabraRulesDataSource);

            return Q()
                .then(function () {
                    if (dataSource) {
                        var loadingNode = cf.getValidNode(dataSource, '/QdabraRules/@finishedLoading', '');

                        return loadingNode.setValueAsync(true);
                    }
                });
        }

        return {
            executeCommandAsync: executeCommandAsync,
            initializeAsync: initializeAsync
        };
    }

    function makeNamespaceResolver(namespaces) {

    }

    var utility = (function () {

        function setNodeValue(xPathEngine, node, path, value) {
            setNodeValueFromXPathEngine(xPathEngine, path, node, value);
        }

        function selectNode(xpathEngine, node, path) {
            return selectNodeListFromXPathEngine(xpathEngine, node, path)[0] || null;
        }

        function nodeWrapper(xPathEngine, node) {
            function setValue(value) {
                qd.util.setNodeValue(node, value);
                return nw;
            }

            function sn(path) {
                return selectNode(xPathEngine, node, path);
            }

            var nw = {
                setNodeValue: function (path, value) {
                    setNodeValue(xPathEngine, node, path, value);
                    return nw;
                },
                setValue: setValue,
                appendElement: function (qName) {
                    var parts = qName.split(':');
                    var doc = qd.util.ownerDocument(node);

                    var newNode = parts.length === 1
                        ? doc.createElement(qName)
                        : doc.createElementNS(xPathEngine.nsr.getNamespace(parts[0]), qName);

                    node.appendChild(newNode);

                    return nodeWrapper(xPathEngine, newNode);
                },
                selectNode: function (path) {
                    var n = sn(path);

                    return n && nodeWrapper(xPathEngine, n);
                },
                deleteNode: function (path) {
                    var node = sn(path);

                    if (node && node.parentNode) {
                        node.parentNode.removeChild(node);
                    }
                    return nw;
                }
            };

            return nw;
        }

        return {
            isoDate: function (date) {
                return (date || new Date()).toISOString().substring(0, 19);
            },
            makeNamespaceResolver: function (namespaces) {
                var nsm = new FVNamespaceResolver();

                if (namespaces) {
                    Object.keys(namespaces).forEach(function (key) {
                        nsm.addNamespace(key, namespaces[key]);
                    });
                }

                return nsm;
            },
            makeXPathEngine: function (namespaceResolver) {
                var xPathEngine = new XPathEngine();

                xPathEngine.nsr = namespaceResolver;

                return xPathEngine;
            },
            selectNodes: function (xpathEngine, node, path) {
                return selectNodeListFromXPathEngine(xpathEngine, node, path);
            },
            selectNode: selectNode,
            setNodeValue: setNodeValue,
            nodeWrapper: nodeWrapper
        };
    })();

    var commandResult = {
        success: function (result, error) {
            return {
                success: true,
                result: result || '',
                error: error || ''
            };
        },
        failure: function (error, result) {
            return {
                success: false,
                result: result || '',
                error: error || ''
            };
        }
    };

    var constants = {
        paramUrl: 'url',
        paramXPath: 'xpath',
        paramDsName: 'dsname',
        paramName: 'name',
        paramNameXPath: 'namexpath',
        paramOverwrite: 'overwrite',
        paramAsync: 'async',
        paramDsNameProg: 'dsnameprog',
        paramXPathProg: 'xpathprog',
        paramDsNameWs: 'dsnamews',
        paramDsUrl: 'dsurl',
        paramClear: 'clear',
        paramUniqueName: 'uniquename',
        paramUpgradeDocument: 'upgradedocument',
        paramVersion: 'version',
        paramGetDocument: 'getdocument',
        paramDocId: 'docid',
        paramSourceDs: 'sourceds',
        paramSourcePath: 'sourcepath',
        paramSourceFile: 'sourcefile',
        paramDestDs: 'destds',
        paramDestPath: 'destpath',
        paramFormat: 'format',
        paramListGuid: 'listguid',
        paramDsNameSrc: 'dsnamesrc',
        paramXPathSrc: 'xpathsrc',
        paramQdImage: 'qdimage',
        paramAutoOpen: 'autoopen',
        paramDomainId: 'domainid',
        paramSubmit: 'submit',
        paramValue: 'value',
        paramBlank: 'blank',
        paramNil: 'nil',
        paramPath: 'path',
        paramUsername: 'username',
        paramPassword: 'password',
        paramMethod: 'method',
        paramContent: 'content',
        paramContentType: 'contenttype',
        paramInner: 'inner',
        paramOuter: 'outer',
        qdimageAttributeXpathQrulesFilename: "@*[starts-with(local-name(), 'qRulesFilename')]",
        qdimageAttributeXpathQruleslink: "@*[starts-with(local-name(), 'qRulesLink')]",
        qRulesExceptionName: 'qRulesException',
        paramResultDs: 'resultdestds',
        paramResultPath: 'resultxpath',
        paramTableSrc: 'tablesrc',
        paramRowSrc: 'rowsrc',
        paramDsNameDest: 'dsnamedest',
        paramTableDest: 'tabledest',
        paramRowDest: 'rowdest',
        paramEmpty: 'empty',
        paramXpathDest: 'xpathdest',
        paramKey: 'key',
        paramView: 'view',
        paramType: 'type',
        paramUnload: 'unload',
        paramAllowExternal: 'allowexternal',
        paramCulture: 'culture',
        paramSeconds: 'seconds',
        paramMinutes: 'minutes',
        paramHours: 'hours',
        paramDays: 'days',
        paramWeekdays: 'weekdays',
        paramWeeks: 'weeks',
        paramMonths: 'months',
        paramYears: 'years',
        paramDsNameHol: 'dsnamehol',
        paramXpathHol: 'xpathhol',
        paramString1: 'string1',
        paramString2: 'string2',
        paramPattern: 'pattern',
        paramRelDest: 'reldest',
        paramAppend: 'append',
        paramSeparator: 'separator',
        paramSpace: 'space',
        paramDsNamePass: 'dsnamepass',
        paramPass: 'pass',
        paramPad: 'pad',
        paramListName: 'listname',
        paramRow: 'row',
        paramCompare: 'compare',
        paramOrder: 'order',
        paramXPathNode: 'xpathnode',
        paramEval: 'eval',
        paramContextNode: 'contextnode',
        paramDefault: 'default',
        paramLocation: 'location',
        paramWhere: 'where',
        paramSql: 'sql'
    };

    var errorMessages = {
        errorDataSourceNotFound: "Data Source not found.",
        errorFailedToSelectDestination: "Failed to select the destination node.",
        errorFailedToSelectSource: "Failed to select the source node."
    };

    return {
        qRules: qRules,
        utility: utility,
        constants: constants,
        // legacy alias
        Constants: constants,
        commandResult: commandResult,
        ErrorMessages: errorMessages
    };

})(Qd, qd);