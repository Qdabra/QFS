"use strict";

var FVDomain = FVDomain || {};

function RuleSetByDataSourceCollection() {
    this._items = {};
}

// String -> Array[RuleSetByFieldCollection]
// Ensures that this collection has a RuleSetByFieldCollection with the key <dataSourceName>
// and returns it
RuleSetByDataSourceCollection.prototype.ensureByFieldCollection = function (dataSourceName) {
    return FVUtil.ensureMember(this._items, dataSourceName, RuleSetByFieldCollection);
};

RuleSetByDataSourceCollection.prototype.getByDsName = function (dataSourceName) {
    return this._items[dataSourceName];
};


function RuleSetByFieldCollection() {
    this._items = {};
}

// String -> Array[RuleSet]
RuleSetByFieldCollection.prototype.ensureRuleSetCollection = function (fieldName) {
    return FVUtil.ensureMember(this._items, fieldName, Array);
};

RuleSetByFieldCollection.prototype.getByFieldName = function (fieldName) {
    return this._items[fieldName];
};



// ============
//   RuleSet
// ============

function RuleSet(name) {
    this.name = name;
    this.rules = [];
}

RuleSet.prototype.getRules = function () {
    return this.rules;
};

RuleSet.prototype.addRule = function (rule) {
    this.rules.push(rule);
};


// =========
//   Rule
// =========

function Rule(caption, condition, isEnabled) {
    this.caption = caption;
    this.condition = condition;
    this.isEnabled = isEnabled;
    this.actions = [];
}

Rule.prototype.printRule = function () {
    var printStr = this.condition + " || " + this.isEnabled;
    return printStr;
};

Rule.prototype.getActions = function () {
    return this.actions;
};

Rule.prototype.addAction = function (action) {
    this.actions.push(action);
};

// Helper method to add a series of readonly properties and their values to an object
// This is available to be added to object types as a member, but should not be called directly
function fv_helper_addProperties(props) {
    var key;

    if (this !== window) {
        for (key in props) {
            if (props.hasOwnProperty(key)) {
                Object.defineProperty(this, key, { value: props[key] });
            }
        }
    }
}

// ============
//  RuleAction
// ============
// Base type for all rule actions
function RuleAction(type) {
    this.addProperties({ actionType: type });
}

RuleAction.prototype.addProperties = fv_helper_addProperties;


// =================
//  AssignmentAction
// =================
function AssignmentAction(targetField, expression) {
    this.addProperties({
        target: targetField,
        expression: expression
    });
}
AssignmentAction.type = "assignment";
AssignmentAction.prototype = new RuleAction(AssignmentAction.type);


function ChangeAdapterAction(adapter, expression, adapterProperty) {
    this.addProperties({
        adapterName: adapter,
        expression: expression,
        adapterProperty: adapterProperty
    });
}
ChangeAdapterAction.type = "changeAdapter";
ChangeAdapterAction.prototype = new RuleAction(ChangeAdapterAction.type);


function QueryAction(adapter) {
    this.addProperties({ adapterName: adapter });
}
QueryAction.type = "query";
QueryAction.prototype = new RuleAction(QueryAction.type);


function SubmitAction(adapter) {
    this.addProperties({ adapterName: adapter });
}
SubmitAction.type = "submit";
SubmitAction.prototype = new RuleAction(SubmitAction.type);


// ==================
//  SwitchViewAction
// ==================
function SwitchViewAction(viewName) {
    this.addProperties({ view: viewName });
}
SwitchViewAction.type = "switchView";
SwitchViewAction.prototype = new RuleAction(SwitchViewAction.type);


// ===================
// CloseDocumentAction
// ===================
function CloseDocumentAction(promptSave) {
    this.getPromptSave = function () {
        return promptSave;
    };
}
CloseDocumentAction.type = "closeDocument";
CloseDocumentAction.prototype = new RuleAction(CloseDocumentAction.type);


// ==========
// ExitAction
// ==========
function ExitAction() { }
ExitAction.type = "exitRuleSet";
ExitAction.prototype = new RuleAction(ExitAction.type);


// ======================
// DialogExpressionAction
// ======================
function DialogExpressionAction(expression) {
    this.addProperties({ expression: expression });
}
DialogExpressionAction.type = "dialogExpression";
DialogExpressionAction.prototype = new RuleAction(DialogExpressionAction.type);


// ======================
// DialogExpressionAction
// ======================
function DialogMessageAction(message) {
    this.addProperties({ message: message });
}
DialogMessageAction.type = "dialogMessage";
DialogMessageAction.prototype = new RuleAction(DialogMessageAction.type);


