/// <reference path="../util.js" />
/// <reference path="../xpath.js" /> 

// Copyright 2005 Google Inc., Qdabra Software
// All Rights Reserved
//
//
// An XSLT processor written in JavaScript. The implementation is NOT
// complete; some xsl elements are left out.
// 
// This implementation has been extensively modified from Google's original
// implementation and has some dependencies on functionality from the FormsViewer
// utility library
//
// References:
//
// [XSLT] XSLT Specification
// <http://www.w3.org/TR/1999/REC-xslt-19991116>.
//
// NOTE: Actually, XSL-T processing according to the specification is
// defined as operation on text documents, not as operation on DOM
// trees. So, strictly speaking, this implementation is not an XSL-T
// processor, but the processing engine that needs to be complemented
// by an XML parser and serializer in order to be complete. Those two
// are found in the file xml.js.
//
//
// TODO(mesch): add jsdoc comments. Use more coherent naming. Finish
// remaining XSLT features.
//
//
// Original Author: Steffen Meschkat <mesch@google.com>
// With extensive modifications by Qdabra Software

// The exported entry point of the XSLT processor, as explained
// above.
//
// @param xmlDoc The input document root, as DOM node.
// @param template The stylesheet document root, as DOM node.
// @return the processed document, as XML text in a string.

function xsltProcess(xmlDoc, stylesheet) {
    var processor = new XsltProcessor(stylesheet)
    output = processor.processDocument(xmlDoc),
    ret = FVUtil.xmlToString(output);

    return ret;
}

// Defines a single XSLT template within a stylesheet
//   node     (DOMNode)         is the template node itself
//   match    (XPathExpression) is the expression for the template's match property
//   mode     (String)          is the template's mode (or null if unspecified)
//   priority (Number)          is the template's priority, either explicit or implicit
function XsltTemplate(node, priority, matchPath) {
    this.node = node;
    this.match = matchPath;
    this.mode = FVUtil.getAttribute(node, "mode");
    this.priority = priority;
}

function XmlNamespaceResolver() {
    var namespaces = {};

    this.addNamespace = function (prefix, uri) {
        namespaces[prefix] = uri;
    };

    this.lookupNamespaceURI = function (prefix) {
        return namespaces[prefix];
    };
}

// Represents an XSLT stylesheet
// stylesheet (DOMNode)   is the node representing the stylesheet
// templates  (DOMNode[]) is the list of templates in the stylesheet
function XsltStylesheet(stylesheet) {
    var stylesheetNode = stylesheet;

    this.parser = new xpath.XPathParser();

    // Go to first child if at root
    if (stylesheetNode.nodeType === 9) {
        stylesheetNode = filter(stylesheetNode.childNodes, function (item) { return item.nodeType === 1; })[0];
    }

    this.namespaceManager = FVUtil.buildNamespaceManager(stylesheetNode, FVNamespaceResolver);

    var children = stylesheetNode.childNodes;

    // These templates will occur in the order they appear in the XSLT
    this.templates = this.getTemplates(children);
}

XsltStylesheet.prototype.getTemplates = function (candidateNodes) {
    var self = this;

    // predicate to identify templates
    var isTemplateTest = function (node) {
        return node.namespaceURI === XSLT_NAMESPACE &&
               node.localName === "template" &&
               FVUtil.getAttribute(node, "match");
    };
    var allTemplates = filter(candidateNodes, isTemplateTest);

    // closure to split templates with multiple priorities into separate templates
    var getTemplatesClosure = function (item) { return self.getSubTemplates(item); };

    // splitTemplates is XsltTemplate[][]
    var splitTemplates = map(allTemplates, getTemplatesClosure);

    // combine template sub-arrays into one array
    return foldRight(splitTemplates, function (l, r) { return l.concat(r); }, []);
};

XsltStylesheet.prototype.getSubTemplates = function (templateNode) {
    var priority = FVUtil.getAttribute(templateNode, "priority");
    var matchExpr = this.parseXPath(FVUtil.getAttribute(templateNode, "match"));
    if (priority) {
        return [new XsltTemplate(templateNode, +priority, matchExpr)];
    }

    return this.splitTemplates(templateNode, matchExpr);
};

