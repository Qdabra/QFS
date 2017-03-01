(function ($, qRules) {
    "use strict";

    var constants = qRules.constants;

    var requiredParameters = [
        {
            name: constants.paramDestPath,
            description: 'Destination path'
        },
        {
            name: constants.paramValue,
            description: 'XML value to set'
        }
    ];

    var optionalParameters = [
        {
            name: constants.paramDestDs,
            description: 'Destination data source'
        },
        {
            name: "excludesourceroot",
            description: '(boolean) - When true, omits the root element of the source node from the inserted XML and only inserts its contents'
        }
    ];



    function SetXml(params) {
        var cf = params.commonFunctions;

        function copyNodes(xmlNodes) {
            return xmlNodes.map(function (n) { return n.cloneNode(true); });
        }

        function setXmlValueAsync(destNodes, xmlNodes) {
            return destNodes.reduce(function (last, next) {
                return last.then(function () {
                    return next.setContentAsync(copyNodes(xmlNodes));
                });
            }, Q());
        }

        function getXmlToUse(value, excludeRoot) {
            var xml = $.parseXML(value);
            var base = excludeRoot ? xml.documentElement : xml;

            return Array.prototype.slice.call(base.childNodes);
        }

        function executeAsync() {
            var destPath = cf.getParamValue(constants.paramDestPath);
            var value = cf.getParamValue(constants.paramValue);
            var destDs = cf.getParamValue(constants.paramDestDs);
            var excludeRoot = cf.getParamValue('excludesourceroot');

            var xmlNodes = getXmlToUse(value, excludeRoot);

            var destSource = cf.getDataSource(destDs);
            var destNodes = destSource.selectNodes(destPath);

            return setXmlValueAsync(destNodes, xmlNodes);
        }

        return {
            executeAsync: executeAsync,
            requiredParameters: requiredParameters,
            optionalParameters: optionalParameters
        }
    }

    qRules.SetXml = SetXml;

})(jQuery, Qd.FormsViewer.qRules);