// ============
// DefaultValue
// ============
function DefaultValue(target, expression, refresh) {
    this.getTarget = function () { return target; };
    this.getExpression = function () { return expression; };
    this.getRefresh = function () { return refresh; };
}

function EditableComponent(name, item) {
    this.name = name;
    this.item = item;
}


// =======================
//   Rule Result Types
// =======================

var ResultTypes = {
    CLOSE: "close",
    NORMAL: "normal",
    STOP_RULESET: "stopRuleset",
    SKIP: "skip"
};

var ResultItem = (function () {
    var rt = ResultTypes;

    function create(status) {
        return {
            status: status,
            shouldStop: (status === rt.CLOSE || status === rt.STOP_RULESET)
        };
    }

    return {
        create: create
    };
})();

var ActionResult = (function () {
    var create = ResultItem.create;

    return {
        CloseResult: create(ResultTypes.CLOSE),
        NormalResult: create(ResultTypes.NORMAL),
        StopRuleSetResult: create(ResultTypes.STOP_RULESET)
    }
})();

var RuleResult = (function () {
    var create = ResultItem.create;

    return {
        CloseResult: create(ResultTypes.CLOSE),
        NormalResult: create(ResultTypes.NORMAL),
        StopRuleSetResult: create(ResultTypes.STOP_RULESET),
        SkipResult: create(ResultTypes.SKIP)
    }
})();


var RuleSetResult = (function () {
    var create = ResultItem.create;

    return {
        CloseResult: create(ResultTypes.CLOSE),
        NormalResult: create(ResultTypes.NORMAL),
    };
})();

var AssignmentResult = (function () {
    var create = ResultItem.create;

    return {
        CloseResult: create(ResultTypes.CLOSE),
        NormalResult: create(ResultTypes.NORMAL),
    };
})();

var DefaultValueResult = (function () {
    var create = ResultItem.create;

    return {
        CloseResult: create(ResultTypes.CLOSE),
        NormalResult: create(ResultTypes.NORMAL),
    };
})();



function WebServiceInput(sourceFileName) {
    this.source = sourceFileName;

    this.fragments = [];
}

WebServiceInput.prototype.addFragment = function (fragment) {
    this.fragments.push(fragment);
};

// String, String, Boolean, String, String
function WebServiceInputFragment(match, replaceWith, sendAsString, filter, dataObject) {
    this.match = match;
    this.replaceWith = replaceWith;
    this.sendAsString = sendAsString;
    this.filter = filter;
    this.dataObject = dataObject;
}

function ContextMenuItem(action, xmlToEdit, caption, showIf) {
    this.action = action;
    this.xmlToEdit = xmlToEdit;
    this.caption = caption;
    this.showIf = showIf;
}

var XmlActions = {
    CollectionInsert: "xCollection::insert",
    CollectionInsertBefore: "xCollection::insertBefore",
    CollectionInsertAfter: "xCollection::insertAfter",
    CollectionRemove: "xCollection::remove"
};

function XPathEngine(options) {
    if (options) {
        this.nsr = options.namespaceResolver || null;
        this.baseNode = options.baseNode || null;
        this.functions = options.functions || null;
    }
}

XPathEngine.prototype.nsr = null;
XPathEngine.prototype.baseNode = null;
XPathEngine.prototype.functions = null;

XPathEngine.prototype.getContextFromOptions = function (options) {
    return (options && options.context) || this.baseNode;
};

// options available are: context - the context node on which to evaluate the expression
XPathEngine.prototype.evaluateXPath = function (xpathExpression, options) {
    var context = this.getContextFromOptions(options);
    var namespaces = (options && options.namespaces) || this.nsr;

    return FVUtil.evaluateXPath(context, xpathExpression,
                                { namespaces: namespaces, functions: this.functions });
};


function EditableComponent() { }

EditableComponent.prototype.name = null;
EditableComponent.prototype.component = null;
EditableComponent.prototype.fullItem = null;
EditableComponent.prototype.container = null;
EditableComponent.prototype.viewContext = null;
EditableComponent.prototype.actions = null;


function FieldEditableComponent() {
    this.component = FieldEditableComponent.ComponentType;

    // Can we define this on the prototype and have it work properly?
    Object.defineProperties(this, {
        "fieldName": {
            get: function () { return this.item.substring(1); }
        }
    });
}

FieldEditableComponent.ComponentType = "xField";

FieldEditableComponent.prototype = new EditableComponent();
FieldEditableComponent.constructor = FieldEditableComponent;

FieldEditableComponent.prototype.fieldName = null;


function CollectionEditableComponent(xpathEngine) {
    this.xpathEngine = xpathEngine;
    this.component = CollectionEditableComponent.ComponentType;
}

