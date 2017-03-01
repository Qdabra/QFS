var Qd = Qd || {};
Qd.FormsViewer = Qd.FormsViewer || {};
Qd.FormsViewer.DataConnections = Qd.FormsViewer.DataConnections || {};

(function (dc) {
    "use strict";

    function getTemplateFileAsync(template, url) {
        var urlStripped = url.replace("x-soln:///", "");

        return template.getTemplateFileAsync(urlStripped)
        .then(function (data) {
            return data && $.parseXML(data);
        });
    }

    function xmlFileAdapter(definition, api, shpAccess, template) {
        var url = definition.fileUrl;

        function setUrl(queryUrl) {
            url = queryUrl;
        }

        function queryRestAsync() {
            return api.queryRestAsync(url)
                .then(function (data) {
                    if (data.Success) {
                        return $.parseXML(data.ResultBody);
                    }

                    throw new Error(data.Message);
                });
        }

        function queryFromSharePointAsync(queryUrl) {
            return shpAccess.getDocumentAsync(queryUrl)
                .then(function (xml) {
                    return $.parseXML(xml);
                });
        }

        function performQueryAsync() {
            if (url.indexOf("x-soln:///") === 0 || url.indexOf("/") === -1) {
                return getTemplateFileAsync(template, url);
            }

            if (shpAccess.isInHostWebDomain(url)) {
                return queryFromSharePointAsync(url);
            }

            return queryRestAsync();
        }

        function executeAsync(dataSource) {
            return performQueryAsync()
            .then(function (dataXml) {
                if (dataXml) {
                    dataSource.setDom(dataXml);
                } else {
                    throw new Error("An error occurred querying a data source.");
                }
            });
        }

        function getUrl() {
            return url;
        }
        // interface
        return {
            executeAsync: executeAsync,
            setUrl: setUrl,
            getUrl: getUrl
        };
    }

    dc.xmlFileAdapter = xmlFileAdapter;
})(Qd.FormsViewer.DataConnections);
