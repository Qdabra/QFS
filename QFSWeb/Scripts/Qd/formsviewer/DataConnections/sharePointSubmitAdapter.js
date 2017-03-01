var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.DataConnections = Qd.FormsViewer.DataConnections || {};

(function (dc, qd) {
    "use strict";

    function sharePointSubmitAdapter(definition, template, xpathEngine, shpAccess, dataSources, api) {
        var url = dc.utils.combinePath(template.getBasePath(), definition.folder);

        function getBaseFileName() {
            if (definition.fileNameType === "expression") {
                return dataSources
                    .getMainDocumentElement()
                    .evaluateString(definition.fileName);
            } else {
                return definition.fileName;
            }
        }

        function getFileName() {
            var baseName = getBaseFileName();

            return /.xml$/.test(baseName)
                ? baseName
                : baseName + ".xml";
        }

        function isOverwrite() {
            return definition.overwrite;
        }

        function getXmlString(options) {
            var xmlNode = options && options.xml || dataSources.getDom().getNode();

            return qd.xmlUtility.xmlToString(xmlNode);
        }

        function getOverwrite(options) {
            if (options && 'overwrite' in options) {
                return !!options.overwrite;
            }

            return isOverwrite();
        }

        function executeAsync(options) {
            var fileName = SharePointAccess.ensureSharePointFilename(getFileName()),
                xmlStr = getXmlString(options),
                overwrite = getOverwrite(options);

            var folderUrl = options && options.folderUrl || url;

            if (SharePointAccess.isAppOnlyMode) {
                var isBase64 = false;
                return api.submitToLibraryAsync(folderUrl, fileName, xmlStr, overwrite, isBase64);
            } else {
                return shpAccess.submitFormAsync(folderUrl, fileName, xmlStr);
            }
        }

        function setUrl(spSiteUrl) {
            url = spSiteUrl;
        }

        // interface
        return {
            executeAsync: executeAsync,
            setUrl: setUrl
        };
    }

    dc.sharePointSubmitAdapter = sharePointSubmitAdapter;

})(Qd.FormsViewer.DataConnections, qd);