CollectionEditableComponent.ComponentType = "xCollection";

CollectionEditableComponent.prototype = new EditableComponent();
CollectionEditableComponent.constructor = CollectionEditableComponent;

CollectionEditableComponent.innerFragmentPath = null;
CollectionEditableComponent.parent = null;
CollectionEditableComponent.fragmentContainer = null;

CollectionEditableComponent.prototype.loadInnerFragment = function () {
    if (!this._innerFragment) {
        this._innerFragment = this.xpathEngine
            .evaluateXPath(this.innerFragmentPath, { context: this.fragmentContainer })
            .first();
    }

    return this._innerFragment;
};

Object.defineProperties(CollectionEditableComponent.prototype, {
    "innerFragment": { get: CollectionEditableComponent.prototype.loadInnerFragment }
});



function XTextListComponent() {
    this.component = XTextListComponent.ComponentType;
}

XTextListComponent.ComponentType = "xTextList";

XTextListComponent.prototype = new EditableComponent();
XTextListComponent.constructor = XTextListComponent;

function UpgradeSettings() { }

UpgradeSettings.prototype.type = "";
UpgradeSettings.prototype.transform = "";
UpgradeSettings.prototype.minVersion = "";
UpgradeSettings.prototype.maxVersion = "";


var UpgradeEngine = (function () {
    "use strict";

    function create(template) {
        var xslt = qd.xslt;

        var settings = template.getUpgradeSettings();

        function getDocumentVersion(domRoot) {
            var pi = FVUtil.getProcessingInstruction(domRoot, "mso-infoPathSolution"),
                piDom = pi && FVUtil.makePiDom(pi),
                version = piDom && piDom.getAttribute("solutionVersion");

            return version || null;
        }

        function compareVersions(v1, v2) {
            var v1Parts = v1.split("."),
                v2Parts = v2.split("."),
                maxParts = Math.max(v1Parts.length, v2Parts.length),
                v1Part,
                v2Part,
                i;

            for (i = 0; i < maxParts; i += 1) {
                v1Part = v1Parts[i];
                v2Part = v2Parts[i];

                if (!v1Part) {
                    return -1;
                }
                if (!v2Part) {
                    return 1;
                }
                if (+v1Part !== +v2Part) {
                    return (+v1Part) - (+v2Part);
                }
            }

            return 0;
        }

        function shouldUpgrade(domRoot) {
            var min = settings.minVersion,
                max = settings.maxVersion,
                docVersion,
                fitsMinCriteria,
                fitsMaxCriteria;

            if (settings.type === "transform" && settings.transform) {
                docVersion = getDocumentVersion(domRoot);
                if (docVersion) {
                    fitsMinCriteria = !min ||
                                      (compareVersions(min, docVersion) <= 0);
                    fitsMaxCriteria = !max ||
                                      (compareVersions(docVersion, max) <= 0);

                    return fitsMinCriteria && fitsMaxCriteria;
                }
            }

            return false;
        }

        // DomNode, String, XsltEngine -> DomNode
        function transformDom(dom, strUpgradeXsl) {
            var xslDom = $.parseXML(strUpgradeXsl);
            var processor = xslt.compile(xslDom);
            var result = processor.transform(dom, { functions: new MSFunctions() });

            return result;
        }

        function performUpgradeAsync(dom) {
            return template.getTemplateFileAsync(settings.transform)
                   .then(function (fileContents) { return transformDom(dom, fileContents); });
        }

        function tryUpgradeAsync(document, api) {
            // Checks whether the provided DOM should be upgraded based on the template's upgrade settings
            // and returns a promise for the upgraded DOM if needed, or a promise for the provided DOM
            // if not

            if (shouldUpgrade(document)) {
                return performUpgradeAsync(document, api);
            }
            return Q.Promise.resolve(document);
        }

        return {
            tryUpgradeAsync: tryUpgradeAsync
        };
    }

    return {
        create: create
    };
})();




function File(name, bytes) {
    this.name = name;
    this.bytes = bytes;
}

FVDomain.DataAdapters = {};


FVDomain.DataAdapters.SharePointListAdapter = (function () {
    function extractFieldNames(fields) {
        return map(fields, function (f) { return f.internalName; });
    }

    function sla(siteUrl, listId, relListUrl, fields, sortBy, sortAsc) {
        var fieldNames = extractFieldNames(fields);

        this.fields = fields;
        this.fieldNames = fieldNames;
        this.siteURL = siteUrl;
        this.listId = listId;
        this.relListUrl = relListUrl;
        this.sortBy = sortBy;
        this.sortAsc = sortAsc;
    }

    return sla;
})();
