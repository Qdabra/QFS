var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.qRules = Qd.FormsViewer.qRules || {};

Qd.FormsViewer.qRules.CopyRichText = (function (qd) {
    "use strict";

    var optionalParameters = [{
        name: "dsnamesrc",
        description: 'Data Source Name (Source)'
    },
    {
        name: "dsnamedest",
        description: 'Data Source Name (Destination)'
    }],
    requiredParameters = [{
        name: "xpathsrc",
        description: 'XPath to Node (Source)'
    },
    {
        name: "xpathdest",
        description: 'XPath to Node (Destination)'
    }],
    copyRichTextErrorFailedToSelectSourceNode = "Failed to select the source node to copy from.",
    copyRichTextErrorFailedToSelectDestinationNode = "Failed to select the destination node to copy to.";

    function CopyRichText(params) {

        function executeAsync() {
            var commonFunction = params.commonFunction,
                dsnamesrc = commonFunction.getParamValue("dsnamesrc"),
                xpathsrc = commonFunction.getParamValue("xpathsrc"),
                dsnamedest = commonFunction.getParamValue("dsnamedest"),
                xpathdest = commonFunction.getParamValue("xpathdest"),
                domSource = commonFunction.getDataSource(dsnamesrc),
                domDest = commonFunction.getDataSource(dsnamedest);

            var srcNode = commonFunction.getValidNode(domSource, xpathsrc, copyRichTextErrorFailedToSelectSourceNode),
                destNode = commonFunction.getValidNode(domDest, xpathdest, copyRichTextErrorFailedToSelectDestinationNode);

            var rtNodes = $(srcNode.getNode()).children();

            return destNode.setValueAsync(rtNodes, { isRichTextXml: true })
                .then(function () {
                    //CKEDITOR.instances['fvCTRL18'].setData(sourceValue);
                    //var resultObject = {
                    //    Success: true
                    //};

                    return { success: true };
                });
        }

        return {
            executeAsync: executeAsync,
            optionalParameters: optionalParameters,
            requiredParameters: requiredParameters
        };
    }

    return CopyRichText;
})(Qd);