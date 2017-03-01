// Place custom JavaScript below
var ctx;
var appCtxSite;
var web;
var user;
var ACTs;

var spHostUrl;

var hostweburl;
var appweburl;

function sharePointReady() {

    try {
        hostweburl =
             decodeURIComponent(
                 getQueryStringParameter('SPHostUrl')
         );
        appweburl =
            decodeURIComponent(
                getQueryStringParameter('SPAppWebUrl')
         );

        var xsnurl = getQueryStringParameter("xsnUrl");
        $('#xsnUrl').html(xsnurl);

        $("#scanTemplate").click(function (event) {
            scanSelectedTemplate();
            event.preventDefault();
        });
        scanSelectedTemplate();
    }
    catch (ex) {
        alert('sharePointReady error: ' + ex.message);
    }
}

function scanSelectedTemplate() {
    var scriptbase = hostweburl + '/_layouts/15/';
    scriptbase = appweburl + '/_layouts/15/';
    $.getScript(scriptbase + 'SP.Runtime.js',
        function () {
            $.getScript(scriptbase + 'SP.js',
                function () { $.getScript(scriptbase + 'SP.RequestExecutor.js', transformResults); }
            );
        }
    );
}
function getQueryStringParameter(param) {
    var params = document.URL.split("?")[1].split("&");
    var strParams = "";
    for (var i = 0; i < params.length; i = i + 1) {
        var singleParam = params[i].split("=");
        if (singleParam[0] == param) {
            return singleParam[1];
        }
    }
}

function transformResults() {

    try {
        var factory;

        ctx = new SP.ClientContext(appweburl);
        factory = new SP.ProxyWebRequestExecutorFactory(appweburl);
        ctx.set_webRequestExecutorFactory(factory);
        appCtxSite = new SP.AppContextSite(ctx, hostweburl);

        queryAndTransformResults();
    }
    catch (ex) {
        alert('transformResults: ' + ex.message + "; " + ex.description);
    }
}

function getDrilldownTransform() {
    // load the xslt file
    var xslXMLHTTPRequest = new XMLHttpRequest();
    xslXMLHTTPRequest.open("GET", "../content/drilldown.xsl", false);
    try { xslXMLHTTPRequest.responseType = "msxml-document"; } catch (e) { };
    xslXMLHTTPRequest.send(null);

    xslStr = xslXMLHTTPRequest.responseXML;
    return xslStr;
}

function queryAndTransformResults() {
    var xsnurl = getQueryStringParameter("xsnUrl");
    GetDocumentAndTransform(xsnurl);
}

// =========
// QFSAccess
// ========= 

function QFSAccess(formUrl, accessType, successCallback, failureCallback) {
    var xsnQueryParam = (accessType === "library" ? "libraryUrl" : "xsnUrl");

    this.makeRequest = function (url) {
        $.getJSON(url + "&callback=?", successCallback).fail(failureCallback);
    };

    this.makeRequestXML = function (url) {
        $.get(url, successCallback).fail(failureCallback);
    };

    this.getTemplateQueryPart = function () {
        return xsnQueryParam + "=" + formUrl;
    };
}

QFSAccess.qfsProd = "/Forms/";
QFSAccess.qfsDev = "/Forms/";
QFSAccess.serviceUrl = QFSAccess.qfsDev;

QFSAccess.mapParameter = function (key, value) { return key + "=" + encodeURIComponent(value); };

QFSAccess.mapParameters = function (params) {
    if (params) {
        return "&" + qd.util.mapObject(params, QFSAccess.mapParameter).join("&");
    } else {
        return "";
    }
};

QFSAccess.prototype.makeServiceRequest = function (method, params) {
    var paramString = QFSAccess.mapParameters(params);

    var url = QFSAccess.serviceUrl + method + "?" + "SPHostUrl=" + hostweburl + "&" + this.getTemplateQueryPart() + paramString;
    this.makeRequestXML(url);
};

QFSAccess.prototype.getManifest = function () {
    this.makeServiceRequest("ManifestWithProperties");
};

QFSAccess.prototype.getFormInformation = function (url) {
    this.makeServiceRequest("FormInformation");
};

QFSAccess.prototype.getFormInformationXML = function (url) {
    this.makeServiceRequest("FormInformation", { format: "xml" });
};

QFSAccess.prototype.getTemplateFile = function (file) {
    this.makeServiceRequest("FormFileContents", { fileName: file });
};

QFSAccess.prototype.getImagePrefix = function () {
    return QFSAccess.serviceUrl + "TemplateFile?SPHostUrl=" + hostweburl + "&" + this.getTemplateQueryPart() + "&fileName=";
};

QFSAccess.prototype.requestView = function (view) {
    this.makeServiceRequest("PreprocessedView",
                                { viewFileName: view, paramNames: "ImagePrefix", paramValues: this.getImagePrefix() });
};

// =========
// QFSAccess END
// ========= 




function GetDocumentAndTransform(xsnurl) {
    var xhr = new XMLHttpRequest();

    document.getElementById("resultsPlaceholder").innerHTML = "Working.";
    qfsAccess = new QFSAccess(xsnurl, "xsnUrl", onSuccess, onFailure);
    qfsAccess.getFormInformation();

    return '';
}

function onSuccess(data)
{
    var xslt = getDrilldownTransform();
    xslTransform(data, xslt, "resultsPlaceholder", true);
}

function onFailure(e)
{
    alert('Error: ' + e.message);
}

function htmlEncode(value) {
    //create a in-memory div, set it's inner text(which jQuery automatically encodes)
    //then grab the encoded contents back out.  The div never exists on the page.
    return $('<div/>').text(value).html();
}

function htmlDecode(value) {
    return $('<div/>').html(value).text();
}

function createDocument(str) {
    var xmlDoc = new ActiveXObject("Msxml2.DOMDocument");
    return xmlDoc.loadXML(str);
}

// arguments can be string (uri of document) or document node
function xslTransform(content, transform, target, replace) {
    if ("string" == typeof content) content = createDocument(content);
    if ("string" == typeof transform) transform = createDocument(transform);

    var targetEle;

    //if (options && options.target) targetEle = document.getElementById(target);
    if (target) targetEle = document.getElementById(target);

    //if (targetEle && options.replace)
    if (targetEle && replace)
        while (targetEle.hasChildNodes())
            targetEle.removeChild(targetEle.firstChild);

    if (window.XSLTProcessor) {
        var processor = new XSLTProcessor();
        processor.importStylesheet(transform);
        var frag = processor.transformToFragment(content, document);
        if (targetEle)
            targetEle.appendChild(frag);
    }
    else if (window.ActiveXObject) {
        if (targetEle) {
            var html = content.transformNode(transform.documentElement);
            targetEle.innerHTML = html;
        }
    }
    else return "XSLT not supported";
}
