var qd = qd || {};
qd.qRules = qd.qRules || {};

qd.qRules.jsonXmlConvert = (function () {
    "use strict";

    var typeObject = "object",
        typeArray = "array",
        typeString = "string",
        typeNumber = "number",
        typeBoolean = "boolean",
        xu = qd.xmlUtility;

    function find(alo, predicate) {
        for (var i = 0; i < alo.length; i += 1) {
            if (predicate(alo[i])) {
                return alo[i];
            }
        }

        return null;
    }

    function getAttribute(node, name) {
        var attrs = node.attributes,
            attr = attrs && find(attrs, function(a) {
                return a.localName === name;
            });

        return attr ? attr.nodeValue : null;
    }
    
    function detectType(node) {
        return find(node.childNodes, xu.isElement)
            ? typeObject
            : typeString;
    }

    function determineTypeForNode(node) {
        var typeAttr = getAttribute(node, "type");

        if (!typeAttr) {
            return detectType(node);
        }

        typeAttr = typeAttr.toLowerCase();

        switch (typeAttr.toLowerCase()) {
            case typeObject:
            case typeArray:
            case typeNumber:
            case typeBoolean:
                return typeAttr;
            default:
                return typeString;
        }
    }

    function parseBoolean(value) {
        if (!value) {
            return null;
        }

        switch(value.trim().toLowerCase()) {
            case "true":
            case "1":
                return true;
            case "false":
            case "0":
                return false;
            default:
                throw new Error('Invalid boolean value: ' + value);
        }
    }

    function parseNumber(value) {
        return value === '' ? null : Number(value);
    }

    function getName(node) {
        var nameAttr = getAttribute(node, 'name');

        return nameAttr === null ? node.localName : nameAttr;
    }

    function toObject(node) {
        var elements = xu.getChildElements(node),
            obj = {};

        elements.forEach(function(el) {
            var name = getName(el);

            if (name in obj) {
                throw new Error("Objects cannot contain duplicate keys. Key found: \"" + name + "\"");
            }

            obj[name] = fromXml(el);
        });

        return obj;
    }

    function toArray(node) {
        var elements = qd.xmlUtility.getChildElements(node);

        return elements.map(fromXml);
    }

    function fromXml(node) {
        var nullFlag = getAttribute(node, 'null'),
            type;

        if (nullFlag === 'true' || nullFlag === '1') {
            return null;
        }

        type = determineTypeForNode(node);

        switch (type) {
            case typeObject:
                return toObject(node);
            case typeArray:
                return toArray(node);
            case typeNumber:
                return parseNumber(node.textContent);
            case typeBoolean:
                return parseBoolean(node.textContent);
            default:
                return node.textContent;
        }
    }

    function replaceInvalidChar(c) {
        var code = c.charCodeAt(0),
            hex = code.toString(16);

        return "_x" + "0000".substring(hex.length) + hex + "_";
    }

    var invalidStartChar = /[^A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD]/g,
        invalidContinueChar = /[^A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]/g;

    function getValidName(name) {
        var firstChar,
            rest;

        if (name === '') {
            return '_x0000_';
        }

        firstChar = name[0].replace(invalidStartChar, replaceInvalidChar);
        rest = name.substring(1).replace(invalidContinueChar, replaceInvalidChar);

        return firstChar + rest;
    }

    function createElement(base, name, includeNameAttr) {
        var elName = getValidName(name),
            el = base.ownerDocument.createElement(elName);

        if (elName !== name && includeNameAttr) {
            el.setAttribute("name", name);
        }

        return el;
    }

    function determineTypeForObj(val) {
        if (Array.isArray(val)) {
            return typeArray;
        }
        if (typeof val === "boolean") {
            return typeBoolean;
        }
        if (typeof val === "number") {
            return typeNumber;
        }
        if (typeof val === "object") {
            return typeObject;
        }

        return typeString;
    }

    function objectToXml(element, obj) {
        var keys = Object.keys(obj).sort(function (l, r) { return l.localeCompare(r); });

        console.log(keys);

        keys.forEach(function(k) {
            var el = createElement(element, k, true);

            element.appendChild(el);

            toXmlInner(el, k, obj[k]);
        });
    }

    function arrayToXml(element, arr, parentName) {
        var itemName = parentName + "Item";

        arr.forEach(function(item) {
            var el = createElement(element, itemName, false);

            element.appendChild(el);

            toXmlInner(el, itemName, item);
        });
    }

    function valueToXml(element, val) {
        element.textContent = val;
    }

    function toXmlInner(element, name, val) {
        var type;

        if (val === null) {
            element.setAttribute("null", "true");
            return;
        }

        type = determineTypeForObj(val);

        element.setAttribute("type", type);

        switch(type) {
            case typeObject:
                objectToXml(element, val);
                break;

            case typeArray:
                arrayToXml(element, val, name);
                break;

            case typeBoolean:
            case typeNumber:
            default:
                valueToXml(element, val);
                break;
        }
    }

    function parseXml(xml) {
        var parser = new window.DOMParser(),
            dom;
        if (!xml) {
            return null;
        }

        try {
            dom = parser.parseFromString(xml, "text/xml");
        } catch ( e ) {
            dom = null;
        }

        if ( !dom ) {
            throw new Error('Invalid XML: ' + xml);
        }

        return dom;
    }

    function toXml(val) {
        var xml = parseXml('<root />'),
            docEl = xml.documentElement;

        toXmlInner(docEl, '', val);

        return docEl;
    }

    return {
        fromXml: fromXml,
        toXml: toXml
    };

})();