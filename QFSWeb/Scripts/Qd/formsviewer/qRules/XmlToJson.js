var qd = qd || {};
qd.qRules = qd.qRules || {};

qd.qRules.XmlToJson = (function (qd) {
    "use strict";

    var optionalParameters = [
        {
            name: "xpath",
            description: "XPath to the node to convert to JSON"
        }, {
            name: "dsname",
            description: "Name of the data source with the node to convert to JSON"
        }
    ];

    function XmlToJson(params) {
        function executeAsync() {
            var cf = params.commonFunction,
                xpath = cf.getParamValue("xpath"),
                dsname = cf.getParamValue("dsname"),
                ds = cf.getDataSource(dsname),
                node = xpath ? cf.getValidNode(ds, xpath) : ds,
                jsObj = qd.qRules.jsonXmlConvert.fromXml(node.getNode());

            return Q({
                Result: JSON.stringify(jsObj),
                Success: true
            });
        }

        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters
        };
    }


    return XmlToJson;
})(qd);
