'use strict';

var context;
var hostweburl;
var appweburl;

function loadScriptAsync(url) {
    return Q.when($.getScript(url));
}

function getQueryString() {
    return document.URL.split("?")[1] || "";
}

function getScriptBase(hostWebUrl) {
    return hostWebUrl + "/_layouts/15/"
}

function sharePointReadyAsync() {
    try {
        hostweburl = FVUtil.getParameterByName('SPHostUrl');
        appweburl = FVUtil.getParameterByName('SPAppWebUrl');

        var scriptbase = getScriptBase(hostweburl);

        return loadScriptAsync(scriptbase + 'SP.Runtime.js')
        .then(function () { return loadScriptAsync(scriptbase + 'SP.js'); })
        .then(function () { return loadScriptAsync(scriptbase + 'SP.RequestExecutor.js'); })
        .then(registerContextAndProxy);
    }
    catch (ex) {
        alert('sharePointReady error: ' + ex.message);
        throw ex;
    }
}

function registerContextAndProxy() {
    context = new SP.ClientContext(appweburl);
    var factory = new SP.ProxyWebRequestExecutorFactory(appweburl);
    context.set_webRequestExecutorFactory(factory);
}

function preparePageAsync() {
    //Get the URI decoded URL.
    hostweburl = FVUtil.getParameterByName("SPHostUrl");

    // The SharePoint js files URL are in the form:
    // web_url/_layouts/15/resource
    var scriptbase = getScriptBase(hostweburl);

    // Load the js file and continue to the
    //   success handler
    return loadScriptAsync(scriptbase + "SP.UI.Controls.js")
    .then(renderChrome)
    .then(sharePointReadyAsync);
}

// Callback for the onCssLoaded event defined
//  in the options object of the chrome control
function chromeLoaded() {
    $("body").show();
}

//Function to prepare the options and render the control
function renderChrome() {
    var queryString = getQueryString();
    // The Help, Account and Contact pages receive the
    //   same query string parameters as the main page
    var options = {
        "appIconUrl": "/images/ScannerAppIcon.png",
        "appTitle": "Diagnostics",
        "appHelpPageUrl": "Help.html?" + queryString,
        // The onCssLoaded event allows you to
        //  specify a callback to execute when the
        //  chrome resources have been loaded.
        "onCssLoaded": "chromeLoaded()",
        "settingsLinks": [
            {
                "linkUrl": "/Home/Contact?" + queryString,
                "displayName": "Contact us"
            }
        ]
    };

    var nav = new SP.UI.Controls.Navigation(
              "chrome_ctrl_placeholder", options);
    nav.setVisible(true);
}

//Function to get required standard tokens
function standardTokens() {
    var tokenNames = [
        'SPHostUrl',
        'SPLanguage',
        'SPClientTag',
        'SPProductNumber',
        'SPAppWebUrl'
    ],
        withValues = tokenNames
            .map(function (key) {
                return { key: key, value: FVUtil.getParameterByName(key) };
            })
            .filter(function (kv) {
                return kv.value;
            });

    return withValues
        .map(function (kv) {
            return encodeURIComponent(kv.key) + '=' + encodeURIComponent(kv.value);
        })
        .join('&');
}