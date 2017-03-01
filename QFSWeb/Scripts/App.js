'use strict';

(function (window) {
    "use strict";

    var hostweburl;

    function getQueryString() {
        return document.URL.split("?")[1] || "";
    }

    function loadScriptAsync(url) {
        return Q.when($.getScript(url));
    }

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

    function getScriptBase(hostWebUrl) {
        return hostWebUrl + "/_layouts/15/";
    }

    function sharePointReadyAsync() {
    }

    function showBody() {
        $("body").show();
    }

    function setUpMenuLink() {
        var $mainPageLink = $('.main-page-link');
        if (!!$mainPageLink.length) {
            $mainPageLink.attr('href', '/FormsViewer?' + standardTokens());
        }
    }

    function preparePageAsync(loadChrome) {
        setUpMenuLink();

        //Get the URI decoded URL.
        hostweburl = FVUtil.getParameterByName("SPHostUrl");

        // The SharePoint js files URL are in the form:
        // web_url/_layouts/15/resource
        var scriptbase = getScriptBase(hostweburl);

        // Load the js file and continue to the
        //   success handler
        return loadScriptAsync(scriptbase + "SP.UI.Controls.js")
        .then(function () {
            if (loadChrome) {
                return renderChrome();
            } else {
                showBody();
            }
        })
        .then(sharePointReadyAsync);
    }

    // Callback for the onCssLoaded event defined
    //  in the options object of the chrome control
    function chromeLoaded() {
        showBody();
    }

    //Function to prepare the options and render the control
    function renderChrome() {
        var queryString = getQueryString();
        // The Help, Account and Contact pages receive the
        //   same query string parameters as the main page
        var options = {
            "appIconUrl": "/images/appicon.png",
            "appTitle": "FormsViewer",
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

    //Return SPHostUrl value from query string
    function getHostWebUrl() {
        return hostweburl;
    }

    window.chromeLoaded = chromeLoaded;
    window.preparePageAsync = preparePageAsync;
    window.standardTokens = standardTokens;
    window.getQueryString = getQueryString;
    window.getHostWebUrl = getHostWebUrl;

    //// start script loading
    //qd.shpScriptLoader.loadScriptsAsync();
})(window);