XsltStylesheet.prototype.splitTemplates = function (templateNode, matchExpr) {

    var parts = this.getExpressionParts(matchExpr.expression);

    var self = this;
    var makeTemplateWithPriority =
        function (expr) {
            return new XsltTemplate(templateNode,
                                    self.getExpressionPriority(expr),
                                    expr);
        };

    return map(parts, makeTemplateWithPriority);
};

XsltStylesheet.prototype.getExpressionParts = function (expr) {
    var lp, rp;

    if (xpath.Utilities.instance_of(expr, xpath.BarOperation)) {
        lp = this.getExpressionParts(expr.lhs);
        rp = this.getExpressionParts(expr.rhs);
        return lp.concat(rp);
    }

    return [new xpath.XPath(expr)];
}

XsltStylesheet.prototype.getExpressionPriority = function (expr) {

    // XSLT 1.0 Spec, section 5.6

    if (expr.type == "StepExpr" && !(expr.predicates.length) && (expr.axis == "child" || expr.axis == "attribute")) {
        var test = expr.test;
        // Node name test and named PI : 0 (named PI not supported by XPath parser)
        if (test.localName && test.localName != "*") {
            return 0;
        }

        // NC (namespace prefix test) : -0.25
        if (test.prefix && test.prefix != "*") {
            return -0.25;
        }

        // Generic node tests : -0.5
        if (test.localName == "*" ||
            test.name == "node" ||
            test.name == "processing-instruction" ||
            test.name == "text" ||
            test.name == "comment") {
            return -0.5
        }
    }

    // Everything else : 0.5
    return 0.5;
}

XsltStylesheet.prototype.parseXPath = function (sXPath) {
    return this.parser.parse(sXPath);
};


// =============
// XsltProcessor
// =============

// Constructor: DomNode -> XsltProcessor
function XsltProcessor(stylesheet) {
    this.stylesheet = new XsltStylesheet(stylesheet);
    this.baseDocument_ = $.parseXML("<n />");
}

XsltProcessor.prototype.createDocumentFragment = function () {
    return this.baseDocument_.createDocumentFragment();
}

XsltProcessor.prototype.createTextNode = function (node, value) {
    return FVUtil.ownerDocument(node).createTextNode(value);
};

XsltProcessor.prototype.createElement = function (baseNode, name, ns) {
    var doc = FVUtil.ownerDocument(baseNode);

    return ns ? doc.createElementNS(ns, name) : doc.createElement(name);
};

XsltProcessor.prototype.appendChild = function (node, child) {
    return node.appendChild(child);
};

// DomNode, { [functions: XPathFunctions] } -> DomNode
XsltProcessor.prototype.processDocument = function (document, options) {
    var output = FVUtil.createEmptyXmldocument(),
        functions = (options && options.functions) || undefined,
        context = this.makeContext(document, functions);

    // TODO: Global XSLT variables

    this.applyTemplate(context, null, output);

    return output;
};

// DomNode, { [functions: XPathFunctions] } -> String
XsltProcessor.prototype.processDocumentToString = function (document, options) {
    return FVUtil.xmlToString(this.processDocument(document, options));
};

XsltProcessor.prototype.applyTemplate = function (context, mode, output) {
    var self = this, matched, maxPri;
    var fIsMatch = function (template) { return self.isTemplateMatch(context, template, mode); };

    matched = filter(this.stylesheet.templates, fIsMatch);

    if (matched.length == 0) {
        this.builtinTemplates(context, mode, output);
    }
    else {
        maxPri = this.findMaxPriorityTemplate(matched);
        this.xsltChildNodes(context, maxPri.node, output);
    }
}

// ExprContext, DOM node, string -> Boolean
// Determines whether the specified template's match expression matches
// the specified node and the the specified mode
// !!
XsltProcessor.prototype.isTemplateMatch = function (context, template, mode) {
    return mode == template.mode && this.xsltMatch(template.match, context);
}

