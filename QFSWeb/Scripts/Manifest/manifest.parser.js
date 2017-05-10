/// <reference path="../util.js" />
/// <reference path="formsviewer.domain.js" />

/********************************************************
*** MANIFEST PARSER CLASS
*** 
*** Methods designated "helper" are used only internally
*** Make sure to include manifest.util.js in HTML head
***
*** CLASS CONTENTS:
***  - Manifest Parser - constructor
***  - Parse XPath (helper)
***  - Get Main Schema
***  - Get Views
***  - Get View Filename
***  - Get Default Values
***  - Get Action Number (helper)
***  - Create Action (helper)
***  - Get Rule (helper)
***  - Extract Rules (helper)
***  - Get Field Rules
***  - Get Button Rules(view)
***  - Get OnLoad Rules
***  - Get Adapter Details
***  - Get OnLoad Queries
********************************************************/

var ManifestParser = (function () {
    "use strict";

    var dataObjectPath = "/*/xsf:dataObjects/xsf:dataObject";

    function parseYesNo(value) {
        return value ? value === 'yes' : null;
    }

    /***********************************
     ***** Manifest Parser - constructor
     ***********************************/
    function ManifestParser() {
        this.fieldRules = null;
        this.buttonRules = {};
        this.repeatingSections = {};
        this.defaultValues = null;
        this.views = null; // first entry is always default view
        this.contextMenuItemsByView = {};

        this.xpathEngine = new XPathEngine();
    }

    // viewNodes is Object[String -> DomNode] associating view names with their source nodes
    ManifestParser.prototype.viewNodes = null;

    ManifestParser.XsfNamespace = "http://schemas.microsoft.com/office/infopath/2003/solutionDefinition";

    // String -> null
    ManifestParser.prototype.setManifest = function (manifestXml) {
        var manifestDom = $.parseXML(manifestXml),
            nsr = new FVNamespaceResolver();

        // 2015-07-30 - We need to use specific namespaces that may not be declared in the manifest, so we create the namespace manager with these specific namespaces
        nsr.addNamespace("xsf", "http://schemas.microsoft.com/office/infopath/2003/solutionDefinition");
        nsr.addNamespace("xsf2", "http://schemas.microsoft.com/office/infopath/2006/solutionDefinition/extensions");
        nsr.addNamespace("xsf3", "http://schemas.microsoft.com/office/infopath/2009/solutionDefinition/extensions");

        this.manifestDOM = manifestDom;
        this.xpathEngine.baseNode = manifestDom;
        this.xpathEngine.nsr = nsr;
    };

    /**********************************
    *** Get Field Rules
    **********************************/
    ManifestParser.prototype.getFieldRuleCandidates = function (dom, fieldName) {
        var fieldRules = this.getFieldRules(),
            byDom = fieldRules.getByDsName(dom || ""),
            byField = byDom && byDom.getByFieldName(fieldName);

        return byField;
    };

    ManifestParser.prototype.getFieldRules = function () {
        return this.lazyLoad(this, "fieldRules", this.extractFieldRules.bind(this));
    };

    ManifestParser.prototype.lazyLoad = function (target, property, fLoad) {
        if (!target[property]) {
            target[property] = fLoad.call(this);
        }
        return target[property];
    };

    /**********************************
    *** Get Button Rules
    **********************************/
    ManifestParser.prototype.getButtonRules = function (view) {
        return this.lazyLoad(this.buttonRules, view, this.extractViewButtonRules.bind(this, view));
    };

    /*****************************  *****
    *** Get OnLoad Rules
    **********************************/
    ManifestParser.prototype.getOnLoadRules = function () {
        return this.lazyLoad(this, "onLoadRules", this.extractOnLoadRules);
    };

    /*******************************
    *** Parse XPath (helper)
    *******************************/
    // options available are: context - the context node on which to evaluate the expression
    ManifestParser.prototype.evaluateXPath = function (xpathExpression, options) {
        return this.xpathEngine.evaluateXPath(xpathExpression, options);
    };

    ManifestParser.prototype.evaluateXPathToString = function (expression, options) {
        return this.evaluateXPath(expression, options).toString();
    }

    /*******************************
    ***** Get Main Schema
    *******************************/
    ManifestParser.prototype.getMainSchema = function () {
        var schemaPath = "/*/xsf:documentSchemas/xsf:documentSchema[@rootSchema='yes']";
        var result = this.evaluateXPath(schemaPath);
        return result.first().getAttribute("location").split(" ")[1];
    };

    ManifestParser.prototype.getBaseUrl = function () {
        var xPath = "/*/xsf:extensions/xsf:extension/xsf3:solutionDefinition/xsf3:baseUrl/@relativeUrlBase";

        return this.evaluateXPathToString(xPath);
    };

    ManifestParser.prototype.getBasePath = function () {
        // Remove final part (e.g. template.xsn)
        return this.getBaseUrl().replace(/[^/]+$/, "");
    };

    ManifestParser.prototype.getPublishUrl = function () {
        return this.evaluateXPathToString("/*/@publishUrl");
    };

    /*******************************
    ***** Get Views
    *******************************/
    ManifestParser.prototype.getViews = function () {
        if (!this.views) {
            this.views = this.parseViewNames();
        }

        return this.views;
    };

    ManifestParser.prototype.parseViewNames = function () {
        var views = [],
            viewsGroup = this.evaluateXPath("/*/xsf:views").first(),
            defaultView = viewsGroup.getAttribute("default"),
            viewNodes = this.evaluateXPath("xsf:view", { context: viewsGroup }).toUnsortedArray();

        views.push(defaultView);

        // Populate array with non-default views
        viewNodes
            .map(function (node) { return node.getAttribute("name"); })
            .filter(function (name) { return name !== defaultView; })
            .forEach(function (name) { views.push(name); });

        return views;
    };

    /*******************************
    ***** Get View Filename
    *******************************/
    ManifestParser.prototype.getViewFilename = function (view) {
        var viewNode = this.getViewNode(view),
            result = viewNode && this.evaluateXPath("xsf:mainpane", { context: viewNode }).first();

        return result && result.getAttribute("transform");
    };


    /*******************************
    ***** Get Default Values
    *******************************/
    ManifestParser.prototype.getDefaultValues = function (field) {
        if (!this.defaultValues) {
            this.defaultValues = this.extractDefaultValues();
        }

        return this.defaultValues[field];
    };

    ManifestParser.prototype.getAllDefaultValues = function () {
        return this.getDefaultValues("#all");
    };

    ManifestParser.prototype.getAllRefDefaultValues = function () {
        return this.getDefaultValues("#allref");
    };

    ManifestParser.prototype.getEditableComponents = function (viewName) {
        var viewComponents = this.repeatingSections[viewName];

        if (!viewComponents) {
            viewComponents = this.extractEditableComponents(viewName);
            this.repeatingSections[viewName] = viewComponents;
        }

        return viewComponents;
    };

    ManifestParser.prototype.getEditableComponent = function (viewName, ecName) {
        var components = this.getEditableComponents(viewName), foundEc;

        if (components) {
            foundEc = filter(components, function (c) { return c.name === ecName; })[0];

            return foundEc;
        } else {
            // Error
            return null;
        }
    };

    // String, String -> Array[ContextMenuItem]
    ManifestParser.prototype.getContextMenuItems = function (viewName, xmlToEdit) {
        var contextItems = this.contextMenuItemsByView[viewName];

        if (!contextItems) {
            contextItems = this.extractContextMenuItems(viewName);
            this.contextMenuItemsByView[viewName] = contextItems;
        }

        return contextItems[xmlToEdit] || [];
    };

    ManifestParser.prototype.getUpgradeSettings = function () {
        var settings = new UpgradeSettings(),
            upgradeNode = this.xpathEngine.evaluateXPath("/*/xsf:documentVersionUpgrade/xsf:useTransform").first();

        if (upgradeNode) {
            settings.type = "transform";
            settings.transform = upgradeNode.getAttribute("transform");
            settings.minVersion = upgradeNode.getAttribute("minVersionToUpgrade");
            settings.maxVersion = upgradeNode.getAttribute("maxVersionToUpgrade");
        } else {
            settings.type = "none";
        }

        return settings;
    };

    ManifestParser.prototype.getSolutionVersion = function () {
        return this.evaluateXPathToString("/*/@solutionVersion");
    };

    ManifestParser.prototype.extractDefaultValues = function () {
        var calcFields = this.evaluateXPath("/*/xsf:calculations/xsf:calculatedField"),
            allDefVals = calcFields.toUnsortedArray().map(this.extractDefaultValue.bind(this)),
            allRefDefVals = filter(allDefVals, function (dv) { return dv.getRefresh() === "onChange"; });

        return {
            "#all": allDefVals,
            "#allref": allRefDefVals
        };
    };

    ManifestParser.prototype.extractDefaultValue = function (defaultValueNode) {
        var target = defaultValueNode.getAttribute("target"),
            expression = defaultValueNode.getAttribute("expression"),
            refresh = defaultValueNode.getAttribute("refresh");

        return new DefaultValue(target, expression, refresh);
    };

    // Map from rule action node names to the function for parsing them
    ManifestParser.ruleParsers = {
        assignmentAction: function (node) {
            var targetField = node.getAttribute("targetField"),
                expression = node.getAttribute("expression");
            return new AssignmentAction(targetField, expression);
        },

        changeAdapterProperty: function (node) {
            var adapter = node.getAttribute("adapter"),
                expression = node.getAttribute("expression"),
                adapterProperty = node.getAttribute("adapterProperty");

            return new ChangeAdapterAction(adapter, expression, adapterProperty);
        },

        closeDocumentAction: function (node) {
            var promptSave = node.getAttribute("promptToSaveChanges");
            return new CloseDocumentAction(promptSave);
        },

        dialogBoxExpressionAction: function (node) {
            return new DialogExpressionAction(node.textContent);
        },

        dialogBoxMessageAction: function (node) {
            return new DialogMessageAction(node.textContent);
        },

        exitRuleSet: function (node) {
            return new ExitAction();
        },

        openNewDocumentAction: null, // TODO

        queryAction: function (node) {
            var adapter = node.getAttribute("adapter");

            return new QueryAction(adapter);
        },

        submitAction: function (node) {
            var adapter = node.getAttribute("adapter");
            return new SubmitAction(adapter);
        },

        switchViewAction: function (node) {
            var viewName = node.getAttribute("view");
            return new SwitchViewAction(viewName);
        }
    };

    //========================
    // Create Action (helper)
    //========================
    function getRuleSetActionNode(parent) {
        return parent.getElementsByTagNameNS(ManifestParser.XsfNamespace, "ruleSetAction")[0];
    };

    ManifestParser.prototype.createAction = function (actionNode) {
        var actionType = actionNode.localName,
            parser = ManifestParser.ruleParsers[actionType];

        if (parser) {
            return parser(actionNode);
        } else {
            // Error
            return null;
        }
    };

    ManifestParser.prototype.extractDomHandler = function (inputNode) {
        var ruleSetAction = getRuleSetActionNode(inputNode),
            ruleSet = this.createRuleSet(ruleSetAction),
            match = inputNode.getAttribute("match"),
            dataObject = inputNode.getAttribute("dataObject") || "";

        return { match: match, dataObject: dataObject, ruleSet: ruleSet };
    };

    // DomNode(RuleSetAction) -> RuleSet
    // Locates the rule definitions corresponding to the specified ruleset node, and returns 
    // a ruleSet containing those rules
    ManifestParser.prototype.createRuleSet = function (ruleSetAction) {
        var path = "/*/xsf:ruleSets/xsf:ruleSet[@name = '" + ruleSetAction.getAttribute("ruleSet") + "']",
            ruleSetNode = this.evaluateXPath(path).first(),
            name = ruleSetNode.getAttribute("name"),
            ruleNodes = ruleSetNode.getElementsByTagNameNS(ManifestParser.XsfNamespace, "rule"),
            ruleSet = new RuleSet(name);

        $.each(ruleNodes, function (i, n) {
            ruleSet.addRule(this.extractRuleFromNode(n));
        }.bind(this));

        return ruleSet;
    };

    /*******************************
    *** Create Rule (helper)
    *******************************/
    ManifestParser.prototype.createRule = function (ruleNode) {
        var ruleCondition = ruleNode.getAttribute("condition"),
            ruleCaption = ruleNode.getAttribute("caption"),
            ruleEnabled = ruleNode.getAttribute("isEnabled"),
            boolEnabled = !ruleEnabled || ruleEnabled === "yes";

        // Create new rule object
        var NewRule = new Rule(ruleCaption, ruleCondition, boolEnabled);
        return NewRule;
    };

    ManifestParser.prototype.extractRuleFromNode = function (ruleNode) {
        var self = this,
            rule = this.createRule(ruleNode),
            actionNodes = Array.prototype.slice.call(ruleNode.childNodes);

        // Loop through all action nodes for current rule
        actionNodes
            .filter(function (n) {
                return n.nodeType === 1;
            }).forEach(function (el) {
                var act = self.createAction(el);

                if (act) {
                    rule.addAction(act);
                }
            });

        return rule;
    };

    /***************************************
    ***** Get Field Rules
    ***************************************/
    ManifestParser.prototype.extractFieldRules = function () {
        var self = this;

        // helper variables
        var ruleSets = new RuleSetByDataSourceCollection(),
            domEventNodes;

        try {
            domEventNodes = this.evaluateXPath("/*/xsf:domEventHandlers/xsf:domEventHandler").toUnsortedArray();
        }
        catch (e) {
            alert("Error Getting Dom Event Handler Nodes: " + (e.message ? e.message : e));
        }

        if (domEventNodes) {
            domEventNodes.forEach(function (domEventNode) {
                var domHandler = self.extractDomHandler(domEventNode),
                    trimFieldName = domHandler.match.split("/").pop(),
                    byDsName = ruleSets.ensureByFieldCollection(domHandler.dataObject),
                    byField = byDsName.ensureRuleSetCollection(trimFieldName);

                byField.push(domHandler);
            });
        }

        return ruleSets;
    };

    /***************************************
    ***** Get Button Rules
    ***************************************/
    ManifestParser.prototype.extractViewButtonRules = function (view) {
        var self = this,
            ruleSets = {},
            path = "/*/xsf:views/xsf:view[@name = '" + view + "']/xsf:unboundControls/xsf:button[xsf:ruleSetAction]",
            buttonNodes;

        try {
            buttonNodes = this.evaluateXPath(path).toUnsortedArray();

            if (buttonNodes) {
                buttonNodes.forEach(function (buttonNode) {
                    ruleSets[buttonNode.getAttribute("name")] = self.extractButtonRules(buttonNode);
                });
            }
        }
        catch (e) {
            alert("Error Getting Button Nodes: " + (e.message || e));
        }

        return ruleSets;
    };

    ManifestParser.prototype.extractButtonRules = function (buttonNode) {
        var ruleSetAction = getRuleSetActionNode(buttonNode),
            ruleSet = this.createRuleSet(ruleSetAction);

        return ruleSet;
    };



    /***************************************
    ***** Get OnLoad Rules
    ***************************************/
    ManifestParser.prototype.extractOnLoadRules = function () {
        var onLoadNodes;

        try {
            // extract all OnLoad nodes (should only be one)
            onLoadNodes = this.evaluateXPath("/*/xsf:onLoad/xsf:ruleSetAction").toUnsortedArray();

            if (onLoadNodes.length > 0) {
                return this.createRuleSet(onLoadNodes[0]);
            }
        }
        catch (e) {
            return null;
        }
    };

    // 2014-04-18 Deleted debugging methods (printFieldRules, printOtherRules)

    function adapterPathWithPredicate(predicatePath) {
        return "(/*/xsf:submit | /*/xsf:dataAdapters | /*/xsf:dataObjects/xsf:dataObject/xsf:query)/*[" + predicatePath + "]";
    };

    var submitAdapterSelector = "self::xsf:davAdapter or self::xsf:webServiceAdapter";
    var submitAdapterPath = adapterPathWithPredicate(submitAdapterSelector);

    var allAdapterSelector = submitAdapterSelector + " or self::xsf:sharepointListAdapterRW or self::xsf:xmlFileAdapter or self::xsf:adoAdapter";
    var allAdapterPath = adapterPathWithPredicate(allAdapterSelector);


    ManifestParser.prototype.getSubmitAdapter = function (name) {
        var match = this.getAdapterNode(submitAdapterPath, name);

        if (match) {
            return this.parseAdapter(match);
        } else {
            // ERROR
            return null;
        }
    };

    ManifestParser.prototype.getDataSources = function () {
        if (!this.allDataSourcesLoaded) {
            this.dataSources = this.parseDataSources();
            this.allDataSourcesLoaded = true;
        }

        return this.dataSources;
    };

    ManifestParser.prototype.parseDataSources = function () {
        var dsNodes = this.evaluateXPath(dataObjectPath + "[xsf:query]").toUnsortedArray(),
            dses = dsNodes.map($.proxy(this.parseDataSource, this));

        return FVUtil.makeAssoc(dses, function (ds) { return ds.name; });
    };

    ManifestParser.prototype.parseDataSource = function (dsNode) {
        var name = dsNode.getAttribute("name"),
            initOnLoad = (dsNode.getAttribute("initOnLoad") === "yes"),
            queryNode = dsNode.getElementsByTagNameNS(ManifestParser.XsfNamespace, "query")[0],
            adapterNode = queryNode && queryNode.firstElementChild,
            adapter;

        if (adapterNode) {
            adapter = this.parseAdapter(adapterNode);
        }

        return { name: name, initOnLoad: initOnLoad, adapter: adapter };
    };

    function makeDataSourceDescriptor(node) {
        var name = node.getAttribute("name"),
            initOnLoad = node.getAttribute("initOnLoad") === "yes";

        return { name: name, initOnLoad: initOnLoad };
    }

    ManifestParser.prototype.listDataSources = function () {
        return this.evaluateXPath(dataObjectPath)
        .toUnsortedArray()
        .map(makeDataSourceDescriptor);
    };

    ManifestParser.prototype.makeUdcxConnectionObject = function (node) {
        var queryThisFormAttr = node.getAttribute('queryThisFormOnly'),
            connectoidNodes = this.evaluateXPath('xsf2:connectoid', { context: node })
            .toUnsortedArray();

        var udcxItem = {
            ref: node.getAttribute('ref'),
            queryThisFormOnly: queryThisFormAttr && queryThisFormAttr === 'yes'
        };

        if (!connectoidNodes.length) {
            return udcxItem;
        }

        var connectoidNode = connectoidNodes[0];

        udcxItem['linkType'] = connectoidNode.getAttribute('connectionLinkType');
        udcxItem['source'] = connectoidNode.getAttribute('source');
        udcxItem['siteCollection'] = connectoidNode.getAttribute('siteCollection');

        return udcxItem;
    }

    ManifestParser.prototype.parseUdcxConnections = function () {
        var udcxConnTargetPath = 'self::xsf2:sharepointListAdapterRWExtension | self::xsf2:webServiceAdapterExtension',
            udcxConnPath = '/*/xsf:extensions/xsf:extension/xsf2:solutionDefinition/xsf2:dataConnections/*[xsf2:connectoid]';

        return this.evaluateXPath(udcxConnPath)
            .toUnsortedArray()
            .map(this.makeUdcxConnectionObject.bind(this));
    };

    ManifestParser.prototype.getUdcxConnections = function () {
        if (!this.allUdcxLoaded) {
            this.udcxConnections = this.parseUdcxConnections();
            this.allUdcxLoaded = true;
        }

        return this.udcxConnections;
    };

    ManifestParser.prototype.getDataConnections = function () {
        if (!this.allDcsLoaded) {
            this.dataConnections = this.parseDataConnections();
            this.allDcsLoaded = true;
        }

        return this.dataConnections;
    };

    ManifestParser.prototype.parseDataConnections = function () {
        var dcNodes = this.evaluateXPath(allAdapterPath),
            dcs = dcNodes.toUnsortedArray().map(this.parseAdapter.bind(this)),
            dcMap = {};

        dcs.forEach(function (dc) { dcMap[dc.name] = dc; });

        return dcMap;
    };

    ManifestParser.prototype.getQueryAdapter = function (name) {
        var dataSources = this.getDataSources(),
            source = dataSources[name],
            adapter = source && source.adapter;

        return adapter;
    };

    ManifestParser.prototype.parseAdapter = function (node) {
        var parser = this.getAdapterParser(node.localName);

        if (parser) {
            return parser.call(this, node);
        }
    };

    ManifestParser.prototype.getAdapterParser = function (nodeName) {
        switch (nodeName) {
            case "adoAdapter":
                return this.parseAdoAdapter;
            case "davAdapter":
                return this.parseDavAdapter;
            case "sharepointListAdapterRW":
                return this.parseShPListAdapter;
            case "webServiceAdapter":
                return this.parseWebServiceAdapter;
            case "xmlFileAdapter":
                return this.parseFileQueryAdapter;
            default:
                throw new Error("Unsupported adapter type: " + nodeName);
        }
    };

    ManifestParser.prototype.getAndParseAdapter = function (xpath, name) {
    };

    ManifestParser.prototype.getAdapterNode = function (xpath, name) {
        var candidates, match;

        candidates = this.evaluateXPath(xpath).toUnsortedArray();
        match = candidates.filter(function (a) { return a.getAttribute("name") === name })[0];

        return match;
    };

    ManifestParser.prototype.getSubmitSettings = function () {
        var submitNode = this.evaluateXPath("/*/xsf:submit").first(),
            submitSettings,
            adapterNode,
            ruleSetNode;

        if (submitNode) {
            submitSettings = {};

            submitSettings.onAfterSubmit = submitNode.getAttribute("onAfterSubmit");
            submitSettings.showStatusDialog = (submitNode.getAttribute("showStatusDialog") === "yes");
            submitSettings.errorMessage = FVUtil.nodeValOrNull(FVUtil.getChildNode(submitNode, "errorMessage"));

            adapterNode = this.evaluateXPath("*[" + submitAdapterSelector + "]", { context: submitNode }).first();
            if (adapterNode) {
                submitSettings.adapter = adapterNode ? this.parseAdapter(adapterNode) : null;
            } else {
                ruleSetNode = getRuleSetActionNode(submitNode);
                if (ruleSetNode) {
                    submitSettings.ruleSet = this.createRuleSet(ruleSetNode);
                }
            }

            return submitSettings;
        } else {
            // Not found
            return null;
        }
    };

    // ======================
    // Adapter parsing
    // ======================

    ManifestParser.prototype.checkAndAddUdcxProperty = function (adapterNode, adapter) {
        var udcxConnections = this.getUdcxConnections(),
            adapterName = adapterNode.getAttribute('name'),
            udcxConnectionsFilter = udcxConnections
            .filter(function (conn) {
                return conn.ref === adapterName;
            });

        if (!udcxConnectionsFilter.length) {
            return adapter;
        }

        var udcxNode = udcxConnectionsFilter[0];
        adapter.source = udcxNode.source;
        adapter.siteCollection = udcxNode.siteCollection;
        adapter.type = 'udcx';

        return adapter
    };

    ManifestParser.prototype.parseDavAdapter = function (adapterNode) {
        var adapter = this.parseAdapterCommon(adapterNode, "dav"),
            folderUrlNode = FVUtil.getChildNode(adapterNode, "folderURL"),
            fileNameNode = FVUtil.getChildNode(adapterNode, "fileName");

        adapter.enabled = (adapterNode.getAttribute("submitAllowed") === "yes");
        adapter.overwrite = (adapterNode.getAttribute("overwriteAllowed") === "yes");
        adapter.folder = folderUrlNode.getAttribute("value");
        adapter.fileName = fileNameNode.getAttribute("value");
        adapter.fileNameType = fileNameNode.getAttribute("valueType");

        return adapter;
    };

    ManifestParser.prototype.parseShPListField = function (fieldDef) {
        return {
            internalName: fieldDef.getAttribute("internalName"),
            type: fieldDef.getAttribute("type")
        };
    };

    ManifestParser.prototype.parseShPListAdapter = function (adapterNode) {
        var fieldNodes = adapterNode.getElementsByTagNameNS(ManifestParser.XsfNamespace, "field"),
            siteUrl = adapterNode.getAttribute("siteURL"),
            listId = adapterNode.getAttribute("sharePointListID"),
            relListUrl = adapterNode.getAttribute("relativeListUrl"),
            sortBy = adapterNode.getAttribute('sortBy'),
            sortAscendingValue = adapterNode.getAttribute('sortAscending'),
            sortAsc = sortAscendingValue && sortAscendingValue === 'yes',
            fields = map(fieldNodes, this.parseShPListField),
            adapter = new FVDomain.DataAdapters.SharePointListAdapter(siteUrl, listId, relListUrl, fields, sortBy, sortAsc);

        this.parseAdapterCommon(adapterNode, "shpList", adapter);

        return this.checkAndAddUdcxProperty(adapterNode, adapter);
    };

    ManifestParser.prototype.parseFileQueryAdapter = function (adapterNode) {
        var adapter = this.parseAdapterCommon(adapterNode, "xmlFile");

        adapter.fileUrl = adapterNode.getAttribute("fileUrl");

        return adapter;
    };

    ManifestParser.prototype.parseWebServiceAdapter = function (adapterNode) {
        var adapter = this.parseAdapterCommon(adapterNode, "webService"),
            operation = adapterNode.getElementsByTagNameNS(ManifestParser.XsfNamespace, "operation")[0];

        adapter.wsdlUrl = adapterNode.getAttribute("wsdlUrl");
        if (operation) {
            adapter.methodName = operation.getAttribute("name");
            adapter.soapAction = operation.getAttribute("soapAction");
            adapter.serviceUrl = operation.getAttribute("serviceUrl");
            adapter.input = this.parseWebServiceInput(operation);
        } else {
            // TODO: ?
        }

        return this.checkAndAddUdcxProperty(adapterNode, adapter);
    };

    ManifestParser.prototype.parseAdoAdapter = function (adapterNode) {
        var adapter = this.parseAdapterCommon(adapterNode, "ado");

        adapter.connectionString = adapterNode.getAttribute("connectionString");
        adapter.commandText = adapterNode.getAttribute("commandText");

        return this.checkAndAddUdcxProperty(adapterNode, adapter);
    };

    ManifestParser.prototype.parseWebServiceInput = function (operationNode) {
        var input = operationNode.getElementsByTagNameNS(ManifestParser.XsfNamespace, "input")[0],
            fragNodes, wsInput;

        if (input) {
            wsInput = new WebServiceInput(input.getAttribute("source"));
            fragNodes = input.getElementsByTagNameNS(ManifestParser.XsfNamespace, "partFragment");

            wsInput.fragments = map(fragNodes, parseFragment);
        } else {
            wsInput = new WebServiceInput("");
        }

        return wsInput;

        function parseFragment(node) {
            return new WebServiceInputFragment(
                // This attribute specifies an XPath expression that identifies the elements and attributes inside the SOAP message to be replaced.
                node.getAttribute("match"),
                // This attribute specifies an XPath expression that identifies the values in the form file that will 
                // replace a part of the SOAP message. If the filter attribute is present, an XML subtree MUST replace a 
                // part of the SOAP message. If the filter attribute is not present, an XML node MUST replace a part of the SOAP message.
                node.getAttribute("replaceWith"),
                //  This attribute specifies whether the substituted part of the SOAP message is 
                //  submitted as a string. If this attribute is not present, its value MUST be interpreted as "no".
                node.getAttribute("sendAsString") === "yes",
                // An XPath expression that MUST evaluate to an XML subtree in the form file. This attribute MUST be 
                // present when substituting a part of the SOAP message with a subset of the form file. If this 
                // attribute is not present, its value MUST be interpreted as an empty string (1).
                node.getAttribute("filter") || "",
                node.getAttribute("dataObject") || "");
        }
    }



    ManifestParser.prototype.parseAdapterCommon = function (adapterNode, type, seed) {
        var adapter = seed || {};

        adapter.name = adapterNode.getAttribute("name");
        adapter.type = type;
        adapter.localName = adapterNode.localName;
        adapter.queryAllowed = parseYesNo(adapterNode.getAttribute('queryAllowed'));
        adapter.submitAllowed = parseYesNo(adapterNode.getAttribute('submitAllowed'));

        return adapter;
    };

    // ======================
    // End adapter parsing
    // ======================

    ManifestParser.prototype.getOnLoadQueries = function () {
        var printStr = "";
        var onLoadQueries = [];
        var onLoadNodes = this.evaluateXPath("/*/xsf:dataObjects/xsf:dataObject[@initOnLoad='yes']").toUnsortedArray();

        for (var i = 0; i < onLoadNodes.length; i += 1) {
            onLoadQueries[i] = onLoadNodes[i].getAttribute("name");
            printStr += "\n" + onLoadQueries[i];
        }
        alert("OnLoad:\n" + printStr);
        return onLoadQueries;

    };

    ManifestParser.prototype.getViewNode = function (viewName) {
        var nodes;

        if (!this.viewNodes) {
            nodes = this.evaluateXPath("/*/xsf:views/xsf:view").toUnsortedArray();
            this.viewNodes = FVUtil.makeAssoc(nodes, function (n) { return n.getAttribute("name") });
        }

        return this.viewNodes[viewName];
    };

    ManifestParser.prototype.extractContextMenuItems = function (viewName) {
        var viewNode = this.getViewNode(viewName),
            contextItemNodes;

        if (!viewNode) {
            throw Error("Information on view " + viewName + " could not be found when parsing context menu items.");
        }

        contextItemNodes = this.evaluateXPath("xsf:menuArea[@name = 'msoStructuralEditingContextMenu']/xsf:button",
        {
            context: viewNode
        });

        return groupBy(map(contextItemNodes.toUnsortedArray(), this.parseContextMenuItem),
                       function (cm) { return cm.xmlToEdit; });
    };

    ManifestParser.prototype.parseContextMenuItem = function (itemNode) {
        var ga = itemNode.getAttribute.bind(itemNode);

        return new ContextMenuItem(ga("action"), ga("xmlToEdit"), ga("caption"), ga("showIf"));
    };

    ManifestParser.prototype.extractEditableComponents = function (view) {
        // clear existing editable components
        var self = this,
            viewNode = this.getViewNode(view),
            // get xmlToEdit nodes for the 'view'
            xmlToEditNodes = this.evaluateXPath("xsf:editing/xsf:xmlToEdit", { context: viewNode }).toUnsortedArray();

        return xmlToEditNodes
            .map(function (xteNode) {
                return self.parseEditableComponent(xteNode, viewNode);
            })
            .filter(function (ec) { return !!ec; });
    };

    ManifestParser.prototype.parseCollectionComponent = function (xteNode) {
        var cc = new CollectionEditableComponent(this.xpathEngine),
            fragmentContainer = this.evaluateXPath("xsf:editWith/xsf:fragmentToInsert/xsf:chooseFragment", { context: xteNode }).first();

        if (!fragmentContainer) {
            throw Error("Unable to locate fragment container for editable component.");
        }

        cc.fragmentContainer = fragmentContainer;
        cc.innerFragmentPath = fragmentContainer.getAttribute("innerFragment");
        cc.parent = fragmentContainer.getAttribute("parent") || ".";

        // var fragSlashPos = cc.innerFragmentPath && innerFragmentPath.indexOf("/")
        // UNUSED? ec.fragmentName = (fragSlashPos !== -1) ? innerFragment.substring(fragSlashPos + 1) : innerFragment

        return cc;
    };

    ManifestParser.prototype.parseFieldComponent = function (xteNode) {
        // Currently nothing to parse
        return new FieldEditableComponent();
    };

    ManifestParser.prototype.parseFieldTextComponent = function (xteNode) {
        var xTextList = new XTextListComponent(this.xpathEngine);

        return xTextList;
    };

    ManifestParser.prototype.createTypedComponent = function (xteNode) {
        var componentType = xteNode.getElementsByTagNameNS(ManifestParser.XsfNamespace, "editWith")[0].getAttribute("component");

        switch (componentType) {
            case FieldEditableComponent.ComponentType:
                return this.parseFieldComponent(xteNode);
            case CollectionEditableComponent.ComponentType:
                return this.parseCollectionComponent(xteNode);
            case XTextListComponent.ComponentType:
                return this.parseFieldTextComponent(xteNode);
            default:
                console.warn("Unsupported component type: " + componentType);
        }

        return null;
    };

    ManifestParser.prototype.parseEditableComponent = function (xteNode, viewNode) {
        var component = this.createTypedComponent(xteNode);

        if (component) {
            component.name = xteNode.getAttribute("name");
            component.fullItem = xteNode.getAttribute("item");
            component.container = xteNode.getAttribute("container");
            component.viewContext = xteNode.getAttribute("viewContext");

            var lastSlashIndex = component.fullItem.lastIndexOf("/");
            component.item = component.fullItem.substring(0, lastSlashIndex);

            component.actions = this.getEditableComponentActions(viewNode, component.name);

            if (component.component === XTextListComponent.ComponentType) {
                component.element = component.fullItem.substring(lastSlashIndex + 1);
            }
        }

        return component;
    };

    ManifestParser.prototype.getEditableComponentActions = function (viewNode, xmlToEditName) {
        // see if there are any repeating group controls for the current component
        var path = "xsf:menuArea/xsf:button[@xmlToEdit='" + xmlToEditName + "']",
            buttonNodes = this.evaluateXPath(path, { context: viewNode }).toUnsortedArray();

        return buttonNodes.map(this.parseButtonAction.bind(this));
    };

    ManifestParser.prototype.parseButtonAction = function (buttonNode) {
        var action = {},
            actionStr = buttonNode.getAttribute("action");

        action.type = this.getActionCode(actionStr);

        action.caption = buttonNode.getAttribute("caption");

        return action;
    };

    ManifestParser.prototype.getActionCode = function (action) {
        switch (action) {
            case "xCollection::insertBefore":
                return "insertBefore";
            case "xCollection::insertAfter":
                return "insertAfter";
            case "xCollection::remove":
                return "remove";
            case "xCollection::insert":
                return "insert";
        }

        return null;
    };

    function getWssPath() {
        var xPath = "/*/xsf:extensions/xsf:extension/xsf2:solutionDefinition/xsf2:solutionPropertiesExtension/xsf2:wss/@path";

        return this.evaluateXPathToString(xPath);
    }

    $.extend(ManifestParser.prototype, {
        getWssPath: getWssPath
    });

    return ManifestParser;
})();
