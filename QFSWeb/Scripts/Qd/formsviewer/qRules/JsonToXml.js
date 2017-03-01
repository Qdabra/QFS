var qd = qd || {},
    Qd = Qd || {};
qd.qRules = qd.qRules || {};

qd.qRules.JsonToXml = (function(qd, Qd) {
    "use strict";

    var xu = qd.xmlUtility;

    var requiredParameters = [
            {
                name: "xpath",
                description: "XPath of the location where the converted JSON should be inserted"
            },
            {
                name: "json",
                description: "JSON to convert into XML. Use /json-xpath (and optionally /json-dsname) to get the JSON from a field in the form."
            }
        ],
        optionalParameters = [
            {
                name: "dsname",
                description: "Name of the data source where the converted JSON should be inserted"
            }
        ];

    function deleteChildNodes(node) {
        node.childNodes().forEach(function(n) { n.deleteSelf(); });
    }

    function appendNodesAsync(dest, nodes) {
        return Qd.util.runPromiseSequence(nodes,
            function(last, node) {
                return dest.appendChildAsync(node);
            });
    }

    function JsonToXml(params) {
        
        function executeAsync() {
            var cf = params.commonFunction,
                xpath = cf.getParamValue("xpath"),
                json = cf.getParamValue("json"),
                dsname = cf.getParamValue("dsname"),
                ds = cf.getDataSource(dsname),
                destNode = cf.getValidNode(ds, xpath),
                destNodeRaw = destNode.getNode(),
                jsObj;

            try {
                jsObj = JSON.parse(json);
            } catch (e) {
                throw new Error("Invalid JSON: " + json);
            }

            if (!xu.isElement(destNodeRaw)) {
                throw new Error("Destination node must be an element.");
            }

            var xml = qd.qRules.jsonXmlConvert.toXml(jsObj),
                type = xml.getAttribute("type");

            deleteChildNodes(destNode);

            destNodeRaw.setAttribute("type", type);

            return appendNodesAsync(destNode, xu.getChildNodes(xml))
                .then(function() {
                    return {
                        Success: true
                    };
                });
        }

        return {
            requiredParameters: requiredParameters,
            optionalParameters: optionalParameters,
            executeAsync: executeAsync
        };
    }

    return JsonToXml;
})(qd, Qd);