// ExprContext, DOMNode -> void
// Applies the appropriate built-in template to the specified node
// !!
XsltProcessor.prototype.builtinTemplates = function (context, mode, output) {
    var node = this.getContextNode(context),
        nt = node.nodeType,
        childContext,
        i,
        text;

    if (nt === DOM_DOCUMENT_NODE || nt === DOM_ELEMENT_NODE || nt === DOM_DOCUMENT_FRAGMENT_NODE) {
        for (i = 0; i < node.childNodes.length; i += 1) {
            childContext = this.cloneContext(context, node.childNodes[i], i, node.childNodes);
            this.applyTemplate(childContext, mode, output);
        }
    } else if (nt == DOM_ATTRIBUTE_NODE || nt == DOM_TEXT_NODE) {
        text = this.createTextNode(output, node.nodeValue);
        output.appendChild(text);
    }
};

// DOM Node[] -> DOM Node
// Finds the template with the highest priority and returns it
// Asumes templates has at least one item
// !!
XsltProcessor.prototype.findMaxPriorityTemplate = function (templates) {

    // Pick the template with higher priority; favor those that come later
    var pickGreater = function (soFar, current) { return (current.priority >= soFar.priority) ? current : soFar; };

    return foldRight(templates, pickGreater, templates[0]);
};

// XSLTContext, DOMNode, DOMNode -> void
// Executes an apply-templates instruction
XsltProcessor.prototype.applyTemplates = function (context, applyTemplatesNode, output) {

    var select = FVUtil.getAttribute(applyTemplatesNode, 'select');
    var nodes;

    if (select) {
        nodes = this.resultToArray(this.evalXPath(select, context));
    } else {
        nodes = this.getContextNode(context).childNodes;
    }

    var sortContext = this.cloneContext(context, nodes[0], 0, nodes);
    // TODO: Re-add sort
    // this.xsltWithParam(sortContext, applyTemplatesNode);
    // this.xsltSort(sortContext, applyTemplatesNode);

    var mode = FVUtil.getAttribute(applyTemplatesNode, 'mode');

    for (var j = 0; j < nodes.length; ++j) {
        var nj = nodes[j];

        this.applyTemplate(this.cloneContext(sortContext, nj, j), mode, output);
    }
}

XsltProcessor.prototype.callTemplate = function (context, callTemplateNode, output) {
    var name = FVUtil.getAttribute(callTemplateNode, 'name'),
        top = callTemplateNode.ownerDocument.documentElement,
        paramContext = this.cloneContext(context),
        i,
        c;

    this.xsltWithParam(paramContext, callTemplateNode);

    for (i = 0; i < top.childNodes.length; i += 1) {
        c = top.childNodes[i];
        if (c.nodeType == DOM_ELEMENT_NODE &&
            c.nodeName == 'xsl:template' &&
            FVUtil.getAttribute(c, 'name') == name) {
            this.xsltChildNodes(paramContext, c, output);
            break;
        }
    }
};

// The main entry point of the XSL-T processor, as explained above.
//
// @param input The input document root, as XPath ExprContext.
// @param template The stylesheet document root, as DOM node.
// @param the root of the generated output, as DOM node.

