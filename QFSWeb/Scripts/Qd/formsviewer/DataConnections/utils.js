var Qd = Qd || {},
    fv = Qd.FormsViewer = Qd.FormsViewer || {},
    dc = fv.DataConnections = fv.DataConnections || {};

(function (qd, dc) {
    "use strict";

    var uriDfsNs = "http://schemas.microsoft.com/office/infopath/2003/dataFormSolution";


    function getDfsNode(dom, name) {
        return dom.documentElement.getElementsByTagNameNS(uriDfsNs, name)[0];
    }

    function getDfsChild(dom, dfsNodeName) {
        var node = dom && getDfsNode(dom, dfsNodeName);

        return node && node.firstElementChild;
    }

    // DataSource -> DomNode
    function getQueryXml(dom) {
        return getDfsChild(dom, "queryFields");
    }

    function getDataFieldsContent(dom) {
        return getDfsChild(dom, "dataFields");
    }

    function getDataFieldsNode(dom) {
        return getDfsNode(dom, "dataFields");
    }

    function getMainDom(dataSourceCollection) {
        return dataSourceCollection.getDataSource("");
    }

    function getXmlString(dataSourceNode) {
        return qd.util.xmlToString(dataSourceNode.getNode());
    }

    function endsWith(str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }

    function isAbsolutePath(path) {
        if (!path) {
            return true;
        }

        return /^[a-zA-Z]+:\/\//.test(path);
    }

    function combinePath(basePath, possiblyRelativePath) {
        if (!basePath || isAbsolutePath(possiblyRelativePath)) {
            return possiblyRelativePath;
        }

        if (!endsWith(basePath, "/")) {
            basePath += "/";
        }

        var splitRelativePath = possiblyRelativePath.split("/");
        
        splitRelativePath.forEach(function (segment, i) {
            if (segment === "..") {
                basePath = basePath.replace(/[^/]+\/?$/, "");
            } else if (segment !== "") {
                basePath += segment +
                    (i !== splitRelativePath.length - 1
                    ? "/"
                    : '');
            }
        });

        return basePath;
    }

    dc.utils = {
        getMainDom: getMainDom,
        dfsNs: uriDfsNs,
        getQueryXml: getQueryXml,
        getDataFieldsContent: getDataFieldsContent,
        getDataFieldsNode: getDataFieldsNode,
        getXmlString: getXmlString,
        combinePath: combinePath
    };

})(Qd, dc);
