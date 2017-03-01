/*
 * xmlUtility
 * 
 * A collection of utility functions for working with XML DOMs
 * 
 * Copyright Qdabra Software
 * 
 */

var qd = qd || {};

qd.xmlUtility = (function () {
    "use strict";

    var DOM_ELEMENT_NODE = 1,
        DOM_ATTRIBUTE_NODE = 2,
        DOM_TEXT_NODE = 3,
        DOM_CDATA_SECTION_NODE = 4,
        DOM_ENTITY_REFERENCE_NODE = 5,
        DOM_ENTITY_NODE = 6,
        DOM_PROCESSING_INSTRUCTION_NODE = 7,
        DOM_COMMENT_NODE = 8,
        DOM_DOCUMENT_NODE = 9,
        DOM_DOCUMENT_TYPE_NODE = 10,
        DOM_DOCUMENT_FRAGMENT_NODE = 11,
        DOM_NOTATION_NODE = 12;

    var nsXmlns = "http://www.w3.org/2000/xmlns/";

    function toArray(alo) {
        return Array.prototype.slice.call(alo);
    }

    function filter(items, pred) {
        return Array.prototype.filter.call(items, pred);
    }

    function extend(dest, source) {
        Object.keys(source).forEach(function (k) {
            dest[k] = source[k];
        });

        return dest;
    }

    function isNodeType(type, n) {
        return n.nodeType === type;
    }

    var isElement = isNodeType.bind(null, DOM_ELEMENT_NODE);

    function getChildElements(n, name, ns) {
        if (!name) {
            return filter(n.childNodes, isElement);
        }

        return getChildElements(n).filter(function (el) {
            return el.localName === name && el.namespaceURI === (ns || null);
        });
    }

    function firstElementChild(n) {
        return getChildElements(n)[0];
    }

    function getChildNodes(n) {
        return Array.prototype.slice.call(n.childNodes);
    }

    /**
     * Returns an array of the namespaces for the specified node.
     * The namespaes are represented as an object with the properties .prefix and .uri, and the default namespace has the empty string as its prefix
     */
    function getNamespaces(node) {
        if (!node.attributes) {
            return [];
        }

        return filter(node.attributes, function (a) {
            return a.namespaceURI === nsXmlns;
        }).map(function (a) {
            return { prefix: (a.name === 'xmlns' ? '' : a.localName), uri: a.value };
        });
    }

    function createNsManager(parentNsMap, namespaces) {
        var nsEs = {};

        if (parentNsMap) {
            extend(nsEs, parentNsMap);
        }

        if (namespaces) {
            if (!Array.isArray(namespaces)) {
                throw new Error("namespace list is not an array");
            }

            namespaces.forEach(function (ns) {
                nsEs[ns.prefix] = ns.uri;
            });
        }

        return {
            getNamespace: function (prefix) { return nsEs[prefix] || ''; },
            clone: function (newNamespaces) { return createNsManager(nsEs, newNamespaces) },
            prefixes: function () { return Object.keys(nsEs); },
            /**
             * Returns an object mapping namespace prefixes to namespace URIs
             */
            namespaceMap: function () { return extend({}, nsEs); }
        };
    }

    function namespaceManager(namespaces) {
        return createNsManager(null, namespaces);
    }

    var entityTable = {
        '"': 'quot',
        '&': 'amp',
        "'": 'apos',
        "<": 'lt',
        ">": 'gt'
    };

    function xmlEntities(text) {
        return text.replace(/[\u00A0-\u2666<>\&"']/g, function (c) {
            return '&' + (entityTable[c] || '#' + c.charCodeAt(0)) + ';';
        });
    }

    function getAttributes(node) {
        if (!node.attributes) {
            return [];
        }

        return [].concat(toArray(node.attributes));
    }

    function xmlToStringInner(node) {
        var serializer;

        if (node.nodeType === DOM_DOCUMENT_FRAGMENT_NODE || node.nodeType === DOM_DOCUMENT_NODE) {
            return getChildNodes(node).map(xmlToString).join("");
        }

        if (node.nodeType === DOM_ATTRIBUTE_NODE) {
            return node.nodeName + '="' + xmlEntities(node.value) + '"';
        }

        try {
            // XMLSerializer exists in certain browsers
            serializer = new XMLSerializer();
            return serializer.serializeToString(node);
        }
        catch (e) {
            // Internet Explorer has a different approach to serializing XML
            return elem.xml;
        }
    }

    function xmlToString(node) {
        var str = xmlToStringInner(node);

        // IE's XMLSerializer places explicit xmlns:xml declarations in serialized XML 
        // when XML contains an xml:... attribute and this can cause problems for certain parsers
        return str && str.replace(/\sxmlns\:xml=['"]http\:\/\/www\.w3\.org\/XML\/1998\/namespace['"]/g, '');
    }
    
    function textValue(node) {
        switch (node.nodeType) {
            case DOM_TEXT_NODE:
            case DOM_ELEMENT_NODE:
            case DOM_CDATA_SECTION_NODE:
                return node.textContent;
            case DOM_ATTRIBUTE_NODE:
                return node.value;
        }

        return '';
    }

    function isAttribute(node) {
        return node.nodeType === DOM_ATTRIBUTE_NODE || 'ownerElement' in node;
    }

    return {
        DOM_ELEMENT_NODE: DOM_ELEMENT_NODE,
        DOM_ATTRIBUTE_NODE: DOM_ATTRIBUTE_NODE,
        DOM_TEXT_NODE: DOM_TEXT_NODE,
        DOM_CDATA_SECTION_NODE: DOM_CDATA_SECTION_NODE,
        DOM_PROCESSING_INSTRUCTION_NODE: DOM_PROCESSING_INSTRUCTION_NODE,
        DOM_COMMENT_NODE: DOM_COMMENT_NODE,
        DOM_DOCUMENT_NODE: DOM_DOCUMENT_NODE,
        DOM_DOCUMENT_FRAGMENT_NODE: DOM_DOCUMENT_FRAGMENT_NODE,

        nsXmlns: nsXmlns,

        isDocumentNode: isNodeType.bind(null, DOM_DOCUMENT_NODE),
        isElement: isElement,
        isTextNode: isNodeType.bind(null, DOM_TEXT_NODE),
        isComment: isNodeType.bind(null, DOM_COMMENT_NODE),
        isCData: isNodeType.bind(null, DOM_CDATA_SECTION_NODE),
        isProcessingInstruction: isNodeType.bind(null, DOM_PROCESSING_INSTRUCTION_NODE),
        isAttribute: isAttribute,

        firstElementChild: firstElementChild,
        getAttributes: getAttributes,
        getChildElements: getChildElements,
        getChildNodes: getChildNodes,
        getNamespaces: getNamespaces,
        namespaceManager: namespaceManager,
        xmlToString: xmlToString,
        textValue: textValue
    };

})();