XsltProcessor.prototype.xsltProcessContext = function (input, xsltNode, output) {
    var outputDocument = FVUtil.ownerDocument(output),
        prefix = xsltNode.prefix,
        name = xsltNode.localName,
        node;

    if (prefix != 'xsl') {
        this.xsltPassThrough(input, xsltNode, output, outputDocument);
    }
    else {
        switch (name) {
            case 'apply-imports':
                this.notImplemented(name);
                break;

            case 'apply-templates':
                this.applyTemplates(input, xsltNode, output);
                break;

            case 'attribute':
                var nameexpr = FVUtil.getAttribute(xsltNode, 'name');
                var name = this.xsltAttributeValue(nameexpr, input);
                node = this.createDocumentFragment();
                this.xsltChildNodes(input, xsltNode, node);
                var value = xmlValue(node);
                FVUtil.setAttribute(output, name, value);
                break;

            case 'attribute-set':
                this.notImplemented(name);
                break;

            case 'call-template':
                this.callTemplate(input, xsltNode, output);
                break;

            case 'choose':
                this.xsltChoose(input, xsltNode, output);
                break;

            case 'comment':
                node = this.createDocumentFragment();
                this.xsltChildNodes(input, xsltNode, node);
                var commentData = xmlValue(node);
                var commentNode = domCreateComment(outputDocument, commentData);
                output.appendChild(commentNode);
                break;

            case 'copy':
                node = this.xsltCopy(output, input, outputDocument);
                if (node) {
                    this.xsltChildNodes(input, xsltNode, node);
                }
                break;

            case 'copy-of':
                var selectExpr = FVUtil.getAttribute(xsltNode, 'select');
                this.xsltCopyOf(output, input, outputDocument, selectExpr);
                break;

            case 'decimal-format':
                this.notImplemented(name);
                break;

            case 'element':
                this.xsltElement(xsltNode, output, input, outputDocument);
                break;

            case 'fallback':
                this.notImplemented(name);
                break;

            case 'for-each':
                this.xsltForEach(input, xsltNode, output);
                break;

            case 'if':
                var test = FVUtil.getAttribute(xsltNode, 'test');
                var passed = this.toBoolean(this.evalXPath(test, input), input);
                if (passed) {
                    this.xsltChildNodes(input, xsltNode, output);
                }
                break;

            case 'import':
                this.notImplemented(name);
                break;

            case 'include':
                this.notImplemented(name);
                break;

            case 'key':
                this.notImplemented(name);
                break;

            case 'message':
                this.notImplemented(name);
                break;

            case 'namespace-alias':
                this.notImplemented(name);
                break;

            case 'number':
                this.notImplemented(name);
                break;

            case 'otherwise':
                this.invalidState(name);
                break;

            case 'output':
                // Ignored. -- Since we operate on the DOM, and all further use
                // of the output of the XSL transformation is determined by the
                // browser that we run in, this parameter is not applicable to
                // this implementation.
                break;

            case 'preserve-space':
                this.notImplemented(name);
                break;

            case 'processing-instruction':
                this.notImplemented(name);
                break;

            case 'sort':
                // just ignore -- was handled by xsltSort()
                break;

            case 'strip-space':
                this.notImplemented(name);
                break;

            case 'stylesheet':
            case 'transform':
                this.xsltChildNodes(input, xsltNode, output);
                break;

            case 'template':
                this.invalidState(name);
                break;

            case 'text':
                var text = xmlValue(xsltNode);
                node = this.createTextNode(outputDocument, text);
                output.appendChild(node);
                break;

            case 'value-of':
                this.xsltValueOf(input, xsltNode, output);
                break;

            case 'param':
                this.xsltVariable(input, xsltNode, false);
                break;

            case 'variable':
                this.xsltVariable(input, xsltNode, true);
                break;

            case 'when':
                this.invalidState(name);
                break;

            case 'with-param':
                this.invalidState(name);
                break;

            default:
                this.invalidState(name);
                break;
        }
    }
};

XsltProcessor.prototype.notImplemented = function (nodeName) {
    alert('not implemented: ' + nodeName);
};

XsltProcessor.prototype.invalidState = function (nodeName) {
    alert('error if here: ' + nodeName);
};

XsltProcessor.prototype.xsltValueOf = function (context, valueOfNode, output) {
    var select = FVUtil.getAttribute(valueOfNode, 'select');
    var result = this.evalXPath(select, context);
    var value = this.toStringValue(result, context);
    var node = this.createTextNode(output, value);
    output.appendChild(node);
};

// Sets parameters defined by xsl:with-param child nodes of the
// current template node, in the current input context. This happens
// before the operation specified by the current template node is
// executed.

XsltProcessor.prototype.xsltWithParam = function (input, template) {
    for (var i = 0; i < template.childNodes.length; ++i) {
        var c = template.childNodes[i];
        if (c.nodeType == DOM_ELEMENT_NODE && c.nodeName == 'xsl:with-param') {
            this.xsltVariable(input, c, true);
        }
    }
};

XsltProcessor.prototype.xsltElement = function (xsltNode, dest, context, destDocument) {
    var nameexpr = FVUtil.getAttribute(xsltNode, 'name'),
        name = this.xsltAttributeValue(nameexpr, context),
        namespace = this.getNamespaceUri(name, xsltNode),
        node = this.createElement(destDocument, name, namespace);

    this.appendChild(dest, node);
    this.xsltChildNodes(context, xsltNode, node);
};

XsltProcessor.prototype.getNamespaceUri = function (nodeName, context) {
    var parts = nodeName.split(":"),
        uri;

    if (parts.length < 2) {
        return "";
    }
    uri = this.stylesheet.namespaceManager.lookupNamespaceURI(parts[0], context);
    return uri || "";
};

