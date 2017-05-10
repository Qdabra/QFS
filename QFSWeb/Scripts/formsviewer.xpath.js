/// <reference path="util.js" />
/// <reference path="xpath.js" />

var qd = qd || {};

qd.formsViewer = qd.formsViewer || {};
(function (window, qd) {
    "use strict";

    var XPathParser = xpath.XPathParser,
        XPathContext = xpath.XPathContext,
        NamespaceResolver = xpath.NamespaceResolver,
        FunctionResolver = xpath.FunctionResolver,
        VariableResolver = xpath.VariableResolver,
        Utilities = xpath.Utilities,
        XNodeSet = xpath.XNodeSet,
        XString = xpath.XString,
        XBoolean = xpath.XBoolean,
        XNumber = xpath.XNumber,
        currencyLocales = {
            "1025": {
                "symbol": "ر.س.‏",
                "position": "after"
            },
            "1052": {
                "symbol": "Lek",
                "position": "before"
            },
            "1078": {
                "symbol": "R",
                "position": "before"
            },
            "1118": {
                "symbol": "ETB",
                "position": "before"
            },
            "1156": {
                "symbol": "€",
                "position": "before"
            },
            "2049": {
                "symbol": "د.ع.‏‏",
                "position": "after"
            },
            "3073": {
                "symbol": "ج.م.‏‏",
                "position": "after"
            },
            "4097": {
                "symbol": "د.ل.‏‏",
                "position": "after"
            },
            "5121": {
                "symbol": "د.ج.‏",
                "position": "after"
            },
            "6145": {
                "symbol": "د.م.‏‏",
                "position": "after"
            },
            "7169": {
                "symbol": "د.ت.‏",
                "position": "after"
            },
            "8193": {
                "symbol": "ر.ع.‏",
                "position": "after"
            },
            "9217": {
                "symbol": "ر.ي.‏",
                "position": "after"
            },
            "10241": {
                "symbol": "ل.س.‏",
                "position": "after"
            },
            "11265": {
                "symbol": "د.ا.‏‏",
                "position": "after"
            },
            "12289": {
                "symbol": "ل.ل.‏",
                "position": "after"
            },
            "13313": {
                "symbol": "د.ك.‏‏",
                "position": "after"
            },
            "14337": {
                "symbol": "د.إ.‏",
                "position": "after"
            },
            "15361": {
                "symbol": "د.ب.‏",
                "position": "after"
            },
            "16385": {
                "symbol": "ر.ق.‏",
                "position": "after"
            },
            "1067": {
                "symbol": "դր.",
                "position": "before"
            },
            "1068": {
                "symbol": "man.",
                "position": "before"
            },
            "1069": {
                "symbol": "€‏",
                "position": "before"
            },
            "1093": {
                "symbol": "টা",
                "position": "before"
            },
            "1101": {
                "symbol": "ট",
                "position": "before"
            },
            "1133": {
                "symbol": "һ.",
                "position": "before"
            },
            "2092": {
                "symbol": "ман.",
                "position": "before"
            },
            "2117": {
                "symbol": "৳",
                "position": "before"
            },
            "5146": {
                "symbol": "KM",
                "position": "before"
            },
            "8218": {
                "symbol": "КМ",
                "position": "before"
            },
            "1026": {
                "symbol": "лв.",
                "position": "before"
            },
            "1027": {
                "symbol": "€",
                "position": "before"
            },
            "1028": {
                "symbol": "NT$",
                "position": "before"
            },
            "1029": {
                "symbol": "Kč",
                "position": "before"
            },
            "1030": {
                "symbol": "kr.",
                "position": "before"
            },
            "1031": {
                "symbol": "€",
                "position": "before"
            },
            "1032": {
                "symbol": "€",
                "position": "before"
            },
            "1033": {
                "symbol": "$",
                "position": "before"
            },
            "1035": {
                "symbol": "€",
                "position": "before"
            },
            "1036": {
                "symbol": "€",
                "position": "before"
            },
            "1037": {
                "symbol": "₪",
                "position": "before"
            },
            "1038": {
                "symbol": "Ft",
                "position": "before"
            },
            "1039": {
                "symbol": "kr.",
                "position": "before"
            },
            "1043": {
                "symbol": "€",
                "position": "before"
            },
            "1050": {
                "symbol": "kn",
                "position": "before"
            },
            "1057": {
                "symbol": "Rp",
                "position": "before"
            },
            "1059": {
                "symbol": "р.",
                "position": "before"
            },
            "1061": {
                "symbol": "kr",
                "position": "before"
            },
            "1079": {
                "symbol": "Lari",
                "position": "before"
            },
            "1080": {
                "symbol": "kr.",
                "position": "before"
            },
            "1081": {
                "symbol": "रु",
                "position": "before"
            },
            "1095": {
                "symbol": "રૂ",
                "position": "before"
            },
            "1110": {
                "symbol": "€",
                "position": "before"
            },
            "1122": {
                "symbol": "€",
                "position": "before"
            },
            "1124": {
                "symbol": "PhP",
                "position": "before"
            },
            "1125": {
                "symbol": "ރ.",
                "position": "after"
            },
            "1128": {
                "symbol": "N",
                "position": "before"
            },
            "1135": {
                "symbol": "kr.",
                "position": "before"
            },
            "1136": {
                "symbol": "N",
                "position": "before"
            },
            "1150": {
                "symbol": "€",
                "position": "before"
            },
            "1155": {
                "symbol": "€",
                "position": "before"
            },
            "1164": {
                "symbol": "؋",
                "position": "after"
            },
            "2052": {
                "symbol": "¥",
                "position": "before"
            },
            "2055": {
                "symbol": "Fr.",
                "position": "before"
            },
            "2057": {
                "symbol": "£",
                "position": "before"
            },
            "2060": {
                "symbol": "€",
                "position": "before"
            },
            "2067": {
                "symbol": "€",
                "position": "before"
            },
            "3076": {
                "symbol": "HK$",
                "position": "before"
            },
            "3079": {
                "symbol": "€",
                "position": "before"
            },
            "3081": {
                "symbol": "$",
                "position": "before"
            },
            "3084": {
                "symbol": "$",
                "position": "before"
            },
            "4100": {
                "symbol": "$",
                "position": "before"
            },
            "4103": {
                "symbol": "€",
                "position": "before"
            },
            "4105": {
                "symbol": "$",
                "position": "before"
            },
            "4108": {
                "symbol": "fr.",
                "position": "before"
            },
            "4122": {
                "symbol": "KM",
                "position": "before"
            },
            "5124": {
                "symbol": "MOP",
                "position": "before"
            },
            "5127": {
                "symbol": "CHF",
                "position": "before"
            },
            "5129": {
                "symbol": "$",
                "position": "before"
            },
            "5132": {
                "symbol": "€",
                "position": "before"
            },
            "6153": {
                "symbol": "€",
                "position": "before"
            },
            "6156": {
                "symbol": "€",
                "position": "before"
            },
            "7177": {
                "symbol": "R",
                "position": "before"
            },
            "8201": {
                "symbol": "J$",
                "position": "before"
            },
            "9225": {
                "symbol": "$",
                "position": "before"
            },
            "10249": {
                "symbol": "BZ$",
                "position": "before"
            },
            "11273": {
                "symbol": "TT$",
                "position": "before"
            },
            "12297": {
                "symbol": "Z$",
                "position": "before"
            },
            "13321": {
                "symbol": "Php",
                "position": "before"
            },
            "16393": {
                "symbol": "Rs.",
                "position": "before"
            },
            "17417": {
                "symbol": "RM",
                "position": "before"
            },
            "18441": {
                "symbol": "$",
                "position": "before"
            },
            "1034": {
                "symbol": "€",
                "position": "before"
            },
            "1040": {
                "symbol": "€",
                "position": "before"
            },
            "1041": {
                "symbol": "¥",
                "position": "before"
            },
            "1042": {
                "symbol": "₩",
                "position": "before"
            },
            "1044": {
                "symbol": "kr",
                "position": "before"
            },
            "1045": {
                "symbol": "zł",
                "position": "before"
            },
            "1046": {
                "symbol": "R$",
                "position": "before"
            },
            "1047": {
                "symbol": "fr.",
                "position": "before"
            },
            "1048": {
                "symbol": "lei",
                "position": "before"
            },
            "1049": {
                "symbol": "р.",
                "position": "before"
            },
            "1051": {
                "symbol": "€",
                "position": "before"
            },
            "1053": {
                "symbol": "kr",
                "position": "before"
            },
            "1054": {
                "symbol": "฿",
                "position": "before"
            },
            "1055": {
                "symbol": "TL",
                "position": "before"
            },
            "1056": {
                "symbol": "Rs",
                "position": "before"
            },
            "1058": {
                "symbol": "₴",
                "position": "before"
            },
            "1060": {
                "symbol": "€",
                "position": "before"
            },
            "1062": {
                "symbol": "Ls",
                "position": "before"
            },
            "1063": {
                "symbol": "Lt",
                "position": "before"
            },
            "1064": {
                "symbol": "т.р.",
                "position": "before"
            },
            "1065": {
                "symbol": "ريال",
                "position": "after"
            },
            "1066": {
                "symbol": "₫",
                "position": "before"
            },
            "1070": {
                "symbol": "€",
                "position": "before"
            },
            "1071": {
                "symbol": "ден.",
                "position": "before"
            },
            "1074": {
                "symbol": "R",
                "position": "before"
            },
            "1076": {
                "symbol": "R",
                "position": "before"
            },
            "1077": {
                "symbol": "R",
                "position": "before"
            },
            "1082": {
                "symbol": "€",
                "position": "before"
            },
            "1083": {
                "symbol": "kr",
                "position": "before"
            },
            "1086": {
                "symbol": "RM",
                "position": "before"
            },
            "1087": {
                "symbol": "Т",
                "position": "before"
            },
            "1088": {
                "symbol": "сом",
                "position": "before"
            },
            "1089": {
                "symbol": "S",
                "position": "before"
            },
            "1090": {
                "symbol": "m.",
                "position": "before"
            },
            "1091": {
                "symbol": "so'm",
                "position": "before"
            },
            "1092": {
                "symbol": "р.",
                "position": "before"
            },
            "1094": {
                "symbol": "ਰੁ",
                "position": "before"
            },
            "1096": {
                "symbol": "ଟ",
                "position": "before"
            },
            "1097": {
                "symbol": "ரூ",
                "position": "before"
            },
            "1098": {
                "symbol": "రూ",
                "position": "before"
            },
            "1099": {
                "symbol": "ರೂ",
                "position": "before"
            },
            "1100": {
                "symbol": "ക",
                "position": "before"
            },
            "1102": {
                "symbol": "रु",
                "position": "before"
            },
            "1103": {
                "symbol": "रु",
                "position": "before"
            },
            "1104": {
                "symbol": "₮",
                "position": "before"
            },
            "1105": {
                "symbol": "¥",
                "position": "before"
            },
            "1106": {
                "symbol": "£",
                "position": "before"
            },
            "1107": {
                "symbol": "៛",
                "position": "before"
            },
            "1108": {
                "symbol": "₭",
                "position": "before"
            },
            "1111": {
                "symbol": "रु",
                "position": "before"
            },
            "1114": {
                "symbol": "ل.س.‏",
                "position": "after"
            },
            "1115": {
                "symbol": "රු.",
                "position": "before"
            },
            "1117": {
                "symbol": "$",
                "position": "before"
            },
            "1121": {
                "symbol": "रु",
                "position": "before"
            },
            "1123": {
                "symbol": "؋",
                "position": "after"
            },
            "1130": {
                "symbol": "N",
                "position": "before"
            },
            "1131": {
                "symbol": "$",
                "position": "before"
            },
            "1132": {
                "symbol": "R",
                "position": "before"
            },
            "1134": {
                "symbol": "€",
                "position": "before"
            },
            "1144": {
                "symbol": "¥",
                "position": "before"
            },
            "1146": {
                "symbol": "$",
                "position": "before"
            },
            "1148": {
                "symbol": "$",
                "position": "before"
            },
            "1152": {
                "symbol": "¥",
                "position": "before"
            },
            "1153": {
                "symbol": "$",
                "position": "before"
            },
            "1154": {
                "symbol": "€",
                "position": "before"
            },
            "1157": {
                "symbol": "с.",
                "position": "before"
            },
            "1158": {
                "symbol": "Q",
                "position": "before"
            },
            "1159": {
                "symbol": "RWF",
                "position": "before"
            },
            "1160": {
                "symbol": "XOF",
                "position": "before"
            },
            "1169": {
                "symbol": "£",
                "position": "before"
            },
            "2058": {
                "symbol": "$",
                "position": "before"
            },
            "2064": {
                "symbol": "fr.",
                "position": "before"
            },
            "2068": {
                "symbol": "kr",
                "position": "before"
            },
            "2070": {
                "symbol": "€",
                "position": "before"
            },
            "2074": {
                "symbol": "Din.",
                "position": "before"
            },
            "2077": {
                "symbol": "€",
                "position": "before"
            },
            "2094": {
                "symbol": "€",
                "position": "before"
            },
            "2107": {
                "symbol": "kr",
                "position": "before"
            },
            "2108": {
                "symbol": "€",
                "position": "before"
            },
            "2110": {
                "symbol": "$",
                "position": "before"
            },
            "2115": {
                "symbol": "сўм",
                "position": "before"
            },
            "2128": {
                "symbol": "¥",
                "position": "before"
            },
            "2141": {
                "symbol": "$",
                "position": "before"
            },
            "2143": {
                "symbol": "DZD",
                "position": "before"
            },
            "2155": {
                "symbol": "$",
                "position": "before"
            },
            "3082": {
                "symbol": "€",
                "position": "before"
            },
            "3098": {
                "symbol": "Дин.",
                "position": "before"
            },
            "3131": {
                "symbol": "€",
                "position": "before"
            },
            "3179": {
                "symbol": "S/.",
                "position": "before"
            },
            "4106": {
                "symbol": "Q",
                "position": "before"
            },
            "4155": {
                "symbol": "kr",
                "position": "before"
            },
            "5130": {
                "symbol": "₡",
                "position": "before"
            },
            "5179": {
                "symbol": "kr",
                "position": "before"
            },
            "6154": {
                "symbol": "B/.",
                "position": "before"
            },
            "6170": {
                "symbol": "KM",
                "position": "before"
            },
            "6203": {
                "symbol": "kr",
                "position": "before"
            },
            "7178": {
                "symbol": "RD$",
                "position": "before"
            },
            "7194": {
                "symbol": "КМ",
                "position": "before"
            },
            "7227": {
                "symbol": "kr",
                "position": "before"
            },
            "8202": {
                "symbol": "Bs. F.",
                "position": "before"
            },
            "8251": {
                "symbol": "€",
                "position": "before"
            },
            "9226": {
                "symbol": "$",
                "position": "before"
            },
            "9242": {
                "symbol": "Din.",
                "position": "before"
            },
            "9275": {
                "symbol": "€",
                "position": "before"
            },
            "10250": {
                "symbol": "S/.",
                "position": "before"
            },
            "10266": {
                "symbol": "Дин.",
                "position": "before"
            },
            "11274": {
                "symbol": "$",
                "position": "before"
            },
            "11290": {
                "symbol": "€",
                "position": "before"
            },
            "12298": {
                "symbol": "$",
                "position": "before"
            },
            "12314": {
                "symbol": "€",
                "position": "before"
            },
            "13322": {
                "symbol": "$",
                "position": "before"
            },
            "14346": {
                "symbol": "$U",
                "position": "before"
            },
            "15370": {
                "symbol": "Gs",
                "position": "before"
            },
            "16394": {
                "symbol": "$b",
                "position": "before"
            },
            "17418": {
                "symbol": "$",
                "position": "before"
            },
            "18442": {
                "symbol": "L.",
                "position": "before"
            },
            "19466": {
                "symbol": "C$",
                "position": "before"
            },
            "20490": {
                "symbol": "$",
                "position": "before"
            },
            "21514": {
                "symbol": "$",
                "position": "before"
            }
        };

    function inherit(targetType, superType) {
        targetType.prototype = new superType();
        targetType.prototype.constructor = superType;
        targetType.superClass = superType;
    }

    // ===================
    // FVNamespaceResolver
    // ===================

    function FVNamespaceResolver() {
        var namespaces = {};

        this.addNamespace = function (prefix, uri) {
            namespaces[prefix] = uri;
        };

        this.lookupNamespaceURI = function (prefix, context) {
            var found = namespaces[prefix];

            found = found || (context && this.superclass.getNamespace(prefix, context));

            return found || null;
        };

        this.getNamespace = this.lookupNamespaceURI;
    }

    FVNamespaceResolver.prototype = new NamespaceResolver();
    FVNamespaceResolver.prototype.constructor = FVNamespaceResolver;
    FVNamespaceResolver.prototype.superclass = NamespaceResolver.prototype;


    function XPathFunctionBase() {

    }

    inherit(XPathFunctionBase, FunctionResolver);

    // XPathContext, XPathExpression -> XPathResult
    XPathFunctionBase.prototype.getParam = function (context, expr) {
        return expr.evaluate(context);
    };

    // XPathContext, Array[XPathContext, XPathExpression] -> Array[XPathResult]
    XPathFunctionBase.prototype.getParams = function (context, args) {
        // The first element of args is the context value so we need to skip that element
        var exceptFirst = Array.prototype.slice.call(args, 1);

        return exceptFirst.map(function (arg) { return this.getParam(context, arg); }.bind(this));
    };

    // String, String -> (thrown Error)
    XPathFunctionBase.prototype.argError = function (fn, expected) {
        throw new Error("Function " + fn + " expects (" + (expected || "no arguments") + ")");
    };

    XPathFunctionBase.prototype.makeSingleValueNodeSet = function (baseNode, val) {
        var textNode = FVUtil.makeTextNode(baseNode, val),
            nodeSet = new XNodeSet();

        nodeSet.add(textNode);

        return nodeSet;
    };


    // ===========
    // FVFunctions
    // ===========

    function FVFunctions(dataSources, userInfo) {
        var namespaceXdDate = "http://schemas.microsoft.com/office/infopath/2003/xslt/Date",
            namespaceXdMath = "http://schemas.microsoft.com/office/infopath/2003/xslt/Math",
            namespaceXdXDocument = "http://schemas.microsoft.com/office/infopath/2003/xslt/xDocument",
            namespaceXdUser = "http://schemas.microsoft.com/office/infopath/2006/xslt/User",
            namespaceXdFormatting = "http://schemas.microsoft.com/office/infopath/2003/xslt/formatting",
            namespaceXdUtil = "http://schemas.microsoft.com/office/infopath/2003/xslt/Util",
            namespaceMsxsl = "urn:schemas-microsoft-com:xslt",
            namespaceFv = "http://www.qdabra.com/FormsViewer/xslt",
            namespaceIpApp = 'http://schemas.microsoft.com/office/infopath/2006/XPathExtension/ipApp';

        var self = this,
            sizeSuffixes = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

        function makeElementNode(node, name, val) {
            var owner = FVUtil.ownerDocument(node), newNode;

            newNode = owner.createElement(name);

            if (val) {
                newNode.textContent = val;
            }

            return newNode;
        }

        function nz(c, expr) {
            var ns = expr ? expr.evaluate(c) : null,
                val,
                retval,
                narray, i;

            // Nz requires a node-set as argument
            if (arguments.length !== 2 || !Utilities.instance_of(ns, XNodeSet)) {
                self.argError("Nz", "node-set");
            }

            narray = ns.toUnsortedArray().map(function (n) {
                return FVUtil.getNodeValue(n) === "" ? FVUtil.makeTextNode(n, "0") : n;
            });

            retval = new XNodeSet();
            retval.addArray(narray);
            return retval;
        }

        function xdEval(c) {
            var params = self.getParams(c, arguments),
                parser = new XPathParser(),
                parsed = parser.parse(params[1]),
                sourceNodes = params[0].toArray(),
                parent = makeElementNode(c.contextNode, "item"),
                retval = new XNodeSet(),
                resultNodes = sourceNodes.map(function (node) {
                    var execContext = new XPathContext(c.variableResolver, c.namespaceResolver, c.functionResolver);
                    execContext.expressionContextNode = node;

                    var val = parsed.evaluate(execContext).stringValue();
                    var newNode = makeElementNode(c.contextNode, "item", val);

                    parent.appendChild(newNode);
                    return newNode;
                });

            retval.addArray(resultNodes);
            return retval;
        }

        // Determined empirically: avg, max, min ignore blank values and return blank if
        // all are blank or no nodes

        function getNonBlankNumbers(nodeArray) {
            var strings = nodeArray.map(function (n) { return XNodeSet.prototype.stringForNode(n); });
            var nonBlank = strings.filter(function (s) { return s !== ""; });
            var numbers = nonBlank.map(function (s) { return new XNumber(s).numberValue(); });

            return numbers;
        }

        // [Context, Expression*] String (Number* -> Number) -> XNumber or String
        function mathAggr(args, name, oper) {
            var c = args[0], expr = args[1], ns;

            if (expr) {
                ns = expr.evaluate(c);
            }
            if (args.length !== 2 || !Utilities.instance_of(ns, XNodeSet)) {
                self.argError(name, "node-set");
            }

            ns = getNonBlankNumbers(ns.toUnsortedArray());
            if (ns.length) {
                var result = oper.apply(null, ns);
                return new XNumber(result);
            }

            return new XString("");
        }

        // [Number*] -> Number
        // Produce the average of all numbers in arguments
        function average() {
            var sum = foldRight(arguments, function (n1, n2) { return n1 + n2; }, 0);
            return sum / arguments.length;
        }

        // Context Expression* -> XNumber or XString
        function avg() { return mathAggr(arguments, "Avg", average); }
        function min() { return mathAggr(arguments, "Min", Math.min); }
        function max() { return mathAggr(arguments, "Max", Math.max); }

        function getNamedNodeProperty(c, expr, key, def) {
            var params = self.getParams(c, arguments), i, first, key, def, retVal;

            if (arguments.length != 4 || !Utilities.instance_of(params[0], XNodeSet)) {
                self.argError("GetNamedNodeProperty", "node-set, string, string");
            }

            first = params[0].first();
            key = params[1].toString();
            def = params[2].toString();

            retVal = getNodePropertyImpl(first, key, def);

            return new XString(retVal);
        }

        function getNodePropertyImpl(node, key, defaultValue) {
            var val, retVal;

            if (node) {
                val = FVUtil.getNodeData(node, key);
                retVal = (typeof val === "undefined") ? defaultValue : val.toString();
            } else {
                retVal = defaultValue;
            }

            return retVal;
        }

        function getDom(c) {
            var ns;

            if (arguments.length !== 1) {
                self.argError("get-DOM", "(none)");
            }

            ns = new XNodeSet();
            ns.add(dataSources.getDom().getNode());

            return ns;
        }

        function getSecondaryDom(c, pName) {
            var ns, sName, ds, dom, domAr;

            if (arguments.length !== 2) {
                self.argError("GetDOM", "string");
            }

            pName = self.getParam(c, pName);

            sName = pName.toString();
            ds = dataSources.getDom(sName);

            dom = ds && ds.getNode();
            domAr = dom ? [dom] : [];

            ns = new XNodeSet();
            ns.addArray(domAr);

            return ns;
        }

        function functionAvailable(c) {
            var params = self.getParams(c, arguments), fn, f;

            if (params.length !== 1) {
                self.argError("function-available", "string");
            }

            fn = params[0].stringValue();
            f = FunctionResolver.getFunctionFromContext(fn, c);

            return new XBoolean(f);
        }

        function current(c, params) {
            if (params.length !== 0) {
                self.argError('current', '');
            }

            var ns = new XNodeSet();

            ns.add(c.expressionContextNode);

            return ns;
        }

        function assembleId(ds, id) {
            if (!id) {
                return '';
            }
            if (!ds) {
                return id;
            }
            return ds + ":" + id;
        }

        function generateId(c) {
            var params = self.getParams(c, arguments);

            if (params.length > 1 ||
               (params.length === 1 && !Utilities.instance_of(params[0], XNodeSet))) {
                self.argError("generate-id", "[node-set]");
            }

            var node = params.length === 1 ? params[0].first() : c.contextNode;

            var ds = getNodePropertyImpl(node, "fvDs", "");
            var id = getNodePropertyImpl(node, "fvUid", "");

            return new XString(assembleId(ds, id));
        }

        function getUserName() {
            var userName = userInfo
                ? userInfo.get_loginName()
                : '';

            return new XString(userName);
        }


        // ======
        // XdDate
        // ======

        function today() {
            var dt = new Date();

            return new XString(FVUtil.getXmlDate(dt));
        }

        function now() {
            var dt = new Date();

            return new XString(FVUtil.getXmlDate(dt) + "T" + FVUtil.getXmlTime(dt));
        }

        function addTime(date, units, omitTimeIfZero, component) {
            var dateStr = date.stringValue();
            var unitsStr = units.stringValue();

            if (dateStr === '' || unitsStr === '') {
                return new XString('');
            }

            var dateSpec = FVUtil.parseIsoDate(dateStr);
            var unitsNum = Number(unitsStr);

            if (!dateSpec || Number.isNaN(unitsNum) || Math.floor(unitsNum) !== unitsNum) {
                return new XString("ERR?");
            }

            dateSpec.date['set' + component](dateSpec.date['get' + component]() + unitsNum);
            dateSpec.omitTimeIfZero = omitTimeIfZero;
            dateSpec.omitMilliseconds = true;

            return FVUtil.makeIsoDate(dateSpec);
        }

        function addDays(c, params) {
            var date = params[0],
                days = params[1];

            if (params.length !== 2) {
                self.argError("AddDays", "string, number");
            }

            var newDate = addTime(date, days, true, 'Date');

            return new XString(newDate);
        }

        function addSeconds(c, params) {
            var date = params[0],
                seconds = params[1];

            if (params.length !== 2) {
                self.argError('AddSeconds', 'string, number');
            }

            var newDate = addTime(date, seconds, false, 'Seconds');

            return new XString(newDate);
        }

        // ==========
        // END XdDate
        // ==========

        // ============
        // XdFormatting
        // ============

        function formatDate(value, options) {
            // 2017-02-21 - Skipping current functionality because it causes date to be displayed a day off
            //              in certain timezones (case 42803)
            return value;

            if (!options || options['dateFormat'] !== 'Short Date') {
                return value;
            }

            var parseDate = Date.parse(value);

            if (Number.isNaN(parseDate)) {
                return value;
            }

            var util = qd.util,
                date = new Date(parseDate);

            return String.format('{0}-{1}-{2}',
                date.getFullYear(),
                util.getTwoDigitFormat(date.getMonth() + 1),
                util.getTwoDigitFormat(date.getDate()));

            //var date = FVUtil.parseXmlDateTime(value);
        }

        function needsRounding(numDigits) {
            return typeof numDigits !== "undefined" && numDigits !== 'auto';
        }

        function formatDigits(num, numDigits) {
            return needsRounding(numDigits)
                ? num.toFixed(numDigits)
                : num.toString();
        }

        function appendZero(number, appendCount) {
            return number + Array(appendCount + 1).join("0");
        }

        function appendFractionalValue(fractionalValue, numDigits) {
            if (!needsRounding(numDigits)) {
                return '.' + fractionalValue;
            }

            var intNumDigits = parseInt(numDigits);

            var digitLength = fractionalValue.length < intNumDigits ? fractionalValue.length : intNumDigits,
                remainingDigit = intNumDigits - fractionalValue.length,
                formattedValue = "." + fractionalValue.substr(0, digitLength);

            if (remainingDigit === 0) {
                return formattedValue;
            }

            return appendZero(formattedValue, remainingDigit);
        }

        function formatGrouping(numberString, numDigits, grouping) {
            //If grouping is not specified, options has grouping = 0
            if (!grouping) {
                var splitNumberString = numberString.split('.'),
                    decFormattedNumber = Number(splitNumberString[0]);

                if (Number.isNaN(decFormattedNumber)) {
                    return numberString;
                }

                var formattedNumber = decFormattedNumber.toLocaleString('en-us'),
                    splitFormattedNumber = formattedNumber.split('.'),
                    integerValue = splitFormattedNumber[0];//Split and use integer value, as IE appends decimal to formattedNumber

                if (splitNumberString.length > 1) {
                    integerValue += appendFractionalValue(splitNumberString[1], numDigits);
                }

                return integerValue;
            }

            return numberString;
        }

        function formatNumber(value, type, options) {
            var num = parseFloat(value);

            if (Number.isNaN(num) || Number.isNaN(Number(value))) {
                return value;
            }

            var decFormatted = formatGrouping(formatDigits(num, options.numDigits), options.numDigits, options.grouping);

            // TODO: handle other options

            return decFormatted;
        }

        function formatCurrency(value, options) {
            var num = parseFloat(value);

            if (Number.isNaN(num) || Number.isNaN(Number(value))) {
                return value;
            }

            var currencyLocale = currencyLocales[options['currencyLocale']];
            if (!currencyLocale) {
                return num.toString();
            }

            var formattedValue = formatGrouping(formatDigits(num, options.numDigits), options.numDigits, options.grouping);

            return currencyLocale.position === 'before'
                ? currencyLocale.symbol + formattedValue
                : formattedValue + currencyLocale.symbol;
        }

        function formatPercentage(value, options) {
            var num = parseFloat(value);

            if (Number.isNaN(num)) {
                return value;
            }

            var factorValue = value * 100;

            return formatDigits(factorValue, options.numDigits);
        }

        function formatStringInner(value, type, options) {
            switch (type) {
                case "date":
                    return formatDate(value, options);
                case "number":
                    return formatNumber(value, type, options);
                case "currency":
                    return formatCurrency(value, options);
                case "percentage":
                    return formatPercentage(value, options);
            }

            return value;

        }

        function splitOptions(options) {
            var parts = options.split(";").filter(function (p) {
                return p;
            }),
                partsSubdiv = parts.map(function (p) {
                    return p.split(":", 2);
                }),
                result = {};

            partsSubdiv.forEach(function (el) {
                result[el[0]] = el[1] || null;
            });

            return result;
        }

        function formatString(c) {
            var params = self.getParams(c, arguments), value, type, options;

            if (params.length !== 3) {
                self.argError("formatString", "string, string, string");
            }

            value = params[0].stringValue();
            type = params[1].stringValue();
            options = splitOptions(params[2].stringValue());

            return new XString(formatStringInner(value, type, options));
        }

        // ================
        // END XdFormatting
        // ================

        // ==============
        // Msxsl
        // ==============

        function stringCompare(c) {
            var params = self.getParams(c, arguments),
                         x, y, language, options,
                         res;

            if (params.length < 2 || params.length > 4) {
                self.argError("string-compare", "string, string [, string [, string]]");
            }

            x = params[0];
            y = params[1];
            language = params[2];
            options = params[3] || "";

            if (options === "i") {
                x = x.toLowerCase();
                y = y.toLowerCase();
            }
            // TODO: Improve this behavior, add support for u

            if (x < y) {
                res = -1;
            }
            else if (x > y) {
                res = 1;
            }
            else {
                res = 0;
            }

            return new XNumber(res);
        }

        function fileProp(params, functionName, propertyName) {
            var attachment = params[0],
                props;

            if (params.length !== 1) {
                self.argError("file-name", "nodeset");
            }

            props = FVUtil.getFileProperties(params[0].first());

            return new XString(props[propertyName]);
        }

        function fileName(c, params) {
            return fileProp(params, "file-name", "name");
        }

        function fileSize(c, params) {
            return fileProp(params, "file-size", "size");
        }

        function formatFileSize(c, params) {
            var size,
                magnitude,
                adjusted,
                formatted;

            if (params.length !== 1) {
                self.argError("format-file-size", "number");
            }

            size = params[0].numberValue();

            if (size !== size || size < 0) {
                formatted = "N/A";
            } else if (size < 1024) {
                formatted = size + " bytes";
            } else {
                magnitude = ~~(Math.log(size) / Math.log(1024));
                adjusted = size / (1 << (magnitude * 10));
                formatted = adjusted.toFixed(1) + " " + sizeSuffixes[magnitude];
            }

            return new XString(formatted);
        }

        function truncateFileNameInner(fileName, maxLength) {
            var nameSegments,
                extension;

            if (fileName.length <= maxLength) {
                return fileName;
            }

            nameSegments = fileName.split('.');
            extension = nameSegments.length > 1 ? nameSegments[nameSegments.length - 1] : "";

            // Edge case TODO: extension is unusually long
            return fileName.substring(0, maxLength - extension.length - 3) + "..." + extension;
        }

        function truncateFileName(c, params) {
            var fileNameParam = params[0],
                maxLengthParam = params[1];

            if (params.length !== 2 || Number.isNaN(maxLengthParam.numberValue())) {
                self.argError("truncate-file-name", "string, number");
            }

            return new XString(truncateFileNameInner(fileNameParam.stringValue(), maxLengthParam.numberValue()))
        }

        function match(c, params) {
            var value = params[0],
                pattern = params[1],
                patternStr,
                regEx;

            if (params.length !== 2) {
                self.argError("Match", "string, string");
            }

            patternStr = pattern.stringValue();

            try {
                regEx = new RegExp(patternStr);
            } catch (e) {
                console.log("Warning: invalid RegEx: ", patternStr);
                return new XBoolean(false);
            }

            return new XBoolean(regEx.test(value.stringValue()));
        }

        function datePart(c, params) {
            var value = params[0].stringValue(),
                date = new Date(value);

            if (!Number.isNaN(date.getDate())) {
                //date = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
                return new XString(date.toISOString().substring(0, 10));
            }

            return new XString(value);
        }

        function uniqueValues(c, params) {
            var nodes = params[0].toUnsortedArray(),
                path = params[1].stringValue();

            var parser = new XPathParser(),
                expr = parser.parse(path);

            var items = {};

            nodes.forEach(function (node) {
                var execContext = new XPathContext(c.variableResolver, c.namespaceResolver, c.functionResolver);
                execContext.expressionContextNode = node;

                var val = expr.evaluate(execContext).stringValue();
                items[val] = node;
            });

            var nodeSet = new XNodeSet();
            nodeSet.addArray(Object.keys(items).map(function (k) {
                return items[k];
            }));
            return nodeSet;
        }

        function documentFunc(c, params) {
            if (params.length !== 1) {
                self.argError('document', 'string');
            }

            // TODO?: support returning multiple documents?
            var dsname = params[0].stringValue();

            var ds = dataSources.getDom(dsname);

            var domAr = ds ? [ds.getNode()] : [];

            var ns = new XNodeSet();
            ns.addArray(domAr);;

            // TODO?: search files if DOM not present?
            return ns;
        }

        function xmlString(c, params) {
            var nodes = params[0].toArray();

            var value = nodes.map(qd.xmlUtility.xmlToString).join('');

            return new XString(value);
        }

        // Case 40939
        function getMajorVersion() {
            // IP 2013 is version 15.x.x.x
            return new XNumber(15);
        }

        function xsltFunc(f) {
            return function (c) {
                return f(c, self.getParams(c, arguments));
            };
        }

        function addFunc(namespace, name, func) {
            self.addFunction(namespace, name, xsltFunc(func));
        }

        this.addFunction(namespaceXdMath, "Nz", nz);
        this.addFunction(namespaceXdMath, "Avg", avg);
        this.addFunction(namespaceXdMath, "Max", max);
        this.addFunction(namespaceXdMath, "Min", min);
        this.addFunction(namespaceXdMath, "Eval", xdEval);

        this.addFunction(namespaceXdXDocument, "GetNamedNodeProperty", getNamedNodeProperty);
        this.addFunction(namespaceXdXDocument, "GetDOM", getSecondaryDom);
        this.addFunction(namespaceXdXDocument, "get-DOM", getDom);

        this.addFunction("", "function-available", functionAvailable);
        this.addFunction("", "generate-id", generateId);
        addFunc('', 'current', current);
        addFunc('', 'document', documentFunc);

        this.addFunction(namespaceXdUser, "get-UserName", getUserName);

        this.addFunction(namespaceXdDate, "Today", today);
        this.addFunction(namespaceXdDate, "Now", now);
        addFunc(namespaceXdDate, "AddDays", addDays);
        addFunc(namespaceXdDate, "AddSeconds", addSeconds);

        this.addFunction(namespaceXdFormatting, "formatString", formatString);

        this.addFunction(namespaceMsxsl, "string-compare", stringCompare);

        addFunc(namespaceXdUtil, "Match", match);

        addFunc(namespaceFv, "file-name", fileName);
        addFunc(namespaceFv, "file-size", fileSize);
        addFunc(namespaceFv, "format-file-size", formatFileSize);
        addFunc(namespaceFv, "truncate-file-name", truncateFileName);
        addFunc(namespaceFv, "date-part", datePart);
        addFunc(namespaceFv, "unique-values", uniqueValues);
        addFunc(namespaceFv, "xml-string", xmlString);

        addFunc(namespaceIpApp, 'GetMajorVersion', getMajorVersion);
    }

    inherit(FVFunctions, XPathFunctionBase);


    function MSFunctions() {
        var namespaceMsXsl = "urn:schemas-microsoft-com:xslt",
            self = this;

        function nodeSet(c, pArg) {
            var arg = self.getParam(c, pArg);

            if (Utilities.instance_of(arg, XNodeSet)) {
                return arg;
            }

            return this.makeSingleValueNodeSet(arg.stringValue());
        }

        this.addFunction(namespaceMsXsl, "node-set", nodeSet);
    }

    inherit(MSFunctions, XPathFunctionBase);

    function allFunctions(dataSources, user) {
        var ms = new MSFunctions(),
            fv = new FVFunctions(dataSources, user);

        return {
            getFunction: function (name, context) {
                return fv.getFunction(name, context) || ms.getFunction(name, context);
            }
        };
    }

    // =================
    // FVVariableContext
    // =================

    function FVVariableContext() {
        this.namespaces = {};

        this.getVariablesByNs = function (ns) {
            ns = ns || "";

            var variables = this.namespaces[ns];

            if (!variables) {
                variables = {};
                this.namespaces[ns] = variables;
            }

            return variables;
        };

        this.getVariableWithName = function (ns, ln, c) {
            var byNs = this.getVariablesByNs(ns), variable;

            variable = byNs[ln];

            if (typeof variable !== "undefined") {
                return variable;
            }

            // TODO: else error
        };

        this.getVariable = function (ln, ns) {
            return this.getVariableWithName(ns, ln);
        };

        this.setVariable = function (ns, ln, value) {
            var byNs = this.getVariablesByNs(ns);

            byNs[ln] = value;
        };

        // [Jimmy] Probably not very efficient to make a complete copy for every clone, but
        //         should be OK for now.
        this.clone = function () {
            var newContext, ns;

            newContext = new FVVariableContext();

            for (ns in this.namespaces) {
                newContext.namespaces[ns] = this.cloneVariableSet(this.namespaces[ns]);
            }

            return newContext;
        };

        this.cloneVariableSet = function (set) {
            var newSet = {};

            for (var key in set) {
                newSet[key] = set[key];
            }

            return newSet;
        };
    }

    FVVariableContext.prototype = new VariableResolver();
    FVVariableContext.prototype.constructor = FVVariableContext;
    FVVariableContext.superclass = VariableResolver;

    window.FVNamespaceResolver = FVNamespaceResolver;
    window.FVFunctions = FVFunctions;
    window.MSFunctions = MSFunctions;
    window.FVVariableContext = FVVariableContext;

    qd.formsViewer.xpathFunctions = {
        msFunctions: MSFunctions,
        fvFunctions: allFunctions,
        currencyLocales: currencyLocales
    };

})(window, qd);