// Orders the current node list in the input context according to the
// sort order specified by xsl:sort child nodes of the current
// template node. This happens before the operation specified by the
// current template node is executed.
//
// TODO(mesch): case-order is not implemented.

XsltProcessor.prototype.xsltSort = function (input, template) {
    var sort = [];
    for (var i = 0; i < template.childNodes.length; ++i) {
        var c = template.childNodes[i];
        if (c.nodeType == DOM_ELEMENT_NODE && c.nodeName == 'xsl:sort') {
            var select = FVUtil.getAttribute(c, 'select');
            var expr = this.parseXPath(select);
            var type = FVUtil.getAttribute(c, 'data-type') || 'text';
            var order = FVUtil.getAttribute(c, 'order') || 'ascending';
            sort.push({ expr: expr, type: type, order: order });
        }
    }

    xpathSort(input, sort);
};


// Evaluates a variable or parameter and set it in the current input
// context. Implements xsl:variable, xsl:param, and xsl:with-param.
//
// @param override flag that defines if the value computed here
// overrides the one already in the input context if that is the
// case. I.e. decides if this is a default value or a local
// value. xsl:variable and xsl:with-param override; xsl:param doesn't.

XsltProcessor.prototype.xsltVariable = function (context, template, override) {
    var name = FVUtil.getAttribute(template, 'name');
    var select = FVUtil.getAttribute(template, 'select');

    var value;

    if (template.childNodes.length > 0) {
        var root = this.createDocumentFragment();
        this.xsltChildNodes(context, template, root);
        value = new xpath.XNodeSet();
        value.addArray([root]);
    } else if (select) {
        value = this.evalXPath(select, context);
    } else {
        value = new xpath.XString("");
    }

    if (override || !this.hasVariable(context, name)) {
        this.setVariable(context, "", name, value);
    }
};


// Implements xsl:choose and its child nodes xsl:when and
// xsl:otherwise.

XsltProcessor.prototype.xsltChoose = function (input, template, output) {
    for (var i = 0; i < template.childNodes.length; ++i) {
        var childNode = template.childNodes[i];
        if (childNode.nodeType != DOM_ELEMENT_NODE) {
            continue;

        } else if (childNode.nodeName == 'xsl:when') {
            var test = FVUtil.getAttribute(childNode, 'test');
            if (this.toBoolean(this.evalXPath(test, input), input)) {
                this.xsltChildNodes(input, childNode, output);
                break;
            }

        } else if (childNode.nodeName == 'xsl:otherwise') {
            this.xsltChildNodes(input, childNode, output);
            break;
        }
    }
};


// Implements xsl:for-each.

XsltProcessor.prototype.xsltForEach = function (context, template, output) {
    var select = FVUtil.getAttribute(template, 'select');
    var nodes = this.resultToArray(this.evalXPath(select, context));
    var sortContext = this.cloneContext(context, nodes[0], 0, nodes);

    // TODO: Fix sorting
    // xsltSort(sortContext, template);

    for (var i = 0; i < nodes.length; ++i) {
        var ni = nodes[i];
        this.xsltChildNodes(this.cloneContext(sortContext, ni, i), template, output);
    }
};


// Traverses the template node tree. Calls the main processing
// function with the current input context for every child node of the
// current template node.

XsltProcessor.prototype.xsltChildNodes = function (context, xsltNode, output) {
    // Clone input context to keep variables declared here local to the
    // siblings of the children.
    var context = this.cloneContext(context);

    for (var i = 0; i < xsltNode.childNodes.length; ++i) {
        this.xsltProcessContext(context, xsltNode.childNodes[i], output);
    }
}


// Passes template text to the output. The current template node does
// not specify an XSL-T operation and therefore is appended to the
// output with all its attributes. Then continues traversing the
// template node tree.

XsltProcessor.prototype.xsltPassThrough = function (input, template, output, outputDocument) {
    if (template.nodeType == DOM_TEXT_NODE) {
        if (this.xsltPassText(template)) {
            var node = this.createTextNode(outputDocument, template.nodeValue);
            this.appendChild(output, node);
        }

    } else if (template.nodeType == DOM_ELEMENT_NODE) {
        //var node = this.createElement(outputDocument, template.nodeName);
        var node = this.createElement(outputDocument, template.nodeName, template.namespaceURI);
        for (var i = 0; i < template.attributes.length; ++i) {
            var a = template.attributes[i];
            if (a) {
                var name = a.nodeName;
                var value = this.xsltAttributeValue(a.nodeValue, input);
                FVUtil.setAttribute(node, name, value);
            }
        }
        this.appendChild(output, node);
        this.xsltChildNodes(input, template, node);

    } else {
        // This applies also to the DOCUMENT_NODE of the XSL stylesheet,
        // so we don't have to treat it specially.
        this.xsltChildNodes(input, template, output);
    }
};

// Determines if a text node in the XSLT template document is to be
// stripped according to XSLT whitespace stipping rules.
//
// See [XSLT], section 3.4.
//
// TODO(mesch): Whitespace stripping on the input document is
// currently not implemented.

XsltProcessor.prototype.xsltPassText = function (template) {
    if (!template.nodeValue.match(/^\s*$/)) {
        return true;
    }

    if (template.parentNode && template.parentNode.childNodes.length === 1) {
        return true;
    }

    var element = template.parentNode;
    if (element.nodeName == 'xsl:text') {
        return true;
    }

    while (element && element.nodeType == DOM_ELEMENT_NODE) {
        var xmlspace = FVUtil.getAttribute(element, 'xml:space');
        if (xmlspace) {
            if (xmlspace == 'default') {
                return false;
            } else if (xmlspace == 'preserve') {
                return true;
            }
        }

        element = element.parentNode;
    }

    return false;
};

// Evaluates an XSL-T attribute value template. Attribute value
// templates are attributes on XSL-T elements that contain XPath
// expressions in braces {}. The XSL-T expressions are evaluated in
// the current input context. NOTE(mesch): We are using stringSplit()
// instead of string.split() for IE compatibility, see comment on
// stringSplit().

XsltProcessor.prototype.xsltAttributeValue = function (value, context) {
    var parts = stringSplit(value, '{'), ret, rp, result, i, val;
    if (parts.length == 1) {
        return value;
    }

    ret = '';
    for (i = 0; i < parts.length; ++i) {
        rp = stringSplit(parts[i], '}');
        if (rp.length != 2) {
            // first literal part of the value
            ret += parts[i];
            continue;
        }

        result = this.evalXPath(rp[0], context);
        val = this.toStringValue(result, context);
        ret += val + rp[1];
    }

    return ret;
};

// Note: Deleted previous implementation of copy-of on 2014-06-04

// Implements xsl:copy-of for node-set values of the select
// expression. Recurses down the source node tree, which is part of
// the input document.
//
// @param {Node} dst the node being copied to, part of output document,
// @param {Node} src the node being copied, part in input document,
// @param {Document} dstDocument

XsltProcessor.prototype.xsltCopyOf = function (dst, context, dstDocument, selectExpr) {
    var value = this.evalXPath(selectExpr, context),
        nodes,
        node;

    if (this.isNodeSet(value, context)) {
        nodes = this.resultToArray(value);
        $.each(nodes, function (i, n) {
            this.copyToDest(dst, n, dstDocument);
        }.bind(this));
    } else {
        node = this.createTextNode(dstDocument, value.stringValue());
        this.appendChild(dst, node);
    }
};

XsltProcessor.prototype.copyToDest = function (dest, node) {
    var nodeType = node.nodeType,
        clone = node.cloneNode(true);

    if (nodeType === DOM_ATTRIBUTE_NODE) {
        dest.setAttributeNode(clone);
    } else {
        dest.appendChild(clone);
    }
};


// Implements xsl:copy for all node types.
//
// @param {Node} dst the node being copied to, part of output document,
// @param {XPathContext} context The current context of the XSLT execution
// @param {Document} dstDocument
// @return {Node|Null} If an element node was created, the element
// node. Otherwise null.

XsltProcessor.prototype.xsltCopy = function (dst, context, dstDocument) {
    var node = this.getContextNode(context),
        nodeType = node.nodeType,
        newNode,
        generator;

    if (nodeType === DOM_ATTRIBUTE_NODE) {
        FVUtil.setAttribute(dst, node.nodeName, node.nodeValue);
    } else if (nodeType === DOM_ELEMENT_NODE) {
        newNode = this.createElement(dstDocument, node.nodeName, node.namespaceURI);
        this.transferNamespaces(newNode, node);
        this.appendChild(dst, newNode);
        return newNode
    } else {
        generator = this.getValueNodeGenerator(nodeType);
        if (generator) {
            newNode = generator(dstDocument, node.nodeValue);
        }
        if (newNode) {
            this.appendChild(dst, newNode);
        }
    }
};

XsltProcessor.prototype.transferNamespaces = function (dest, src) {
    // TODO: This does not account for inherited namespaces. We should take them
    //       into account too
    forEach(FVUtil.getNamespaces(src), function (ns) {
        dest.setAttributeNode(ns.cloneNode(true));
    });
};

XsltProcessor.prototype.getValueNodeGenerator = function (nodeType) {
    switch (nodeType) {
        case DOM_TEXT_NODE:
            return this.createTextNode.bind(this);
        case DOM_CDATA_SECTION_NODE:
            return domCreateCDATASection;
        case DOM_COMMENT_NODE:
            return domCreateComment;
    }

    return null;
};



// XPathExpression, XsltContext -> Boolean
// Evaluates an XPath expression in the current input context as a
// match (see [XSLT] section 5.2, paragraph 1).
XsltProcessor.prototype.xsltMatch = function (match, context) {
    var expr = match, node = this.getContextNode(context), i, exprContext, result;

    var ret;
    // Shortcut for the most common case.
    if (this.isChildTest(expr) && node && node.parentNode) {
        ret = expr.test.test(node, context);
    } else {
        ret = false;

        while (!ret && node) {
            exprContext = this.cloneContext(context, node, 0, [node]);
            result = this.resultToArray(this.evalExpr(expr, exprContext));
            for (i = 0; i < result.length; i += 1) {
                if (result[i] == this.getContextNode(context)) {
                    ret = true;
                    break;
                }
            }
            node = node.parentNode || node.ownerElement;
        }
    }

    return ret;
};

XsltProcessor.prototype.isChildTest = function (expr) {
    return expr.type == "StepExpr" && expr.axis == "child" && !(expr.predicates.length);
};

XsltProcessor.prototype.makeContext = function (dom, functions) {
    var context = new xpath.XPathContext(new FVVariableContext(), this.stylesheet.namespaceManager, functions);
    context.expressionContextNode = dom;

    return context;
};

// Converting expression results to certain types
XsltProcessor.prototype.toBoolean = function (exprResult, context) {
    return exprResult.booleanValue();
};

XsltProcessor.prototype.resultToArray = function (exprResult) {
    return exprResult.toArray();
};

XsltProcessor.prototype.toStringValue = function (exprResult, context) {
    return exprResult.stringValue();
};

XsltProcessor.prototype.isNodeSet = function (exprResult, context) {
    return xpath.Utilities.instance_of(exprResult, xpath.XNodeSet);
};

XsltProcessor.prototype.parseXPath = function (sXPath) {
    // Attempt to help performance a bit by caching parsed XPaths
    var parsed = XsltProcessor.XPathMap[sXPath];
    if (!parsed) {
        XsltProcessor.XPathMap[sXPath] = parsed = this.stylesheet.parseXPath(sXPath);
    }
    return parsed;
};

XsltProcessor.prototype.evalXPath = function (sXPath, context) {
    var parsed = this.parseXPath(sXPath);
    return this.evalExpr(parsed, context);
};

XsltProcessor.prototype.evalExpr = function (expr, context) {
    return expr.evaluate(context);
};

XsltProcessor.prototype.cloneContext = function (context, node, pos, set) {
    var xpc = new xpath.XPathContext();
    xpc.variableResolver = context.variableResolver.clone();
    xpc.namespaceResolver = context.namespaceResolver;
    xpc.functionResolver = context.functionResolver;
    xpc.expressionContextNode = node || context.expressionContextNode;

    return xpc;
};

XsltProcessor.prototype.setVariable = function (context, ns, name, value) {
    context.variableResolver.setVariable("", name, value);
};

XsltProcessor.prototype.hasVariable = function (context, name) {
    return !!context.variableResolver.getVariable(name, context);
};

XsltProcessor.prototype.getContextNode = function (context) {
    return context.expressionContextNode;
};

XsltProcessor.XPathMap = {};